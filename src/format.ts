/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import * as fs from 'fs';
import * as path from 'path';
import {promisify} from 'util';

import {Options} from './cli';
import {createProgram} from './lint';

// Exported for testing purposes.
export const clangFormat = require('clang-format');
const xml2js = require('xml2js');
const chalk = require('chalk');
const jsdiff = require('diff');
const entities = require('entities');
const utfString = require('utfstring');

const BASE_ARGS_FILE = ['-style=file'];
const BASE_ARGS_INLINE =
    ['-style', '{Language: JavaScript, BasedOnStyle: Google, ColumnLimit: 80}'];

/**
 * Run tslint fix and clang fix with the default configuration
 * @param options
 * @param fix whether to automatically fix the format
 * @param files files to format
 */
export async function format(
    options: Options, files: string[] = [], fix = false): Promise<boolean> {
  if (options.dryRun && fix) {
    options.logger.log('format: skipping auto fix since --dry-run was passed');
    fix = false;
  }

  // If the project has a .clang-format i– use it. Else use the default as an
  // inline argument.
  const baseClangFormatArgs =
      fs.existsSync(path.join(options.targetRootDir, '.clang-format')) ?
      BASE_ARGS_FILE :
      BASE_ARGS_INLINE;

  const program = createProgram(options);
  // Obtain a list of source files to format.
  // We use program.getRootFileNames to get only the files that match the
  // include patterns specified in the given tsconfig.json file (as specified
  // through options). This is necessary because we only want to format files
  // over which the developer has control (i.e. not auto-generated or
  // third-party source files).
  const srcFiles = files.length > 0 ?
      files :
      program.getRootFileNames().filter(f => !f.endsWith('.d.ts'));

  if (fix) {
    return fixFormat(srcFiles, baseClangFormatArgs);
  } else {
    const result = await checkFormat(srcFiles, baseClangFormatArgs, options);
    if (!result) {
      options.logger.log(
          'clang-format reported errors... run `gts fix` to address.');
    }
    return result;
  }
}

/**
 * Runs clang-format to automatically fix the format of supplied files.
 *
 * @param srcFiles list of source files
 */
function fixFormat(srcFiles: string[], baseArgs: string[]): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    const args = baseArgs.concat(['-i'], srcFiles);
    clangFormat.spawnClangFormat(args, (err?: Error) => {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    }, 'inherit');
  });
}

/**
 * Runs clang-format on the list of files and checks whether they are formatted
 * correctly. Returns true if all files are formatted correctly.
 *
 * @param srcFiles list of source files
 */
function checkFormat(srcFiles: string[], baseArgs: string[], options: Options):
    Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    let output = '';
    const arrOffset: number[] = [];
    const arrOffsetLength: number[] = [];
    const args = baseArgs.concat(['-output-replacements-xml'], srcFiles);
    const out = clangFormat
                    .spawnClangFormat(
                        args,
                        (err?: Error) => {
                          if (err) {
                            reject(err);
                          }
                        },
                        ['ignore', 'pipe', process.stderr])
                    .stdout;
    out.setEncoding('utf8');
    out.on('data', (data: Buffer) => {
      output += data;
    });

    out.on('end', () => {
      findFormatErrorLines(output, options).then(() => {
        resolve(output.indexOf('<replacement ') === -1 ? true : false);
      });
    });
  });
}

/**
 * Parses through xml string for the replacement offsets and lengths. Uses those
 * values to locate the formatting error lines.
 *
 * @param output xml string
 * @param options
 */
async function findFormatErrorLines(output: string, options: Options) {
  const files = output.split('<?xml version=\'1.0\'?>\n');

  for (let i = 1; i < files.length; i++) {
    const formatErr = {
      offset: output.match(/(?<=offset=\')(\d+)(?=\')/g),
      length: output.match(/(?<=length=\')(\d+)(?=\')/g),
      fix: output.match(/(?<=length=\'\d+\'>)(.*)(?=<\/replacement>)/g)
    };

    if (formatErr.length === null || formatErr.offset === null ||
        formatErr.fix === null) {
      return;
    }

    for (let j = 0; j < formatErr.fix.length; j++) {
      formatErr.fix[j] = entities.decodeXML(formatErr.fix[j]);
    }

    const read = promisify(fs.readFile);
    const argNum = 3;
    const file = process.argv[argNum + i - 1];
    const text = await read(file, 'utf8');

    const fixed =
        performFixes(text, formatErr.offset, formatErr.length, formatErr.fix);
    const diff = jsdiff.structuredPatch(
        'oldFile', 'newFile', text, fixed, 'old', 'new', {context: 3});
    jsdiff.applyPatch('diff', diff);
    printDiffs(file, diff.hunks, options);
  }
}

/**
 * Performs formatting fixes to the original string 🌷
 *
 * @param data original string
 * @param errOffset
 * @param errLength
 * @param replacements
 */
function performFixes(
    data: string, errOffset: string[], errLength: string[],
    replacements: string[]) {
  const replaced: string[] = [];
  replaced.push(substring(data, 0, +errOffset[0]));
  for (let i = 0; i < errOffset.length - 1; i++) {
    replaced.push(replacements[i]);
    replaced.push(
        substring(data, +errOffset[i] + +errLength[i], +errOffset[i + 1]));
  }
  replaced.push(replacements[errOffset.length - 1]);
  replaced.push(substring(
      data, +errOffset[errOffset.length - 1] + +errLength[errOffset.length - 1],
      Buffer.byteLength(data, 'utf8')));
  return replaced.join('');
}

/**
 * Prints the lines with formatting issues
 *
 * @param file
 * @param diffs contains all information about the formatting changes
 * @param options
 */
function printDiffs(file: string, diffs: any, options: Options) {
  options.logger.log(chalk.inverse.bold(file));
  diffs.forEach((diff: any) => {
    options.logger.log(chalk.bold(
        '  Lines: ' + diff.oldStart + '-' + (diff.oldStart + diff.oldLines)));

    diff.lines.forEach(function(line: any) {
      if (line[0] === '-') {
        options.logger.log('   ' + chalk.red(line));
      } else if (line[0] === '+') {
        options.logger.log('   ' + chalk.green(line));
      } else {
        options.logger.log('   ' + chalk.black(line));
      }
    });
    options.logger.log('\n');
  });
}

/**
 * Substring by bytes
 * 
 * @param str 
 * @param indexStart 
 * @param indexEnd 
 * @param encoding 
 */
function substring(
    str: string, indexStart: number, indexEnd: number, encoding = 'utf8') {
  return Buffer.from(str, encoding)
      .slice(indexStart, indexEnd)
      .toString(encoding);
}