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
  const FAKE_CONFIG = {a: 'b'};
  function fakeReadFilep(
      configPath: string, encoding: string): Promise<string> {
    t.is(configPath, path.join(FAKE_DIRECTORY, 'tsconfig.json'));
    t.is(encoding, 'utf8');
    return Promise.resolve(JSON.stringify(FAKE_CONFIG));
  }
  const contents = await getTSConfig(FAKE_DIRECTORY, fakeReadFilep);
  t.deepEqual(contents, FAKE_CONFIG);
});

// TODO: test errors in readFile, JSON.parse.
