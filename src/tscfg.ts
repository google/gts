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

export interface TSConfigOptions {
  globp?: any;
  readFile?: any;
}

/**
 * Find and read the tsconfig.json for the provided directory at `rootDir`.
 */
export class TSConfig {
  private globp: any;

  /**
   * Find the tsconfig.json, read it, and return a TSConfig object.
   * @param rootDir Directory where the tsconfig.json should be found.
   */
  static async get(rootDir: string, options?: TSConfigOptions):
      Promise<TSConfig> {
    options = options || {};
    options.globp = options.globp || globp;
    options.readFile = options.readFile || readFile;

    const tsconfigPath = path.join(rootDir, 'tsconfig.json');
    const json = await options.readFile(tsconfigPath, 'utf8');
    const contents = JSON.parse(json);
    return new TSConfig(contents, options);
  }

  private constructor(readonly contents: any, options: TSConfigOptions) {
    this.globp = options.globp || globp;
  }

  /**
   * Get the list of excluded files from the build. This is based on the
   * exclude property of the config. A default is provided if the property is
   * missing.
   */
  getExcludeFiles(): string[] {
    if (this.contents.exclude) {
      return this.contents.exclude;
    }
    const defaultExcludes =
        ['node_modules', 'bower_components', 'jspm_packages'];
    if (this.contents.compilerOptions && this.contents.compilerOptions.outDir) {
      defaultExcludes.push(this.contents.compilerOptions.outDir);
    }
    return defaultExcludes;
  }

  /**
   * Find a list of all input files for the compiler based on the config.
   * https://www.typescriptlang.org/docs/handbook/tsconfig-json.html
   * @param tsconfig object containing the ts config
   */
  async getInputFiles(): Promise<string[]> {
    const inputFiles: string[] = [];
    const excludes = this.getExcludeFiles();
    const options: any = {};

    if (excludes) options.ignore = excludes;
    if (this.contents.files) {
      Array.prototype.push.apply(inputFiles, this.contents.files);
    }

    if (this.contents.include) {
      for (let globEntry of this.contents.include) {
        const globFiles = await this.globp(globEntry, options);
        Array.prototype.push.apply(inputFiles, globFiles);
      }
    }
    if (!this.contents.include && !this.contents.files) {
      const defaultIncludes = ['**/*.ts', '**/*.d.ts', '**/*.tsx'];
      for (let globEntry of defaultIncludes) {
        const globFiles = await this.globp(globEntry, options);
        Array.prototype.push.apply(inputFiles, globFiles);
      }
    }
    return inputFiles;
  }
}
