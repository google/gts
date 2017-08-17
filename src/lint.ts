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
import * as path from 'path';
import {Configuration, Linter} from 'tslint';
import * as ts from 'typescript';

import {Options} from './cli';

/**
 * Run tslint with the default configuration. Returns true on success.
 * @param fix automatically fix linter errors
 * @param options google-ts-style options
 */
export function lint(options: Options, fix = false): boolean {
  const tslintConfigPath = path.join(options.gtsRootDir, 'tslint.json');

  const program = createProgram(options);
  const configuration =
      Configuration.findConfiguration(tslintConfigPath, '').results;
  const linter = new Linter({fix: fix, formatter: 'codeFrame'}, program);
  const files = Linter.getFileNames(program);
  files.forEach(file => {
    const fileContents = program.getSourceFile(file).getFullText();
    linter.lint(file, fileContents, configuration);
  });
  const result = linter.getResult();
  if (result.errorCount || result.warningCount) {
    options.logger.log(result.output);
    return false;
  }
  return true;
}

export function createProgram(options: Options): ts.Program {
  const tsconfigPath = path.join(options.targetRootDir, 'tsconfig.json');
  return Linter.createProgram(tsconfigPath);
}
