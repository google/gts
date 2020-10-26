/**
 * Copyright 2018 Google LLC.
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

import * as sinon from 'sinon';
import * as cp from 'child_process';
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import {accessSync} from 'fs';
import {PackageJson} from '@npm/types';
import {withFixtures, Fixtures} from 'inline-fixtures';
import {describe, it, beforeEach, afterEach} from 'mocha';

import {nop, readJsonp as readJson, DefaultPackage} from '../src/util';
import {Options} from '../src/cli';
import * as init from '../src/init';

const OPTIONS: Options = {
  gtsRootDir: path.resolve(__dirname, '../..'),
  targetRootDir: './',
  dryRun: false,
  yes: false,
  no: false,
  logger: {log: nop, error: nop, dir: nop},
};
const OPTIONS_YES = Object.assign({}, OPTIONS, {yes: true});
const OPTIONS_NO = Object.assign({}, OPTIONS, {no: true});
const OPTIONS_YARN = Object.assign({}, OPTIONS_YES, {yarn: true});
const MINIMAL_PACKAGE_JSON = {name: 'name', version: 'v1.1.1'};

function hasExpectedScripts(packageJson: PackageJson): boolean {
  return (
    !!packageJson.scripts &&
    ['lint', 'clean', 'compile', 'fix', 'prepare', 'pretest', 'posttest'].every(
      s => !!packageJson.scripts![s]
    )
  );
}

function hasExpectedDependencies(packageJson: PackageJson): boolean {
  return (
    !!packageJson.devDependencies &&
    ['gts', 'typescript'].every(d => !!packageJson.devDependencies![d])
  );
}

describe('init', () => {
  const sandbox = sinon.createSandbox();

  beforeEach(function () {
    this.spawnSyncStub = sandbox.stub(cp, 'spawnSync');
  });

  afterEach(function () {
    this.spawnSyncStub.restore();
  });

  it('addScripts should add a scripts section if none exists', async () => {
    const pkg: PackageJson = {...MINIMAL_PACKAGE_JSON};
    const result = await init.addScripts(pkg, OPTIONS);
    assert.strictEqual(result, true); // made edits.
    assert.ok(pkg.scripts);
    assert.strictEqual(hasExpectedScripts(pkg), true);
  });

  it('addScripts should not edit existing scripts on no', async () => {
    const SCRIPTS = {
      lint: 'fake lint',
      clean: 'fake clean',
      compile: 'fake tsc',
      fix: 'fake fix',
      prepare: 'fake run compile',
      pretest: 'fake run compile',
      posttest: 'fake run lint',
    };
    const pkg: PackageJson = {
      ...MINIMAL_PACKAGE_JSON,
      scripts: {...SCRIPTS},
    };
    const result = await init.addScripts(pkg, OPTIONS_NO);
    assert.strictEqual(result, false); // no edits.
    assert.deepStrictEqual(pkg.scripts, SCRIPTS);
  });

  it('addScripts should edit existing scripts on yes', async () => {
    const SCRIPTS = {
      lint: 'fake lint',
      clean: 'fake clean',
      compile: 'fake tsc',
      fix: 'fake fix',
      prepare: 'fake run compile',
      pretest: 'fake run compile',
      posttest: 'fake run lint',
    };
    const pkg: PackageJson = {
      ...MINIMAL_PACKAGE_JSON,
      scripts: {...SCRIPTS},
    };
    const result = await init.addScripts(pkg, OPTIONS_YES);
    assert.strictEqual(result, true); // made edits.
    assert.notDeepStrictEqual(pkg.scripts, SCRIPTS);
  });

  it('addDependencies should add a deps section if none exists', async () => {
    const pkg: PackageJson = {...MINIMAL_PACKAGE_JSON};
    const result = await init.addDependencies(pkg, OPTIONS);
    assert.strictEqual(result, true); // made edits.
    assert.ok(pkg.devDependencies);
  });

  it('addDependencies should not edit existing deps on no', async () => {
    const DEPS: DefaultPackage = {
      gts: 'something',
      typescript: 'or the other',
      '@types/node': 'or another',
    };
    const pkg: PackageJson = {
      ...MINIMAL_PACKAGE_JSON,
      devDependencies: {...DEPS},
    };
    const OPTIONS_NO = Object.assign({}, OPTIONS, {no: true});
    const result = await init.addDependencies(pkg, OPTIONS_NO);
    assert.strictEqual(result, false); // no edits.
    assert.deepStrictEqual(pkg.devDependencies, DEPS);
  });

  it('addDependencies should edit existing deps on yes', async () => {
    const DEPS = {gts: 'something', typescript: 'or the other'};
    const pkg: PackageJson = {
      ...MINIMAL_PACKAGE_JSON,
      devDependencies: {...DEPS},
    };
    const result = await init.addDependencies(pkg, OPTIONS_YES);
    assert.strictEqual(result, true); // made edits.
    assert.notDeepStrictEqual(pkg.devDependencies, DEPS);
  });

  // init
  it('init should read local package.json', () => {
    const originalContents = {some: 'property'};
    return withFixtures(
      {'package.json': JSON.stringify(originalContents)},
      async () => {
        const result = await init.init(OPTIONS_YES);
        assert.strictEqual(result, true);
        const contents = await readJson('./package.json');

        assert.notStrictEqual(
          contents,
          originalContents,
          'the file should have been modified'
        );
        assert.strictEqual(
          contents.some,
          originalContents.some,
          'unrelated property should have preserved'
        );
      }
    );
  });

  it('init should handle missing package.json', () => {
    return withFixtures({}, async () => {
      const result = await init.init(OPTIONS_YES);
      assert.strictEqual(result, true);
      const contents = await readJson('./package.json');
      assert.strictEqual(hasExpectedScripts(contents), true);
      assert.strictEqual(hasExpectedDependencies(contents), true);
    });
  });

  it('init should support yarn', () => {
    return withFixtures(
      {
        'package.json': JSON.stringify({name: 'test'}),
        'yarn.lock': '',
      },
      async () => {
        const result = await init.init(OPTIONS_YARN);
        assert.strictEqual(result, true);

        const contents = await readJson('./package.json');
        const cmd = process.platform === 'win32' ? 'yarn.cmd' : 'yarn';
        assert.strictEqual(contents.scripts.prepare, cmd + ' run compile');
      }
    );
  });

  it('should install a default template if the source directory do not exists', () => {
    return withFixtures({}, async dir => {
      const indexPath = path.join(dir, 'src', 'index.ts');
      await init.init(OPTIONS_YES);
      assert.doesNotThrow(() => {
        accessSync(indexPath);
      });
    });
  });

  it('should install template copy if src directory already exists and is empty', () => {
    const FIXTURES = {
      src: {},
    };
    return withFixtures(FIXTURES, async dir => {
      const dirPath = path.join(dir, 'src');
      const created = await init.installDefaultTemplate(OPTIONS_YES);
      assert.strictEqual(created, true);
      assert.doesNotThrow(() => {
        accessSync(path.join(dirPath, 'index.ts'));
      });
    });
  });

  it('should install template copy if src directory already exists and contains files other than ts', () => {
    const FIXTURES = {
      src: {
        'README.md': '# Read this',
      },
    };
    return withFixtures(FIXTURES, async dir => {
      const dirPath = path.join(dir, 'src');
      const created = await init.installDefaultTemplate(OPTIONS_YES);
      assert.strictEqual(created, true);
      assert.doesNotThrow(() => {
        // Both old and new files should exist.
        accessSync(path.join(dirPath, 'README.md'));
        accessSync(path.join(dirPath, 'index.ts'));
      });
    });
  });

  it('should copy the template with correct contents', () => {
    const FIXTURES = {
      src: {},
    };
    return withFixtures(FIXTURES, async dir => {
      const destDir = path.join(dir, 'src');
      const created = await init.installDefaultTemplate(OPTIONS_YES);
      assert.strictEqual(created, true);

      // make sure the target directory exists.
      accessSync(destDir);

      // make sure the copied file exists and has the same content.
      const srcFilename = path.join(__dirname, '../template/index.ts');
      const destFilename = path.join(destDir, 'index.ts');
      const content = fs.readFileSync(destFilename, 'utf8');
      assert.strictEqual(content, fs.readFileSync(srcFilename, 'utf8'));
    });
  });

  it('should not install the default template if the source directory already exists and does contain ts files', () => {
    const EXISTING = 'src';
    const FIXTURES: Fixtures = {
      [EXISTING]: {
        'main.ts': '42;',
      },
    };
    return withFixtures(FIXTURES, async dir => {
      const newPath = path.join(dir, 'src');
      const created = await init.installDefaultTemplate(OPTIONS_YES);
      assert.strictEqual(created, false);
      assert.doesNotThrow(() => {
        accessSync(newPath);
      });
    });
  });
});
