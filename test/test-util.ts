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
import { PathLike } from 'fs';

import {
  ConfigFile,
  getTSConfig,
  isYarnUsed,
  getPkgManagerName,
} from '../src/util';

/**
 * Creates a fake promisified readFile function from a map
 * @param myMap contains a filepath as the key and a ConfigFile object as the
 * value.
 * The returned function has the same interface as fs.readFile
 */
function createFakeReadFilep(myMap: Map<string, ConfigFile>) {
  return (configPath: string) => {
    const configFile = myMap.get(configPath);
    if (configFile) {
      return Promise.resolve(JSON.stringify(configFile));
    } else {
      return Promise.reject(`${configPath} Not Found`);
    }
  };
}

function makeFakeFsExistsSync(
  expected: PathLike[]
): (path: PathLike) => boolean {
  return (path: PathLike) => expected.some(item => item === path);
}

test('get should parse the correct tsconfig file', async t => {
  const FAKE_DIRECTORY = '/some/fake/directory';
  const FAKE_CONFIG1 = { files: ['b'] };

  function fakeReadFilep(
    configPath: string,
    encoding: string
  ): Promise<string> {
    t.is(configPath, path.join(FAKE_DIRECTORY, 'tsconfig.json'));
    t.is(encoding, 'utf8');
    return Promise.resolve(JSON.stringify(FAKE_CONFIG1));
  }
  const contents = await getTSConfig(FAKE_DIRECTORY, fakeReadFilep);
  t.deepEqual(contents, FAKE_CONFIG1);
});

test('should throw an error if it finds a circular reference', async t => {
  const FAKE_DIRECTORY = '/some/fake/directory';
  const FAKE_CONFIG1 = { files: ['b'], extends: 'FAKE_CONFIG2' };
  const FAKE_CONFIG2 = { extends: 'FAKE_CONFIG3' };
  const FAKE_CONFIG3 = { extends: 'tsconfig.json' };
  const myMap = new Map();
  myMap.set('/some/fake/directory/tsconfig.json', FAKE_CONFIG1);
  myMap.set('/some/fake/directory/FAKE_CONFIG2', FAKE_CONFIG2);
  myMap.set('/some/fake/directory/FAKE_CONFIG3', FAKE_CONFIG3);

  await t.throwsAsync(
    getTSConfig(FAKE_DIRECTORY, createFakeReadFilep(myMap)),
    Error,
    'Circular Reference Detected'
  );
});

test('should follow dependency chain caused by extends files', async t => {
  const FAKE_DIRECTORY = '/some/fake/directory';
  const FAKE_CONFIG1 = {
    compilerOptions: { a: 'n' },
    files: ['b'],
    extends: 'FAKE_CONFIG2',
  };
  const FAKE_CONFIG2 = { include: ['/stuff/*'], extends: 'FAKE_CONFIG3' };
  const FAKE_CONFIG3 = { exclude: ['doesnt/look/like/anything/to/me'] };
  const combinedConfig = {
    compilerOptions: { a: 'n' },
    files: ['b'],
    include: ['/stuff/*'],
    exclude: ['doesnt/look/like/anything/to/me'],
  };

  const myMap = new Map();
  myMap.set('/some/fake/directory/tsconfig.json', FAKE_CONFIG1);
  myMap.set('/some/fake/directory/FAKE_CONFIG2', FAKE_CONFIG2);
  myMap.set('/some/fake/directory/FAKE_CONFIG3', FAKE_CONFIG3);

  const contents = await getTSConfig(
    FAKE_DIRECTORY,
    createFakeReadFilep(myMap)
  );
  t.deepEqual(contents, combinedConfig);
});

test('when a file contains an extends field, the base file is loaded first then overridden by the inherited files', async t => {
  const FAKE_DIRECTORY = '/some/fake/directory';
  const FAKE_CONFIG1 = { files: ['b'], extends: 'FAKE_CONFIG2' };
  const FAKE_CONFIG2 = { files: ['c'], extends: 'FAKE_CONFIG3' };
  const FAKE_CONFIG3 = { files: ['d'] };
  const combinedConfig = { compilerOptions: {}, files: ['b'] };
  const myMap = new Map();
  myMap.set('/some/fake/directory/tsconfig.json', FAKE_CONFIG1);
  myMap.set('/some/fake/directory/FAKE_CONFIG2', FAKE_CONFIG2);
  myMap.set('/some/fake/directory/FAKE_CONFIG3', FAKE_CONFIG3);

  const contents = await getTSConfig(
    FAKE_DIRECTORY,
    createFakeReadFilep(myMap)
  );
  t.deepEqual(contents, combinedConfig);
});

test('when reading a file, all filepaths should be relative to the config file currently being read', async t => {
  const FAKE_DIRECTORY = '/some/fake/directory';
  const FAKE_CONFIG1 = { files: ['b'], extends: './foo/FAKE_CONFIG2' };
  const FAKE_CONFIG2 = { include: ['c'], extends: './bar/FAKE_CONFIG3' };
  const FAKE_CONFIG3 = { exclude: ['d'] };
  const combinedConfig = {
    compilerOptions: {},
    exclude: ['d'],
    files: ['b'],
    include: ['c'],
  };
  const myMap = new Map();
  myMap.set('/some/fake/directory/tsconfig.json', FAKE_CONFIG1);
  myMap.set('/some/fake/directory/foo/FAKE_CONFIG2', FAKE_CONFIG2);
  myMap.set('/some/fake/directory/foo/bar/FAKE_CONFIG3', FAKE_CONFIG3);

  const contents = await getTSConfig(
    FAKE_DIRECTORY,
    createFakeReadFilep(myMap)
  );
  t.deepEqual(contents, combinedConfig);
});

test('function throws an error when reading a file that does not exist', async t => {
  const FAKE_DIRECTORY = '/some/fake/directory';
  const myMap = new Map();

  await t.throwsAsync(
    getTSConfig(FAKE_DIRECTORY, createFakeReadFilep(myMap)),
    Error,
    `${FAKE_DIRECTORY}/tsconfig.json Not Found`
  );
});

test("isYarnUsed returns true if there's yarn.lock file only", async t => {
  const existsSync = makeFakeFsExistsSync(['yarn.lock']);

  t.is(isYarnUsed(existsSync), true);
});

test("isYarnUsed returns false if there's package-lock.json file only", async t => {
  const existsSync = makeFakeFsExistsSync(['package-lock.json']);

  t.is(isYarnUsed(existsSync), false);
});

test("isYarnUsed returns false if there're yarn.lock and package-lock.json files", async t => {
  const existsSync = makeFakeFsExistsSync(['package-lock.json', 'yarn.lock']);

  t.is(isYarnUsed(existsSync), false);
});

test('getPkgManagerName returns npm by default', async t => {
  t.is(getPkgManagerName(), 'npm');
  t.is(getPkgManagerName(), getPkgManagerName(false));
});

test('getPkgManagerName returns yarn', async t => {
  t.is(getPkgManagerName(true), 'yarn');
});

// TODO: test errors in readFile, JSON.parse.
