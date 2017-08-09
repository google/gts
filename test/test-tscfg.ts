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

test('get should open the correct tsconfig file', async t => {
  await TSConfig.get(FAKE_DIRECTORY, {
    readFile: (configPath: string, encoding: string) => {
      t.is(configPath, path.join(FAKE_DIRECTORY, 'tsconfig.json'));
      t.is(encoding, 'utf8');
      return fakeReadFile(configPath, encoding);
    }
  });
});
