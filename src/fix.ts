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
import * as cp from 'child_process';
import * as os from 'os';
import * as path from 'path';

import {Options} from './cli';
import {lint} from './lint';
import {TSConfig} from './tscfg';

/**
 * Run tslint fix and clang fix with the default configuration
 */
export async function fix(options: Options): Promise<void> {
  lint(true, options);

  // TODO: move this code into a format.ts file.
  const gtsRootDir = path.join(__dirname, '../..');
  let platform = os.platform();
  if (platform === 'darwin' || platform === 'linux') {
    platform += ('_' + os.arch());
  } else if (platform !== 'win32') {
    throw new Error(
        'Fix is only available on the darwin, win32, and linux platforms.');
  }
  const clangPath =
      path.join(gtsRootDir, `../clang-format/bin/${platform}/clang-format`);

  const tsconfig = await TSConfig.get(options.targetRootDir);
  const srcFiles = await tsconfig.getInputFiles();
  const initClangArgs = [
    '-i', '-style',
    '{Language: JavaScript, BasedOnStyle: Google, ColumnLimit: 80}'
  ];
  const clangArgs = initClangArgs.concat(srcFiles);
  cp.spawnSync(clangPath, clangArgs, {stdio: 'inherit'});
}
