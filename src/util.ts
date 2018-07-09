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
import {access, read} from 'fs/promises';
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
 * If the tsconfig.json file has an "extends" field hop down the dependency tree until it ends
 */


export interface ConfigFile {
  files?: string[];
  compilerOptions?: {};
  include?: string[];
  exclude?: string[];
}

export async function getTSConfig(
    rootDir: string, customReadFilep?: ReadFileP): Promise<ConfigFile> {
  // array to hold accessed files, used to check for circular references



  const tsconfigPath = path.join(rootDir, 'tsconfig.json');

  customReadFilep = customReadFilep || readFilep;
  const json = await customReadFilep(tsconfigPath, 'utf8');
  let contents = JSON.parse(json);

  const readArr = ['tsconfig.json'];
  if (contents['extends']) {
    const extension =
        await getExtension(contents['extends'], customReadFilep, readArr);
    contents = combineTSConfig(extension, contents);
  }
  return Promise.resolve(contents);
}

async function getExtension(
    filePath: string, customReadFilep: ReadFileP,
    readFiles: string[]): Promise<ConfigFile> {
  customReadFilep = customReadFilep || readFilep;
  if (!filePath) {
    throw new Error('Undefined passed in');
  }
  if (readFiles.indexOf(filePath) !== -1) {
    // did I throw the error correctly?
    throw new Error('Circular Reference Detected');
  }
  readFiles.push(filePath);
  const json = await customReadFilep(filePath, 'utf8');
  let contents = JSON.parse(json);

  if (contents['extends']) {
    const nextFile =
        await getExtension(contents['extends'], customReadFilep, readFiles);
    contents = combineTSConfig(nextFile, contents);
  }
  // console.log(contents);
  return Promise.resolve(contents);
}

// the inherited config file overwrites the base config file's "files",
// "include", and "exclude" fields and combines compiler options
function combineTSConfig(base: ConfigFile, inherited: ConfigFile): ConfigFile {
  // const TSProperties = ["compilerOptions", "files", "include", "exclude"];
  const result = {
    'compilerOptions': {},
    'files': [],
    'include': [],
    'exclude': [],
    'extends': {}
  };

  Object.assign(result, base, inherited);
  Object.assign(
      result.compilerOptions, base.compilerOptions, inherited.compilerOptions);
  delete result.extends;
  return result;
}