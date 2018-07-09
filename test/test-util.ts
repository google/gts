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

import {getTSConfig} from '../src/util';

test('get should parse the correct tsconfig file', async t => {
  const FAKE_DIRECTORY = '/some/fake/directory';
  const FAKE_CONFIG = {files: ['b']};
  function fakeReadFilep(
      configPath: string, encoding: string): Promise<string> {
    t.is(configPath, path.join(FAKE_DIRECTORY, 'tsconfig.json'));
    t.is(encoding, 'utf8');
    return Promise.resolve(JSON.stringify(FAKE_CONFIG));
  }
  const contents = await getTSConfig(FAKE_DIRECTORY, fakeReadFilep);
  t.deepEqual(contents, FAKE_CONFIG);
});



// TODO: test for error due to circular reference
test('should throw an error if it finds a circular reference', async t => {
  const FAKE_DIRECTORY = '/some/fake/directory';
  const FAKE_CONFIG = {files: ['b'], extends: 'CONFIG1'};
  const CONFIG1 = {extends: 'CONFIG2'};
  const CONFIG2 = {extends: 'FAKE_CONFIG'};
  function fakeReadFilep(
      configPath: string, encoding: string): Promise<string> {
    switch (configPath) {
      case 'FAKE_CONFIG':

      case 'CONFIG1':
        return Promise.resolve(JSON.stringify(CONFIG1));
      case 'CONFIG2':
        return Promise.resolve(JSON.stringify(CONFIG2));
      case '/some/fake/directory/tsconfig.json':
        return Promise.resolve(JSON.stringify(FAKE_CONFIG));
      default:
        return Promise.reject('File Not Found');
    }
  }
  await t.throws(
      getTSConfig(FAKE_DIRECTORY, fakeReadFilep), Error,
      'Circular Reference Detected');
});


test('should follow dependency chain caused by extends files', async t => {
  const FAKE_DIRECTORY = '/some/fake/directory';
  const FAKE_CONFIG = {
    compilerOptions: {compileExtraFastPleas: 'SuperSpeed'},
    files: ['b'],
    extends: 'CONFIG1'
  };
  const CONFIG1 = {include: ['/stuff/*'], extends: 'CONFIG2'};
  const CONFIG2 = {exclude: ['doesnt/look/like/anything/to/me']};
  const combinedConfig = {
    compilerOptions: {compileExtraFastPleas: 'SuperSpeed'},
    files: ['b'],
    include: ['/stuff/*'],
    exclude: ['doesnt/look/like/anything/to/me']
  };


  function fakeReadFilep(
      configPath: string, encoding: string): Promise<string> {
    switch (configPath) {
      case 'FAKE_CONFIG':

      case 'CONFIG1':
        return Promise.resolve(JSON.stringify(CONFIG1));
      case 'CONFIG2':
        return Promise.resolve(JSON.stringify(CONFIG2));
      case '/some/fake/directory/tsconfig.json':
        return Promise.resolve(JSON.stringify(FAKE_CONFIG));
      default:
        return Promise.reject('File Not Found');
    }
  }
  const contents = await getTSConfig(FAKE_DIRECTORY, fakeReadFilep);
  t.deepEqual(contents, combinedConfig);
});



// TODO: test for circular reference error with symlinks


// TODO: test errors in readFile, JSON.parse.
