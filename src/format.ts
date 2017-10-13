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
import {Options} from './cli';
import {createProgram} from './lint';

const clangFormat = require('clang-format');

const baseArgs =
    ['-style', '{Language: JavaScript, BasedOnStyle: Google, ColumnLimit: 80}'];

/**
 * Run tslint fix and clang fix with the default configuration
 * @param options
 * @param fix whether to automatically fix the format
 * @param files files to format
 */
export async function format(
    options: Options, files: string[] = [], fix = false): Promise<boolean> {
  const program = createProgram(options);
  const srcFiles = files.length > 0 ?
      files :
      program.getSourceFiles()
          .map(sourceFile => sourceFile.fileName)
          .filter(f => !f.endsWith('.d.ts'));

  if (fix) {
    return fixFormat(srcFiles);
  } else {
    const result = await checkFormat(srcFiles);
    if (!result) {
      options.logger.error(
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
function fixFormat(srcFiles: string[]): Promise<boolean> {
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
function checkFormat(srcFiles: string[]): Promise<boolean> {
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
    out.on('end', () => {
      resolve(output.indexOf('<replacement ') === -1 ? true : false);
    });
  });
}
