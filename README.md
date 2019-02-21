# standardts
[![NPM Version][npm-image]][npm-url]
[![CircleCI][circle-image]][circle-url]
[![Dependency Status][david-image]][david-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![codecov][codecov-image]][codecov-url]
[![TypeScript Style Guide][standardts-image]][standardts-url]

[standardts][npm-url] is Google's TypeScript style guide, and the configuration for our formatter, linter, and automatic code fixer. No lint rules to edit, no configuration to update, no more bike shedding over syntax.

To borrow from [standardjs][standardjs-url]:
- **No configuration**. The easiest way to enforce consistent style in your project. Just drop it in.
- **Automatically format code**. Just run `standardts fix` and say goodbye to messy or inconsistent code.
- **Catch style issues & programmer errors early**. Save precious code review time by eliminating back-and-forth between reviewer & contributor.
- **Opinionated, but not to a fault**. We recommend you use the default configuration, but if you *need* to customize compiler or linter config, you can.

Under the covers, we use [tslint][tslint-url] to enforce the style guide and provide automated fixes, and [prettier][prettier-url] to re-format code.

## Getting Started

The easiest way to get started is to run:

```sh
npx standardts init
```

## How it works
When you run the `npx standardts init` command, it's going to do a few things for you:
- Adds an opinionated `tsconfig.json` file to your project that uses the Google TypeScript Style.
- Adds the necessary devDependencies to your `package.json`.
- Adds scripts to your `package.json`:
  - `check`: Lints and checks for formatting problems.
  - `fix`: Automatically fixes formatting and linting problems (if possible).
  - `clean`: Removes output files.
  - `compile`: Compiles the source code using TypeScript compiler.
  - `pretest`, `posttest` and `prepare`: convenience integrations.

### Individual files
The commands above will all run in the scope of the current folder.  Some commands can be run on individual files:

```sh
standardts fix index.ts
standardts fix one.ts two.ts three.ts
standardts fix *.ts
```

## Badge
Show your love for standardts and include a badge!

[![Code Style: Google](https://img.shields.io/badge/code%20style-google-blueviolet.svg)](https://github.com/google/standardts)

```md
[![Code Style: Google](https://img.shields.io/badge/code%20style-google-blueviolet.svg)](https://github.com/google/standardts)
```

## License
See [LICENSE](LICENSE)

Made with ❤️ by the Google Node.js team.  Special thanks to [Chris Kaczor](https://github.com/krzkaczor) for the [standardts][npm-url] package name.

> ***NOTE: This is not an official Google product.***

[circle-image]: https://circleci.com/gh/google/standardts.svg?style=shield
[circle-url]: https://circleci.com/gh/google/standardts
[prettier-url]: https://prettier.io/
[codecov-image]: https://codecov.io/gh/google/standardts/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/google/standardts
[david-image]: https://david-dm.org/google/standardts.svg
[david-url]: https://david-dm.org/google/standardts
[npm-image]: https://img.shields.io/npm/v/standardts.svg
[npm-url]: https://npmjs.org/package/standardts
[snyk-image]: https://snyk.io/test/github/google/standardts/badge.svg
[snyk-url]: https://snyk.io/test/github/google/standardts
[standardjs-url]: https://www.npmjs.com/package/standard
[tslint-url]: https://palantir.github.io/tslint/
[standardts-image]: https://img.shields.io/badge/code%20style-google-blueviolet.svg
[standardts-url]: https://github.com/google/standardts
