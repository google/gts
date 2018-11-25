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
import chalk from 'chalk';
import * as jsdiff from 'diff';
import * as entities from 'entities';
import * as fs from 'fs';
import * as path from 'path';

import {Options} from './cli';
import {createProgram} from './lint';
import {readFilep} from './util';

/**
 * Object that contains the position of formatting issue within the file, the
 * length of it, and the string to replace it with.
 */
export interface Replacement {
  offset: number;
  length: number;
  fix: string;
}

// Exported for testing purposes.
export const clangFormat = require('clang-format');

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

  // If the project has a .clang-format – use it. Else use the default as an
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
    const result = await checkFormat(options, srcFiles, baseClangFormatArgs);
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
function checkFormat(options: Options, srcFiles: string[], baseArgs: string[]):
    Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    let output = '';
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

    out.on('end', async () => {
      const files: string[] =
          output.split('<?xml version=\'1.0\'?>\n').slice(1);
      for (let i = 0; i < files.length; i++) {
        if (files[i].indexOf('<replacement ') === -1) {
          continue;
        }
        const replacements = getReplacements(files[i]);
        if (replacements.length > 0) {
          const diff = await getDiffObj(srcFiles[i], replacements);
          printDiffs(diff, options);
        }
      }
      resolve(output.indexOf('<replacement ') === -1 ? true : false);
    });
  });
}

/**
 * Parses through xml string for the replacement string, offset, length and
 * returns all of the necessary replacements for the file
 *
 * @param output xml string from clangFormat
 */
export function getReplacements(fileXML: string): Replacement[] {
  const replacements: Replacement[] = [];

  let xmlLines = fileXML.trim().split('\n');
  // first and last elements are outer 'replacements' tags
  xmlLines = xmlLines.slice(1, xmlLines.length - 1);

  for (let i = 0; i < xmlLines.length; i++) {
    // Uses regex to capture the xml attributes and element
    // XML format:
    // <replacement offset='OFFSET' length='LENGTH'>FIX</replacement>
    const offset: string[]|null = (/offset='(\d+)'/g).exec(xmlLines[i]);
    const length: string[]|null = (/length='(\d+)'/g).exec(xmlLines[i]);
    const fix: string[]|null =
        (/length='\d+'>(.*)<\/replacement>/g).exec(xmlLines[i]);

    if (length === null || offset === null || fix === null) {
      throw new Error('Unable to get replacement');
    }
    replacements[i] = {
      offset: Number(offset[1]),
      length: Number(length[1]),
      fix: entities.decodeXML(fix[1])
    };
  }
  return replacements;
}

/**
 * Gets an object containing the differences between the original file and after
 * changes have been made
 *
 * @param file
 * @param replacements array of all the formatting issues within in the file
 */
async function getDiffObj(
    file: string, replacements: Replacement[]): Promise<jsdiff.IUniDiff> {
  const text = await readFilep(file, 'utf8');
  const fixed = performFixes(text, replacements);
  const diff =
      jsdiff.structuredPatch(file, '', text, fixed, '', '', {context: 3});
  jsdiff.applyPatch('diff', diff);
  return diff;
}

/**
 * Performs formatting fixes to the original string
 *
 * @param data original string
 * @param errOffset start index of the formatting issue
 * @param errLength length of formatting issue
 * @param replacements string that resolves formatting issue
 */
function performFixes(data: string, replacements: Replacement[]) {
  const replaced: string[] = [];
  replaced.push(substring(data, 0, replacements[0].offset));
  for (let i = 0; i < replacements.length - 1; i++) {
    replaced.push(replacements[i].fix);
    replaced.push(substring(
        data, replacements[i].offset + replacements[i].length,
        replacements[i + 1].offset));
  }
  replaced.push(replacements[replacements.length - 1].fix);
  replaced.push(substring(
      data,
      replacements[replacements.length - 1].offset +
          replacements[replacements.length - 1].length,
      Buffer.byteLength(data, 'utf8')));
  return replaced.join('');
}

/**
 * Prints the lines with formatting issues
 *
 * @param diffs contains all information about the formatting changes
 * @param options
 */
function printDiffs(diffs: jsdiff.IUniDiff, options: Options) {
  options.logger.log(chalk.inverse.bold(diffs.oldFileName));
  diffs.hunks.forEach((diff: JsDiff.IHunk) => {
    const log = `  Lines: ${diff.oldStart}-${diff.oldStart + diff.oldLines}`;
    options.logger.log(chalk.bold(log));

    diff.lines.forEach((line: string) => {
      if (line[0] === '-') {
        options.logger.log(`   ${chalk.red(line)}`);
      } else if (line[0] === '+') {
        options.logger.log(`   ${chalk.green(line)}`);
      } else {
        options.logger.log(`   ${chalk.gray(line)}`);
      }
    });
    options.logger.log('\n');
  });
}

/**
 * Substring using bytes
 *
 * @param str original string
 * @param indexStart position where to start extraction
 * @param indexEnd position (up to, but not including) where to end extraction
 * @param encoding
 */
function substring(
    str: string, indexStart: number, indexEnd: number, encoding = 'utf8') {
  return Buffer.from(str, encoding)
      .slice(indexStart, indexEnd)
      .toString(encoding);
}
