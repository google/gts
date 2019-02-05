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

import * as prettier from 'prettier';
import * as fs from 'fs';
import * as diff from 'diff';

import {Options} from './cli';
import {createProgram} from './lint';

const PRETTIER_OPTIONS = require('../../prettier.config.js');

export async function format(
  options: Options,
  files: string[] = [],
  fix = false
): Promise<boolean> {
  if (options.dryRun && fix) {
    options.logger.log('format: skipping auto fix since --dry-run was passed');
    fix = false;
  }

  const program = createProgram(options);
  // Obtain a list of source files to format.
  // We use program.getRootFileNames to get only the files that match the
  // include patterns specified in the given tsconfig.json file (as specified
  // through options). This is necessary because we only want to format files
  // over which the developer has control (i.e. not auto-generated or
  // third-party source files).
  const srcFiles =
    files.length > 0
      ? files
      : program.getRootFileNames().filter(f => !f.endsWith('.d.ts'));

  if (fix) {
    fixFormat(srcFiles);
    return true;
  } else {
    const result = await checkFormat(srcFiles, options);
    if (!result) {
      options.logger.log(
        'prettier reported errors... run `gts fix` to address.'
      );
    }
    return result;
  }
}

/**
 * Checks formatting of the given file list.
 *
 * @param srcFiles list of source files
 * @param options gts options
 * @returns true if any files have formatting errors
 */
async function checkFormat(srcFiles: string[], options: Options) {
  const configs = await Promise.all(
    srcFiles.map(file => prettier.resolveConfig(file))
  );

  const checks = srcFiles.map((file, index) => {
    const config = configs[index] || PRETTIER_OPTIONS;
    config.filepath = config.filepath || file;
    const contents = fs.readFileSync(file, 'utf8');
    const formatted = prettier.format(contents, config);
    const wellFormatted = contents === formatted;
    if (!wellFormatted) {
      const patch = diff.createPatch(file, contents, formatted);
      options.logger.log(patch);
    }
    return wellFormatted;
  });

  return checks.reduce((sum, flag) => sum && flag, true);
}

function fixFormat(srcFiles: string[]) {
  srcFiles.forEach(file => {
    const contents = fs.readFileSync(file, 'utf8');
    const alreadyFormatted = prettier.check(contents, PRETTIER_OPTIONS);
    if (!alreadyFormatted) {
      const formatted = prettier.format(contents, PRETTIER_OPTIONS);
      fs.writeFileSync(file, formatted, 'utf8');
    }
  });
}
