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
import * as path from 'path';
import { accessSync, PathLike, readFileSync } from 'fs';

import {
  ConfigFile,
  getTSConfig,
  isYarnUsed,
  createSrcDir,
  copyTemplate,
  getPkgManagerCommand,
} from '../src/util';

import { withFixtures, Fixtures } from 'inline-fixtures';

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

async function srcDirCheck(path: string, expected = true) {
  const created = await createSrcDir(path);
  assert.strictEqual(created, expected);
  assert.doesNotThrow(() => {
    accessSync(path);
  });
}
const FAKE_DIRECTORY = '/some/fake/directory';
const PATH_TO_TSCONFIG = path.resolve(FAKE_DIRECTORY, 'tsconfig.json');
const PATH_TO_CONFIG2 = path.resolve(FAKE_DIRECTORY, 'FAKE_CONFIG2');
const PATH_TO_CONFIG3 = path.resolve(FAKE_DIRECTORY, 'FAKE_CONFIG3');

describe('util', () => {
  it('get should parse the correct tsconfig file', async () => {
    const FAKE_CONFIG1 = { files: ['b'] };

    function fakeReadFilep(
      configPath: string,
      encoding: string
    ): Promise<string> {
      assert.strictEqual(configPath, PATH_TO_TSCONFIG);
      assert.strictEqual(encoding, 'utf8');
      return Promise.resolve(JSON.stringify(FAKE_CONFIG1));
    }
    const contents = await getTSConfig(FAKE_DIRECTORY, fakeReadFilep);

    assert.deepStrictEqual(contents, FAKE_CONFIG1);
  });

  it('should throw an error if it finds a circular reference', () => {
    const FAKE_CONFIG1 = { files: ['b'], extends: 'FAKE_CONFIG2' };
    const FAKE_CONFIG2 = { extends: 'FAKE_CONFIG3' };
    const FAKE_CONFIG3 = { extends: 'tsconfig.json' };
    const myMap = new Map();
    myMap.set(PATH_TO_TSCONFIG, FAKE_CONFIG1);
    myMap.set(PATH_TO_CONFIG2, FAKE_CONFIG2);
    myMap.set(PATH_TO_CONFIG3, FAKE_CONFIG3);

    return assert.rejects(
      () => getTSConfig(FAKE_DIRECTORY, createFakeReadFilep(myMap)),
      Error,
      'Circular Reference Detected'
    );
  });

  it('should follow dependency chain caused by extends files', async () => {
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
    myMap.set(PATH_TO_TSCONFIG, FAKE_CONFIG1);
    myMap.set(PATH_TO_CONFIG2, FAKE_CONFIG2);
    myMap.set(PATH_TO_CONFIG3, FAKE_CONFIG3);

    const contents = await getTSConfig(
      FAKE_DIRECTORY,
      createFakeReadFilep(myMap)
    );
    assert.deepStrictEqual(contents, combinedConfig);
  });

  it('when a file contains an extends field, the base file is loaded first then overridden by the inherited files', async () => {
    const FAKE_CONFIG1 = { files: ['b'], extends: 'FAKE_CONFIG2' };
    const FAKE_CONFIG2 = { files: ['c'], extends: 'FAKE_CONFIG3' };
    const FAKE_CONFIG3 = { files: ['d'] };
    const combinedConfig = { compilerOptions: {}, files: ['b'] };
    const myMap = new Map();
    myMap.set(PATH_TO_TSCONFIG, FAKE_CONFIG1);
    myMap.set(PATH_TO_CONFIG2, FAKE_CONFIG2);
    myMap.set(PATH_TO_CONFIG3, FAKE_CONFIG3);

    const contents = await getTSConfig(
      FAKE_DIRECTORY,
      createFakeReadFilep(myMap)
    );
    assert.deepStrictEqual(contents, combinedConfig);
  });

  it('when reading a file, all filepaths should be relative to the config file currently being read', async () => {
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
    myMap.set(PATH_TO_TSCONFIG, FAKE_CONFIG1);
    myMap.set(path.resolve(FAKE_DIRECTORY, './foo/FAKE_CONFIG2'), FAKE_CONFIG2);
    myMap.set(
      path.resolve(FAKE_DIRECTORY, './foo/bar/FAKE_CONFIG3'),
      FAKE_CONFIG3
    );

    const contents = await getTSConfig(
      FAKE_DIRECTORY,
      createFakeReadFilep(myMap)
    );
    assert.deepStrictEqual(contents, combinedConfig);
  });

  it('function throws an error when reading a file that does not exist', () => {
    const myMap = new Map();

    return assert.rejects(
      () => getTSConfig(FAKE_DIRECTORY, createFakeReadFilep(myMap)),
      Error,
      `${FAKE_DIRECTORY}/tsconfig.json Not Found`
    );
  });

  it("isYarnUsed returns true if there's yarn.lock file only", () => {
    const existsSync = makeFakeFsExistsSync(['yarn.lock']);
    assert.strictEqual(isYarnUsed(existsSync), true);
  });

  it("isYarnUsed returns false if there's package-lock.json file only", () => {
    const existsSync = makeFakeFsExistsSync(['package-lock.json']);
    assert.strictEqual(isYarnUsed(existsSync), false);
  });

  it("isYarnUsed returns false if there're yarn.lock and package-lock.json files", () => {
    const existsSync = makeFakeFsExistsSync(['package-lock.json', 'yarn.lock']);
    assert.strictEqual(isYarnUsed(existsSync), false);
  });

  const npmCmd = process.platform !== 'win32' ? 'npm' : 'npm.cmd';
  const yarnCmd = process.platform !== 'win32' ? 'yarn' : 'yarn.cmd';
  it('getPkgManagerCommand returns npm by default', () => {
    assert.strictEqual(getPkgManagerCommand(), npmCmd);
    assert.strictEqual(getPkgManagerCommand(), getPkgManagerCommand(false));
  });

  it('getPkgManagerCommand returns yarn', () => {
    assert.strictEqual(getPkgManagerCommand(true), yarnCmd);
  });

  it('should copy the template', () => {
    const SOURCE = 'sourceDirectory';
    const DEST = 'destDirectory';
    const WRONG = 'wrongDirectory';
    const FIXTURES = {
      [SOURCE]: {
        'index.ts': '42;',
      },
    };
    return withFixtures(FIXTURES, async dir => {
      const sourcePath = path.join(dir, SOURCE);
      const destPath = path.join(dir, DEST);
      const wrongPath = path.join(dir, WRONG);

      // make sure the source directory exists.
      accessSync(sourcePath);
      const copied = await copyTemplate(sourcePath, destPath);
      assert.strictEqual(copied, true);

      // make sure the target directory exists.
      accessSync(destPath);

      // make sure the copied file exists and has the same content.
      const destFilename = path.join(destPath, 'index.ts');
      const content = readFileSync(destFilename, 'utf8');
      const same: string = FIXTURES[SOURCE]['index.ts'];
      assert.strictEqual(content, same);

      // make sure return false if can't copy.
      const wrongResult = await copyTemplate(wrongPath, destPath);
      assert.strictEqual(wrongResult, false);
    });
  });

  it('should create the source directory if not existing', () => {
    const NOTEXISTING = 'newDirectory';
    return withFixtures({}, async dir => {
      const newPath = path.join(dir, NOTEXISTING);
      await srcDirCheck(newPath);
    });
  });

  it('should allow template copy if src directory already exists and is empty', () => {
    const EMPTY = 'emptyDirectory';
    const FIXTURES = {
      [EMPTY]: {},
    };
    return withFixtures(FIXTURES, async dir => {
      const dirPath = path.join(dir, EMPTY);
      await srcDirCheck(dirPath);
    });
  });

  it('should allow template copy if src directory already exists and contains files other than ts', () => {
    const EXISTING = 'sourceDirectory';
    const FIXTURES = {
      [EXISTING]: {
        'README.md': '# Read this',
      },
    };
    return withFixtures(FIXTURES, async dir => {
      const dirPath = path.join(dir, EXISTING);
      await srcDirCheck(dirPath);
    });
  });

  it('should not allow template copy if src directory already exists and contains ts files ', () => {
    const EXISTING = 'sourceDirectory';
    const FIXTURES = {
      [EXISTING]: {
        'index.ts': '42;',
      },
    };
    return withFixtures(FIXTURES, async dir => {
      const dirPath = path.join(dir, EXISTING);
      await srcDirCheck(dirPath, false);
    });
  });

  it('should not allow template copy if src directory is not accessible', () => {
    const FIXTURES = {
      private: {
        mode: 0o000,
        content: {
          'README.md': 'Hello World.',
        },
      },
    };
    return withFixtures(FIXTURES, async dir => {
      const dirPath = path.join(dir, 'private', 'newDirectory');
      const created = await createSrcDir(dirPath);
      assert.strictEqual(created, false);
      assert.throws(() => {
        accessSync(dirPath);
      });
    });
  });

  // TODO: test errors in readFile, JSON.parse.
});
