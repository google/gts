# gts
> Google TypeScript Style

[![NPM Version][npm-image]][npm-url]
[![GitHub Actions][github-image]][github-url]
[![Dependency Status][david-image]][david-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![codecov][codecov-image]][codecov-url]
[![TypeScript Style Guide][gts-image]][gts-url]

[gts][npm-url] is Google's TypeScript style guide, and the configuration for our formatter, linter, and automatic code fixer. No lint rules to edit, no configuration to update, no more bike shedding over syntax.

To borrow from [standardjs][standardjs-url]:
- **No configuration**. The easiest way to enforce consistent style in your project. Just drop it in.
- **Automatically format code**. Just run `gts fix` and say goodbye to messy or inconsistent code.
- **Catch style issues & programmer errors early**. Save precious code review time by eliminating back-and-forth between reviewer & contributor.
- **Opinionated, but not to a fault**. We recommend you use the default configuration, but if you *need* to customize compiler or linter config, you can.

Under the covers, we use [eslint][eslint-url] to enforce the style guide and provide automated fixes, and [prettier][prettier-url] to re-format code.

## Getting Started

The easiest way to get started is to run:
```sh
npx gts init
```

## How it works
When you run the `npx gts init` command, it's going to do a few things for you:
- Adds an opinionated `tsconfig.json` file to your project that uses the Google TypeScript Style.
- Adds the necessary devDependencies to your `package.json`.
- Adds scripts to your `package.json`:
  - `lint`: Lints and checks for formatting problems.
  - `fix`: Automatically fixes formatting and linting problems (if possible).
  - `clean`: Removes output files.
  - `compile`: Compiles the source code using TypeScript compiler.
  - `pretest`, `posttest` and `prepare`: convenience integrations.
- If a source folder is not already present it will add a default template project.

### Individual files
The commands above will all run in the scope of the current folder.  Some commands can be run on individual files:

```sh
gts lint index.ts
gts lint one.ts two.ts three.ts
gts lint *.ts
```

### Working with eslint
Under the covers, we use [eslint][eslint-url] to enforce the style guide and provide automated fixes, and [prettier][prettier-url] to re-format code. To use the shared `eslint` configuration, create an `.eslintrc` in your project directory, and extend the shared config:

```yml
---
extends:
  - './node_modules/gts'
```

If you don't want to use the `gts` CLI, you can drop down to using the module as a basic `eslint` config, and just use the `eslint` cli:

```
$ eslint --fix
```

This opens the ability to use the vast `eslint` ecosystem including custom rules, and tools like the VSCode plugin for eslint:
- https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint


## Badge
Show your love for `gts` and include a badge!

[![Code Style: Google](https://img.shields.io/badge/code%20style-google-blueviolet.svg)](https://github.com/google/gts)

```md
[![Code Style: Google](https://img.shields.io/badge/code%20style-google-blueviolet.svg)](https://github.com/google/gts)
```

## Supported Node.js Versions
Our client libraries follow the [Node.js release schedule](https://nodejs.org/en/about/releases/). Libraries are compatible with all current _active_ and _maintenance_ versions of Node.js.

## License
[Apache-2.0](LICENSE)

---
Made with ❤️ by the Google Node.js team.

> ***NOTE: This is not an official Google product.***

[github-image]: https://github.com/google/gts/workflows/ci/badge.svg
[github-url]: https://github.com/google/gts/actions
[prettier-url]: https://prettier.io/
[codecov-image]: https://codecov.io/gh/google/gts/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/google/gts
[david-image]: https://david-dm.org/google/gts.svg
[david-url]: https://david-dm.org/google/gts
[gts-image]: https://img.shields.io/badge/code%20style-google-blueviolet.svg
[gts-url]: https://github.com/google/gts
[npm-image]: https://img.shields.io/npm/v/gts.svg
[npm-url]: https://npmjs.org/package/gts
[snyk-image]: https://snyk.io/test/github/google/gts/badge.svg
[snyk-url]: https://snyk.io/test/github/google/gts
[standardjs-url]: https://www.npmjs.com/package/standard
[eslint-url]: https://eslint.org/
