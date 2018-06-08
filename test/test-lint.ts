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
import fs from 'fs';
import * as path from 'path';

import {Options} from '../src/cli';
import * as lint from '../src/lint';
import {nop} from '../src/util';

import {withFixtures} from './fixtures';

const OPTIONS: Options = {
  gtsRootDir: path.resolve(__dirname, '../..'),
  targetRootDir: './',
  dryRun: false,
  yes: false,
  no: false,
  logger: {log: nop, error: nop, dir: nop}
};

const BAD_CODE = `throw 'hello world';`;
const GOOD_CODE = `throw new Error('hello world');`;

// missing semicolon, array-type simple.
const FIXABLE_CODE = 'const x : Array<string> = []';
const FIXABLE_CODE_FIXED = 'const x : string[] = [];';

test.serial('createProgram should return an object', t => {
  return withFixtures({'tsconfig.json': '{}'}, async () => {
    const program = lint.createProgram(OPTIONS);
    t.truthy(program);
  });
});

test.serial('lint should return true on good code', t => {
  return withFixtures(
      {
        'tsconfig.json': JSON.stringify({files: ['a.ts']}),
        'a.ts': GOOD_CODE,
      },
      async () => {
        const okay = lint.lint(OPTIONS);
        t.is(okay, true);
      });
});

test.serial('lint should return false on bad code', t => {
  return withFixtures(
      {
        'tsconfig.json': JSON.stringify({files: ['a.ts']}),
        'a.ts': BAD_CODE,
      },
      async () => {
        const okay = lint.lint(OPTIONS);
        t.is(okay, false);
      });
});

test.serial('lint should auto fix fixable errors', t => {
  return withFixtures(
      {
        'tsconfig.json': JSON.stringify({files: ['a.ts']}),
        'a.ts': FIXABLE_CODE
      },
      async (fixturesDir) => {
        const okay = lint.lint(OPTIONS, [], true);
        t.is(okay, true);
        const contents =
            fs.readFileSync(path.join(fixturesDir, 'a.ts'), 'utf8');
        t.deepEqual(contents, FIXABLE_CODE_FIXED);
      });
});

test.serial('lint should not auto fix on dry-run', t => {
  return withFixtures(
      {
        'tsconfig.json': JSON.stringify({files: ['a.ts']}),
        'a.ts': FIXABLE_CODE
      },
      async (fixturesDir) => {
        const optionsWithDryRun = Object.assign({}, OPTIONS, {dryRun: true});
        const okay = lint.lint(optionsWithDryRun, [], true);
        t.is(okay, false);
        const contents =
            fs.readFileSync(path.join(fixturesDir, 'a.ts'), 'utf8');
        t.deepEqual(contents, FIXABLE_CODE);
      });
});

test.serial('lint should lint files listed in tsconfig.files', t => {
  return withFixtures(
      {
        'tsconfig.json': JSON.stringify({files: ['a.ts']}),
        'a.ts': GOOD_CODE,
        'b.ts': BAD_CODE
      },
      async () => {
        const okay = lint.lint(OPTIONS);
        t.is(okay, true);
      });
});

test.serial(
    'lint should lint *.ts files when no files or inlcude has been specified',
    async t => {
      return withFixtures(
          {
            'tsconfig.json': JSON.stringify({}),
            'a.ts': GOOD_CODE,
            'b.ts': BAD_CODE
          },
          async () => {
            const okay = lint.lint(OPTIONS);
            t.is(okay, false);
          });
    });

test.serial(
    'lint should lint files listed in tsconfig.files when empty list is provided',
    async t => {
      return withFixtures(
          {
            'tsconfig.json': JSON.stringify({files: ['a.ts']}),
            'a.ts': FIXABLE_CODE,
            'b.ts': BAD_CODE
          },
          async (fixturesDir) => {
            const okay = lint.lint(OPTIONS, [], true);
            t.is(okay, true);
            const contents =
                fs.readFileSync(path.join(fixturesDir, 'a.ts'), 'utf8');
            t.deepEqual(contents, FIXABLE_CODE_FIXED);
          });
    });


test.serial('lint should not lint files listed in exclude', t => {
  return withFixtures(
      {
        'tsconfig.json': JSON.stringify({exclude: ['b.*']}),
        'a.ts': GOOD_CODE,
        'b.ts': BAD_CODE
      },
      async () => {
        const okay = lint.lint(OPTIONS);
        t.is(okay, true);
      });
});

test.serial('lint should lint globs listed in include', t => {
  return withFixtures(
      {
        'tsconfig.json': JSON.stringify({include: ['dirb/*']}),
        dira: {'a.ts': GOOD_CODE},
        dirb: {'b.ts': BAD_CODE}
      },
      async () => {
        const okay = lint.lint(OPTIONS);
        t.is(okay, false);
      });
});

test.serial('lint should lint only specified files', t => {
  return withFixtures(
      {
        'tsconfig.json': JSON.stringify({}),
        dira: {'a.ts': GOOD_CODE},
        dirb: {'b.ts': BAD_CODE}
      },
      async () => {
        const aOkay = lint.lint(OPTIONS, ['dira/a.ts']);
        t.is(aOkay, true);
        const bOkay = lint.lint(OPTIONS, ['dirb/b.ts']);
        t.is(bOkay, false);
      });
});

test.serial('lint should throw for unrecognized files', t => {
  return withFixtures(
      {
        'tsconfig.json': JSON.stringify({}),
        'a.ts': GOOD_CODE,
      },
      async () => {
        t.throws(() => {
          lint.lint(OPTIONS, ['z.ts']);
        });
      });
});

test.serial('lint should prefer user config file over default', async t => {
  const CUSTOM_LINT_CODE = 'debugger;';

  // By defualt the above should fail lint.
  await withFixtures(
      {
        'tsconfig.json': JSON.stringify({files: ['a.ts']}),
        'a.ts': CUSTOM_LINT_CODE
      },
      async () => {
        const okay = lint.lint(OPTIONS);
        t.false(okay);
      });

  // User should be able to override the default config.
  return withFixtures(
      {
        'tsconfig.json': JSON.stringify({files: ['a.ts']}),
        'tslint.json': JSON.stringify({}),
        'a.ts': CUSTOM_LINT_CODE
      },
      async () => {
        const okay = lint.lint(OPTIONS);
        t.true(okay);
      });
});

test.serial('lint for specific files should use file-specific config', t => {
  const CODE_WITH_PARSEINT = 'parseInt(42);';
  let logBuffer = '';
  const optionsWithLog = Object.assign({}, OPTIONS, {
    logger: {
      log: (...args: string[]) => {
        logBuffer += (args.join(' '));
      },
      error: nop,
      dir: nop
    }
  });
  return withFixtures(
      {
        dira: {
          'a.ts': CODE_WITH_PARSEINT,
          // no tslint, so default should apply.
        },
        dirb: {'b.ts': CODE_WITH_PARSEINT, 'tslint.json': JSON.stringify({})}
      },
      async () => {
        const okay = lint.lint(optionsWithLog, ['dira/a.ts', 'dirb/b.ts']);
        t.false(okay);
        t.regex(logBuffer, /dira\/a\.ts/);
        t.notRegex(logBuffer, /dirb\/b\.ts/);
      });
});

// TODO: test for when tsconfig.json is missing.
