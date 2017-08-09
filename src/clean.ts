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
import * as chalk from 'chalk';

import {Options} from './cli';
import {getTSConfig, rimrafp} from './util';

/**
 * Remove files generated by the build.
 */
export async function clean(options: Options): Promise<void> {
  const tsconfig = (await getTSConfig(options.targetRootDir));
  if (tsconfig.compilerOptions && tsconfig.compilerOptions.outDir) {
    const outDir = tsconfig.compilerOptions.outDir;
    if (outDir === '.') {
      console.error(
          `${chalk.red('ERROR:')} ${chalk.gray('compilerOptions.outDir')} ` +
          `cannot use the value '.'.  That would delete all of our sources.`);
      return;
    }
    const message = `${chalk.red('Removing')} ${outDir} ...`;
    console.log(message);
    await rimrafp(outDir);
  } else {
    console.error(
        `${chalk.red('ERROR:')} The ${chalk.gray('clean')} command` +
        ` requires ${chalk.gray('compilerOptions.outDir')} to be defined in ` +
        `tsconfig.json.`);
  }
}
