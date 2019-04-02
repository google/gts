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
import * as pify from 'pify';
import * as rimraf from 'rimraf';

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
 * If the tsconfig.json file has an "extends" field hop down the dependency tree
 * until it ends or a circular reference is found in which case an error will be
 * thrown
 */
export async function getTSConfig(
  rootDir: string,
  customReadFilep?: ReadFileP
): Promise<ConfigFile> {
  customReadFilep = customReadFilep || readFilep;
  const readArr = new Set();
  return getBase('tsconfig.json', customReadFilep, readArr, rootDir);
}

/**
 * Recursively iterate through the dependency chain until we reach the end of
 * the dependency chain or encounter a circular reference
 * @param filePath Filepath of file currently being read
 * @param customReadFilep The file reading function being used
 * @param readFiles an array of the previously read files so we can check for
 * circular references
 * returns a ConfigFile object containing the data from all the dependencies
 */
async function getBase(
  filePath: string,
  customReadFilep: ReadFileP,
  readFiles: Set<string>,
  currentDir: string
): Promise<ConfigFile> {
  customReadFilep = customReadFilep || readFilep;

  filePath = path.resolve(currentDir, filePath);

  // An error is thrown if there is a circular reference as specified by the
  // TypeScript doc
  if (readFiles.has(filePath)) {
    throw new Error(`Circular reference in ${filePath}`);
  }
  readFiles.add(filePath);
  try {
    const json = await customReadFilep(filePath, 'utf8');
    let contents = JSON.parse(json);

    if (contents.extends) {
      const nextFile = await getBase(
        contents.extends,
        customReadFilep,
        readFiles,
        path.dirname(filePath)
      );
      contents = combineTSConfig(nextFile, contents);
    }

    return contents;
  } catch (err) {
    throw new Error(`${filePath} Not Found`);
  }
}

/**
 * Takes in 2 config files
 * @param base is loaded first
 * @param inherited is then loaded and overwrites base
 */
function combineTSConfig(base: ConfigFile, inherited: ConfigFile): ConfigFile {
  const result: ConfigFile = { compilerOptions: {} };

  Object.assign(result, base, inherited);
  Object.assign(
    result.compilerOptions,
    base.compilerOptions,
    inherited.compilerOptions
  );
  delete result.extends;
  return result;
}

/**
 * An interface containing the top level data fields present in Config Files
 */
export interface ConfigFile {
  files?: string[];
  compilerOptions?: {};
  include?: string[];
  exclude?: string[];
  extends?: string[];
}

/**
 * Automatically defines npm or yarn is going to be used:
 * - If only yarn.lock exists, use yarn
 * - If only package-lock.json or both exist, use npm
 */
export function isYarnUsed(existsSync = fs.existsSync): boolean {
  if (existsSync('package-lock.json')) {
    return false;
  }
  return existsSync('yarn.lock');
}

export function getPkgManagerCommand(isYarnUsed?: boolean): string {
  return (
    (isYarnUsed ? 'yarn' : 'npm') + (process.platform === 'win32' ? '.cmd' : '')
  );
}
