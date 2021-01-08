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

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

import {clean} from '../src/clean';
import {nop} from '../src/util';

import {withFixtures} from 'inline-fixtures';
import {describe, it} from 'mocha';

describe('clean', () => {
  const OPTIONS = {
    gtsRootDir: path.resolve(__dirname, '../..'),
    targetRootDir: './',
    dryRun: false,
    yes: false,
    no: false,
    logger: {log: nop, error: nop, dir: nop},
  };

  it('should gracefully error if tsconfig is missing', () => {
    return assert.rejects(() =>
      withFixtures({}, async () => {
        await clean(OPTIONS);
      })
    );
  });

  it('should gracefully error if tsconfig does not have valid outDir', () => {
    return withFixtures({'tsconfig.json': JSON.stringify({})}, async () => {
      const deleted = await clean(OPTIONS);
      assert.strictEqual(deleted, false);
    });
  });

  it('should gracefully handle JSON with comments', () => {
    const invalidJson = `
    {
      // hah, comments in JSON, what a world
      compilerOptions: {outDir: '.'}
    }`;
    return withFixtures({'tsconfig.json': invalidJson}, async () => {
      await clean(OPTIONS);
    });
  });

  it('should gracefully error if tsconfig has invalid JSON', () => {
    const invalidJson = "silly bear, this isn't JSON!";
    return withFixtures({'tsconfig.json': invalidJson}, async () => {
      await assert.rejects(clean(OPTIONS), /Unable to parse/);
    });
  });

  it('should avoid deleting .', () => {
    return withFixtures(
      {'tsconfig.json': JSON.stringify({compilerOptions: {outDir: '.'}})},
      async () => {
        const deleted = await clean(OPTIONS);
        assert.strictEqual(deleted, false);
      }
    );
  });

  it('should ensure that outDir is local to targetRoot', () => {
    return assert.rejects(() =>
      withFixtures(
        {
          'tsconfig.json': JSON.stringify({
            compilerOptions: {outDir: '../out'},
          }),
        },
        async () => {
          const deleted = await clean(OPTIONS);
          assert.strictEqual(deleted, false);
        }
      )
    );
  });

  it('should remove outDir', () => {
    const OUT = 'outputDirectory';
    return withFixtures(
      {
        'tsconfig.json': JSON.stringify({compilerOptions: {outDir: OUT}}),
        [OUT]: {},
      },
      async dir => {
        const outputPath = path.join(dir, OUT);
        // make sure the output directory exists.
        fs.accessSync(outputPath);
        const deleted = await clean(OPTIONS);
        assert.strictEqual(deleted, true);
        // make sure the directory has been deleted.
        assert.throws(() => {
          fs.accessSync(outputPath);
        });
      }
    );
  });
});
