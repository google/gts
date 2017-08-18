# gts - Google TypeScript style

[![NPM Version][npm-image]][npm-url]
[![Build Status][travis-image]][travis-url]
[![Dependency Status][david-image]][david-url]
[![devDependency Status][david-dev-image]][david-dev-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]

> ***NOTE: This repo is a work-in-progress and is not ready for general use just yet. This is not an official Google product.***

This repository is Google's default TypeScript configuration. Made with ❤️ by the Google Node.js team.

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

# How this works
- Adds a `tsconfig.json` file to your project that uses the Google TS Style.
- Adds the necessary devDependencies to your `package.json`.
- Adds scripts to your `package.json`:
  - `check`: Lints and checks for formatting problems.
  - `fix`: Automatically fixes formatting and linting problems (if possible).
  - `clean`: Removes output files.
  - `compile`: Compiles the source code using TypeScript compiler.
  - `pretest`, `posttest` and `prepare`: convenience integrations.

# License
See [LICENSE.md](LICENSE.md)

[npm-image]: https://img.shields.io/npm/v/gts.svg
[npm-url]: https://npmjs.org/package/gts
[travis-image]: https://travis-ci.org/google/ts-style.svg?branch=master
[travis-url]: https://travis-ci.org/google/ts-style
[david-image]: https://david-dm.org/google/ts-style.svg
[david-url]: https://david-dm.org/google/ts-style
[david-dev-image]: https://david-dm.org/google/ts-style/dev-status.svg
[david-dev-url]: https://david-dm.org/google/ts-style?type=dev
[snyk-image]: https://snyk.io/test/github/google/ts-style/badge.svg
[snyk-url]: https://snyk.io/test/github/google/ts-style
