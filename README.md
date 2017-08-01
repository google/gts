# google-ts-style

> ***NOTE: This repo is a work-in-progress and is not ready for general use just yet. This is not an official Google product.***

This repository is Google's default TypeScript configuration. Made with ❤️ by the Google Node.js team.

# Getting Started

- If you're already using npm@5.3+ (bundled with Node 8.3+), run: 
  - `npx google-ts-style init`
- Still on an older version of npm? We got ya! In a directory with your `package.json` run:
  - `npm install --save-dev google-ts-style typescript@2.x tslint@5.x clang-format@1.x`
  - `$(npm bin)/gts --init`

# How this works
- Adds a `tsconfig.json` file to your project that inherits from the Google TS Style.
- Adds the necessary devDependencies to your package.json.
- Adds the `compile`, `format`, and `lint` scripts to your package.json.

# License
See [LICENSE.md](LICENSE.md)
