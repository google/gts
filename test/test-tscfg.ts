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
import test from 'ava';
import * as path from 'path';

import {TSConfig} from '../src/tscfg';

const FAKE_DIRECTORY = '/some/fake/directory';
const FAKE_CONFIG = {
  a: 'b'
};

// tslint:disable-next-line:variable-name
const fakeReadFile = (_path: string, _encoding: string) => {
  return Promise.resolve(JSON.stringify(FAKE_CONFIG));
};

test('get should use the provided readFile', async t => {
  await TSConfig.get(FAKE_DIRECTORY, {
    readFile: (configPath: string, encoding: string) => {
      t.pass();
      return fakeReadFile(configPath, encoding);
    }
  });
});

// TODO: similar test for globp

test('get should open the correct tsconfig file', async t => {
  await TSConfig.get(FAKE_DIRECTORY, {
    readFile: (configPath: string, encoding: string) => {
      t.is(configPath, path.join(FAKE_DIRECTORY, 'tsconfig.json'));
      t.is(encoding, 'utf8');
      return fakeReadFile(configPath, encoding);
    }
  });
});

test('get should parse the config file json', async t => {
  const tsconfig = await TSConfig.get(FAKE_DIRECTORY, {readFile: fakeReadFile});
  t.deepEqual(tsconfig.contents, FAKE_CONFIG);
});

test('getExcludeFiles should return exclude from the config', async t => {
  const CONFIG = {exclude: ['this.thing', 'that.thing']};

  const tsconfig = await TSConfig.get(FAKE_DIRECTORY, {
    // tslint:disable-next-line:variable-name
    readFile: (_configPath: string, _encoding: string) => {
      return Promise.resolve(JSON.stringify(CONFIG));
    }
  });
  const exclude = tsconfig.getExcludeFiles();
  t.deepEqual(exclude, CONFIG.exclude);
});

test(
    'getExcludeFiles should return default exclude if not present', async t => {
      const tsconfig =
          await TSConfig.get(FAKE_DIRECTORY, {readFile: fakeReadFile});
      const exclude = tsconfig.getExcludeFiles();
      t.deepEqual(
          exclude, ['node_modules', 'bower_components', 'jspm_packages']);
    });

test(
    'getExcludeFiles should return take outDir into consideration', async t => {
      const CONFIG = {compilerOptions: {outDir: 'fake-output-directory'}};

      const tsconfig = await TSConfig.get(FAKE_DIRECTORY, {
        // tslint:disable-next-line:variable-name
        readFile: (_configPath: string, _encoding: string) => {
          return Promise.resolve(JSON.stringify(CONFIG));
        }
      });
      const exclude = tsconfig.getExcludeFiles();
      t.deepEqual(exclude, [
        'node_modules', 'bower_components', 'jspm_packages',
        CONFIG.compilerOptions.outDir
      ]);
    });

test('getInputFiles, when files is present', async t => {
  const CONFIG = {files: ['a', 'b', 'c']};

  const tsconfig = await TSConfig.get(FAKE_DIRECTORY, {
    // tslint:disable-next-line:variable-name
    readFile: (_configPath: string, _encoding: string) => {
      return Promise.resolve(JSON.stringify(CONFIG));
    }
  });

  const files = await tsconfig.getInputFiles();
  t.deepEqual(files, CONFIG.files);
});

test('getInputFiles should glob include patterns', async t => {
  const CONFIG = {include: ['a/**']};
  const EXPANDED_GLOB = ['a/b', 'a/c'];

  const tsconfig = await TSConfig.get(FAKE_DIRECTORY, {
    // tslint:disable-next-line:variable-name
    readFile: (_configPath: string, _encoding: string) => {
      return Promise.resolve(JSON.stringify(CONFIG));
    },
    // tslint:disable-next-line:variable-name
    globp: (_pattern: string, _options: any) => {
      return Promise.resolve(EXPANDED_GLOB);
    }
  });

  const files = await tsconfig.getInputFiles();
  t.deepEqual(files, EXPANDED_GLOB);
});

test('getInputFiles should list files before include globs', async t => {
  const CONFIG = {include: ['a/**'], files: ['x', 'a/c']};
  const EXPANDED_GLOB = ['a/b', 'a/c'];

  const tsconfig = await TSConfig.get(FAKE_DIRECTORY, {
    // tslint:disable-next-line:variable-name
    readFile: (_configPath: string, _encoding: string) => {
      return Promise.resolve(JSON.stringify(CONFIG));
    },
    // tslint:disable-next-line:variable-name
    globp: (_pattern: string, _options: any) => {
      return Promise.resolve(EXPANDED_GLOB);
    }
  });

  const files = await tsconfig.getInputFiles();
  t.deepEqual(files, CONFIG.files.concat(EXPANDED_GLOB));
});

test('getInputFiles should pass exclude to glob options', async t => {
  t.plan(2);
  const CONFIG = {
    include: ['a/**'],
    files: ['x', 'a/c'],
    exclude: ['node_modules']
  };
  const EXPANDED_GLOB = ['a/b', 'a/c'];

  const tsconfig = await TSConfig.get(FAKE_DIRECTORY, {
    // tslint:disable-next-line:variable-name
    readFile: (_configPath: string, _encoding: string) => {
      return Promise.resolve(JSON.stringify(CONFIG));
    },
    // tslint:disable-next-line:variable-name
    globp: (_pattern: string, options: any) => {
      t.deepEqual(options, {ignore: CONFIG.exclude});
      return Promise.resolve(EXPANDED_GLOB);
    }
  });

  const files = await tsconfig.getInputFiles();
  t.deepEqual(files, CONFIG.files.concat(EXPANDED_GLOB));
});

test(
    'getInputFiles should use default when files and include are omitted',
    async t => {
      const CONFIG = {exclude: ['node_modules']};
      const globPatterns: string[] = [];

      const tsconfig = await TSConfig.get(FAKE_DIRECTORY, {
        // tslint:disable-next-line:variable-name
        readFile: (_configPath: string, _encoding: string) => {
          return Promise.resolve(JSON.stringify(CONFIG));
        },
        globp: (pattern: string, options: any) => {
          t.deepEqual(options, {ignore: CONFIG.exclude});
          globPatterns.push(pattern);
          return Promise.resolve(['fake.ts']);
        }
      });

      await tsconfig.getInputFiles();
      t.deepEqual(
          globPatterns.sort(), ['**/*.ts', '**/*.d.ts', '**/*.tsx'].sort());
    });
