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

import {test, Test} from 'ava';
import * as fs from 'fs';
import makeDir from 'make-dir';
import * as path from 'path';
import pify from 'pify';
import * as tmp from 'tmp';

const writeFilep = pify(fs.writeFile);

export interface Fixtures {
  // If string, we create a file with that string contents. If fixture, we
  // create a subdirectory and recursively install the fixture.
  // TODO: support buffers to allow non-text files.
  [name: string]: string|Fixtures;
}

async function setupFixtures(dir: string, fixtures: Fixtures) {
  await makeDir(dir);
  const keys = Object.keys(fixtures);
  for (const key of keys) {
    const filePath = path.join(dir, key);
    if (typeof fixtures[key] === 'string') {
      const contents = fixtures[key] as string;
      await writeFilep(filePath, contents);
    } else {
      const fixture = fixtures[key] as Fixtures;
      await setupFixtures(filePath, fixture);
    }
  }
}

export async function withFixtures(
    fixtures: Fixtures, fn: (fixturesDir: string) => Promise<{}|void>) {
  const keep = !!process.env.GTS_KEEP_TEMPDIRS;
  const dir = tmp.dirSync({keep, unsafeCleanup: true});

  await setupFixtures(dir.name, fixtures);

  const origDir = process.cwd();
  process.chdir(dir.name);

  const result = await fn(dir.name);

  process.chdir(origDir);
  if (!keep) {
    dir.removeCallback();
  }

  return result;
}
