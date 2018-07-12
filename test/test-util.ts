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
  const FAKE_CONFIG1 = {files: ['b']};
  function fakeReadFilep(
      configPath: string, encoding: string): Promise<string> {
    t.is(configPath, path.join(FAKE_DIRECTORY, 'tsconfig.json'));
    t.is(encoding, 'utf8');
    return Promise.resolve(JSON.stringify(FAKE_CONFIG1));
  }
  const contents = await getTSConfig(FAKE_DIRECTORY, fakeReadFilep);
  t.deepEqual(contents, FAKE_CONFIG1);
});

test('should throw an error if it finds a circular reference', async t => {
  const FAKE_DIRECTORY = '/some/fake/directory';
  const FAKE_CONFIG1 = {files: ['b'], extends: 'FAKE_CONFIG2'};
  const FAKE_CONFIG2 = {extends: 'FAKE_CONFIG3'};
  const FAKE_CONFIG3 = {extends: 'FAKE_CONFIG1'};
  function fakeReadFilep(
      configPath: string, encoding: string): Promise<string> {
    switch (configPath) {
      case '/some/fake/directory/FAKE_CONFIG1':
        return Promise.resolve(JSON.stringify(FAKE_CONFIG1));
      case '/some/fake/directory/FAKE_CONFIG2':
        return Promise.resolve(JSON.stringify(FAKE_CONFIG2));
      case '/some/fake/directory/FAKE_CONFIG3':
        return Promise.resolve(JSON.stringify(FAKE_CONFIG3));
      case '/some/fake/directory/tsconfig.json':
        return Promise.resolve(JSON.stringify(FAKE_CONFIG1));
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
  const FAKE_CONFIG1 = {
    compilerOptions: {a: 'n'},
    files: ['b'],
    extends: 'FAKE_CONFIG2'
  };
  const FAKE_CONFIG2 = {include: ['/stuff/*'], extends: 'FAKE_CONFIG3'};
  const FAKE_CONFIG3 = {exclude: ['doesnt/look/like/anything/to/me']};
  const combinedConfig = {
    compilerOptions: {a: 'n'},
    files: ['b'],
    include: ['/stuff/*'],
    exclude: ['doesnt/look/like/anything/to/me']
  };


  function fakeReadFilep(
      configPath: string, encoding: string): Promise<string> {
    switch (configPath) {
      case '/some/fake/directory/FAKE_CONFIG1':

      case '/some/fake/directory/FAKE_CONFIG2':
        return Promise.resolve(JSON.stringify(FAKE_CONFIG2));
      case '/some/fake/directory/FAKE_CONFIG3':
        return Promise.resolve(JSON.stringify(FAKE_CONFIG3));
      case '/some/fake/directory/tsconfig.json':
        return Promise.resolve(JSON.stringify(FAKE_CONFIG1));
      default:
        return Promise.reject('File Not Found');
    }
  }
  const contents = await getTSConfig(FAKE_DIRECTORY, fakeReadFilep);
  t.deepEqual(contents, combinedConfig);
});


test('should throw an error if it finds a circular reference', async t => {
  const FAKE_DIRECTORY = '/some/fake/directory';
  const FAKE_CONFIG1 = {files: ['b'], extends: 'FAKE_CONFIG2'};
  const FAKE_CONFIG2 = {extends: 'FAKE_CONFIG3'};
  const FAKE_CONFIG3 = {extends: 'FAKE_CONFIG1'};
  function fakeReadFilep(
      configPath: string, encoding: string): Promise<string> {
    switch (configPath) {
      case '/some/fake/directory/FAKE_CONFIG1':

      case '/some/fake/directory/FAKE_CONFIG2':
        return Promise.resolve(JSON.stringify(FAKE_CONFIG2));
      case '/some/fake/directory/FAKE_CONFIG3':
        return Promise.resolve(JSON.stringify(FAKE_CONFIG3));
      case '/some/fake/directory/tsconfig.json':
        return Promise.resolve(JSON.stringify(FAKE_CONFIG1));
      default:
        return Promise.reject('File Not Found');
    }
  }
  await t.throws(
      getTSConfig(FAKE_DIRECTORY, fakeReadFilep), Error,
      'Circular Reference Detected');
});

test(
    'when a file contains an extends field, the base file is loaded first then overridden by the inherited files',
    async t => {
      const FAKE_DIRECTORY = '/some/fake/directory';
      const FAKE_CONFIG1 = {files: ['b'], extends: 'FAKE_CONFIG2'};
      const FAKE_CONFIG2 = {files: ['c'], extends: 'FAKE_CONFIG3'};
      const FAKE_CONFIG3 = {files: ['d']};
      const combinedConfig = {compilerOptions: {}, files: ['b']};
      function fakeReadFilep(
          configPath: string, encoding: string): Promise<string> {
        switch (configPath) {
          case '/some/fake/directory/FAKE_CONFIG1':

          case '/some/fake/directory/FAKE_CONFIG2':
            return Promise.resolve(JSON.stringify(FAKE_CONFIG2));
          case '/some/fake/directory/FAKE_CONFIG3':
            return Promise.resolve(JSON.stringify(FAKE_CONFIG3));
          case '/some/fake/directory/tsconfig.json':
            return Promise.resolve(JSON.stringify(FAKE_CONFIG1));
          default:
            return Promise.reject('File Not Found');
        }
      }
      const contents = await getTSConfig(FAKE_DIRECTORY, fakeReadFilep);
      t.deepEqual(contents, combinedConfig);
    });

test(
    'When reading a file, all filepaths should be relative to the config file currently being read',
    async t => {
      const FAKE_DIRECTORY = '/some/fake/directory';
      const FAKE_CONFIG1 = {files: ['b'], extends: './foo/FAKE_CONFIG2'};
      const FAKE_CONFIG2 = {include: ['c'], extends: './bar/FAKE_CONFIG3'};
      const FAKE_CONFIG3 = {exclude: ['d']};
      const combinedConfig =
          {compilerOptions: {}, exclude: ['d'], files: ['b'], include: ['c']};
      function fakeReadFilep(
          configPath: string, encoding: string): Promise<string> {
        switch (configPath) {
          case '/some/fake/directory/FAKE_CONFIG1':

          case '/some/fake/directory/foo/FAKE_CONFIG2':
            return Promise.resolve(JSON.stringify(FAKE_CONFIG2));
          case '/some/fake/directory/foo/bar/FAKE_CONFIG3':
            return Promise.resolve(JSON.stringify(FAKE_CONFIG3));
          case '/some/fake/directory/tsconfig.json':
            return Promise.resolve(JSON.stringify(FAKE_CONFIG1));
          default:
            return Promise.reject('File Not Found');
        }
      }
      const contents = await getTSConfig(FAKE_DIRECTORY, fakeReadFilep);
      t.deepEqual(contents, combinedConfig);
    });

// TODO: test errors in readFile, JSON.parse.
 
