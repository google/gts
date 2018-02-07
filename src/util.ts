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
import pify from 'pify';
import rimraf from 'rimraf';

export const readFilep = pify(fs.readFile);
export const rimrafp = pify(rimraf);
export const writeFileAtomicp = pify(require('write-file-atomic'));

export async function readJsonp(jsonPath: string) {
  return JSON.parse(await readFilep(jsonPath));
}

export interface ReadFileP {
  (path: string, encoding: string): Promise<string>;
}

export function nop() {
  /* empty */
}

/**
 * Find the tsconfig.json, read it, and return parsed contents.
 * @param rootDir Directory where the tsconfig.json should be found.
 */
export async function getTSConfig(
    rootDir: string, customReadFilep?: ReadFileP): Promise<{}> {
  const tsconfigPath = path.join(rootDir, 'tsconfig.json');
  customReadFilep = customReadFilep || readFilep;
  const json = await customReadFilep(tsconfigPath, 'utf8');
  const contents = JSON.parse(json);
  return contents;
}
