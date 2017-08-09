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

import {readFilep as globalReadFile} from './util';

export interface TSConfigOptions { readFile?: any; }

/**
 * Find and read the tsconfig.json for the provided directory at `rootDir`.
 */
export class TSConfig {
  /**
   * Find the tsconfig.json, read it, and return a TSConfig object.
   * @param rootDir Directory where the tsconfig.json should be found.
   */
  static async get(rootDir: string, options?: TSConfigOptions):
      Promise<TSConfig> {
    const readFile = (options && options.readFile) || globalReadFile;

    const tsconfigPath = path.join(rootDir, 'tsconfig.json');
    const json = await readFile(tsconfigPath, 'utf8');
    const contents = JSON.parse(json);
    return new TSConfig(contents);
  }

  private constructor(readonly contents: any) {}
}
