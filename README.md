# gts - Google TypeScript style

[![NPM Version][npm-image]][npm-url]
[![CircleCI][circle-image]][circle-url]
[![Dependency Status][david-image]][david-url]
[![devDependency Status][david-dev-image]][david-dev-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![codecov][codecov-image]][codecov-url]

[gts][npm-url] is Google's TypeScript style guide, and the configuration for our formatter, linter, and automatic code fixer. No lint rules to edit, no configuration to update, no more bike shedding over syntax. To borrow from [standardjs][standardjs-url]:

- **No configuration**. The easiest way to enforce consistent style in your project. Just drop it in.
- **Automatically format code**. Just run `gts fix` and say goodbye to messy or inconsistent code.
- **Catch style issues & programmer errors early**. Save precious code review time by eliminating back-and-forth between reviewer & contributor.
- **Opinionated, but not to a fault**. We recommend you use the default configuration, but if you *need* to customize compiler or linter config, you can.

Under the covers, we use [tslint][tslint-url] to enforce the style guide and provide automated fixes, and [clang-format][clang-format-url] to re-format code.

Made with ❤️ by the Google Node.js team.

# Getting Started

If you're already using npm@5.3+ (bundled with Node 8.3+), run:
```sh
npx gts init
```

Still on an older version of npm? We got ya! In a directory with your `package.json` run:

```sh
npm install --save-dev gts typescript@2.x
$(npm bin)/gts init
```

# How it works
When you run the `npx gts init` command, it's going to do a few things for you:
- Adds an opinionated `tsconfig.json` file to your project that uses the Google TypeScript Style.
- Adds the necessary devDependencies to your `package.json`.
- Adds scripts to your `package.json`:
  - `check`: Lints and checks for formatting problems.
  - `fix`: Automatically fixes formatting and linting problems (if possible).
  - `clean`: Removes output files.
  - `compile`: Compiles the source code using TypeScript compiler.
  - `pretest`, `posttest` and `prepare`: convenience integrations.

## Individual files
The commands above will all run in the scope of the current folder.  Some commands can be run on individual files:

```js
$ gts check index.ts
$ gts check one.ts two.ts three.ts
$ gts check *.ts
```

# License
See [LICENSE.md](LICENSE.md)

> ***NOTE: This is not an official Google product.***

[circle-image]: https://circleci.com/gh/google/ts-style.svg?style=svg
[circle-url]: https://circleci.com/gh/google/ts-style
[clang-format-url]: https://github.com/angular/clang-format
[codecov-image]: https://codecov.io/gh/google/ts-style/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/google/ts-style
[david-dev-image]: https://david-dm.org/google/ts-style/dev-status.svg
[david-dev-url]: https://david-dm.org/google/ts-style?type=dev
[david-image]: https://david-dm.org/google/ts-style.svg
[david-url]: https://david-dm.org/google/ts-style
[npm-image]: https://img.shields.io/npm/v/gts.svg
[npm-url]: https://npmjs.org/package/gts
[snyk-image]: https://snyk.io/test/github/google/ts-style/badge.svg
[snyk-url]: https://snyk.io/test/github/google/ts-style
[standardjs-url]: https://www.npmjs.com/package/standard
[tslint-url]: https://palantir.github.io/tslint/

