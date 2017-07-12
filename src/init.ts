import * as cp from 'child_process';
import * as fs from 'fs';
import * as inquirer from 'inquirer';
import * as path from 'path';
import * as pify from 'pify';
import {Options} from './cli';

const readJson = pify(require('read-package-json'));
const read = pify(fs.readFile);
const write = pify(require('write-file-atomic'));

const gtsRootDir = path.join(__dirname, '../..');

interface Bag<T> {
  [script: string]: T;
}

function noop() {
  /* empty */
}

async function query(
    message: string, defaultVal: boolean, options: Options): Promise<boolean> {
  if (options.yes) {
    return true;
  }

  const answers = await inquirer.prompt(
      {type: 'confirm', name: 'query', message: message, default: defaultVal});
  return answers.query;
}

async function generatePackageJson(
    packageJson: any, options: Options): Promise<void> {
  let edits = false;
  const outDir = 'build/';
  const defaultSources = 'src/*.ts test/*.ts';
  const pkgDir = path.relative(options.targetRootDir, gtsRootDir);
  const scripts: Bag<string> = {
    build: 'npm run compile',
    clean: 'rm -rf ./build/',
    compile: `tsc -p . --rootDir . --outDir ${outDir}`,
    // TODO(ofrobots): use a clang-format wrapper so that it can use the files,
    // include, and exclude sections from tsconfig.json.
    format:
        `clang-format -i -style="{Language: JavaScript, BasedOnStyle: Google,` +
        ` ColumnLimit: 80}" ${defaultSources}`,
    lint: `tslint -c ${path.join(pkgDir, 'tslint.json')} -p . -t codeFrame ` +
        `--type-check`
  };

  if (!packageJson.scripts) {
    packageJson.scripts = {};
  }

  for (const script of Object.keys(scripts)) {
    let install = true;
    const existing = packageJson.scripts[script];
    const target = scripts[script];

    if (existing !== target) {
      if (existing) {
        const message = `package.json already has a script for '${script}' ` +
            `with contents:\n\t${existing}\nOverwrite with\n\t${target}\n?`;
        install = await query(message, false, options);
      }

      if (install) {
        packageJson.scripts[script] = scripts[script];
        edits = true;
      }
    }
  }

  // Install dev-dependencies.
  const deps: Bag<string> = {
    'google-ts-style': 'latest',
    'clang-format': '^1.0.53',
    'typescript': '^2.4.1',
    'tslint': '^5.5.0'
  };

  if (!packageJson.devDependencies) {
    packageJson.devDependencies = {};
  }

  for (const dep of Object.keys(deps)) {
    let install = true;
    const existing = packageJson.devDependencies[dep];
    const target = deps[dep];

    if (existing !== target) {
      if (existing) {
        const message = `Already have devDependency on ${dep}@${existing}.` +
            `Overwrite with ${dep}@${target}?`;
        install = await query(message, false, options);
      }

      if (install) {
        packageJson.devDependencies[dep] = deps[dep];
        edits = true;
      }
    }
  }

  if (!edits) {
    console.log('No edits needed in package.json.');
    return;
  }

  console.log('Writing package.json...');
  try {
    await write('./package.json', JSON.stringify(packageJson, null, '  '));
  } catch (err) {
    throw err;
  }
  const preview = {
    scripts: packageJson.scripts,
    devDependencies: packageJson.devDependencies
  };
  console.dir(preview);
}

async function generateTsConfig(options: Options): Promise<void> {
  let existing;
  try {
    existing = await read('./tsconfig.json', 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      /* not found, create it. */
    } else {
      throw new Error(`Unknown error reading tsconfig.json: ${err.message}`);
    }
  }

  const pkgDir = path.relative(options.targetRootDir, gtsRootDir);
  const tsconfig = JSON.stringify(
      {
        extends: `${path.join(pkgDir, 'tsconfig-google.json')}`,
        include: ['src/*.ts', 'src/**/*.ts', 'test/*.ts', 'test/**/*.ts'],
        exclude: ['node_modules']
      },
      null, '  ');

  let writeTsConfig = true;
  if (existing && existing === tsconfig) {
    console.log('No edits needed in tsconfig.json.');
    return;
  } else if (existing) {
    writeTsConfig = await query(
        `'tsconfig.json' already exists. Overwrite?`, false, options);
  }

  if (writeTsConfig) {
    console.log('Writing tsconfig.json...');
    try {
      await write('./tsconfig.json', tsconfig);
    } catch (err) {
      throw err;
    }
    console.dir(JSON.parse(tsconfig));
  }
}

export async function init(options: Options): Promise<void> {
  let packageJson;
  try {
    packageJson = await readJson('./package.json', noop, true /*strict*/);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw new Error(`Unable to open package.json file: ${err.message}`);
    }
    const generate =
        await query(`package.json does not exist. Generate?`, true, options);

    if (generate) {
      try {
        cp.spawnSync('npm', ['init', '-y']);
        packageJson = await readJson('./package.json', noop, true /* strict */);
      } catch (err2) {
        throw err2;
      }
    }
  }

  if (packageJson) {
    await generatePackageJson(packageJson, options);
    await generateTsConfig(options);
  }
}
