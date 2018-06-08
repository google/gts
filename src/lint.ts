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
import {Configuration, Linter} from 'tslint';
import * as ts from 'typescript';

import {Options} from './cli';

/**
 * Run tslint with the default configuration. Returns true on success.
 * @param options gts options
 * @param files files to run linter on
 * @param fix automatically fix linter errors. Ignored when options.dryRun is
 *            set.
 */
export function lint(
    options: Options, files: string[] = [], fix = false): boolean {
  if (options.dryRun && fix) {
    options.logger.log('lint: skipping auto fix since --dry-run was passed');
    fix = false;
  }

  if (files.length > 0) {  // manually provided filenames.
    const rcs = files.map(file => {
      // Different config files may apply to each file.
      const configPath = Configuration.findConfigurationPath(null, file) ||
          path.join(options.gtsRootDir, 'tslint.json');

      const configuration =
          Configuration.loadConfigurationFromPath(configPath, '');
      const source = fs.readFileSync(file, 'utf8');

      const linter = new Linter({fix, formatter: 'codeFrame'});
      linter.lint(file, source, configuration);
      const result = linter.getResult();
      if (result.errorCount || result.warningCount) {
        options.logger.log(result.output);
        return false;
      }
      return true;
    });

    return rcs.every(rc => rc);  // if all files succeeded.
  } else {
    // Lint the set of files specified by the typescript program config.
    const program = createProgram(options);
    files = Linter.getFileNames(program);

    const configPath =
        fs.existsSync(path.join(options.targetRootDir, 'tslint.json')) ?
        path.resolve(options.targetRootDir, 'tslint.json') :
        path.resolve(options.gtsRootDir, 'tslint.json');

    const configuration = Configuration.loadConfigurationFromPath(configPath);
    const linter = new Linter({fix, formatter: 'codeFrame'}, program);

    files.forEach(file => {
      const sourceFile = program.getSourceFile(file);
      if (sourceFile) {
        const fileContents = sourceFile.getFullText();
        linter.lint(file, fileContents, configuration);
      }
    });
    const result = linter.getResult();
    if (result.errorCount || result.warningCount) {
      options.logger.log(result.output);
      return false;
    }
    return true;
  }
}

export function createProgram(options: Options): ts.Program {
  const tsconfigPath = path.join(options.targetRootDir, 'tsconfig.json');
  return Linter.createProgram(tsconfigPath);
}
