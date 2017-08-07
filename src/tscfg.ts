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

import {globp, readFilep as readFile} from './util';

/**
 * Find the tsconfig.json, read it, and return a JSON
 * object with the results.
 * @param rootDir Directory where the tsconfig.json should be found.
 */
export async function getTsConfig(rootDir: string) {
  const tsconfigPath = path.join(rootDir, 'tsconfig.json');
  const tsconfigContents = await readFile(tsconfigPath, 'utf8');
  const tsconfig = JSON.parse(tsconfigContents);
  return tsconfig;
}

/**
 * Given a tsconfig, find a list of all input files for
 * the compiler.
 * https://www.typescriptlang.org/docs/handbook/tsconfig-json.html
 * @param tsconfig object containing the ts config
 */
export async function getInputFiles(tsconfig: any): Promise<string[]> {
  const inputFiles: string[] = [];
  const excludes = getExcludeFiles(tsconfig);
  const options: any = {};

  if (excludes) options.ignore = excludes;
  if (tsconfig.files) {
    Array.prototype.push.apply(inputFiles, tsconfig.files);
  }
  if (tsconfig.include) {
    for (let globEntry of tsconfig.include) {
      const globFiles = await globp(globEntry, options);
      Array.prototype.push.apply(inputFiles, globFiles);
    }
  }
  if (!tsconfig.include && !tsconfig.files) {
    const defaultIncludes = ['**/*.ts', '**/*.d.ts', '**/*.tsx'];
    for (let globEntry of defaultIncludes) {
      const globFiles = await globp(globEntry, options);
      Array.prototype.push.apply(inputFiles, globFiles);
    }
  }
  return inputFiles;
}

/**
 * Get the list of excluded files from the build
 * @param tsconfig object containing the ts config
 */
export function getExcludeFiles(tsconfig: any): string[] {
  if (tsconfig.exclude) {
    return tsconfig.exclude;
  } else {
    const defaultExcludes =
        ['node_modules', 'bower_components', 'jspm_packages'];
    if (tsconfig.compilerOptions && tsconfig.compilerOptions.outDir) {
      defaultExcludes.push(tsconfig.compilerOptions.outDir);
    }
    return defaultExcludes;
  }
}
