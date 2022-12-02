# Vocdoni SDK Docs

Here you can generate the Vocdoni SDK documentation from the JSDocs annotations on the source code. It uses the package
[`jsdoc-to-mdx`](https://github.com/naver/jsdoc-to-mdx) that untherneath uses the well known `jsdoc-to-markdown` library.

This library export the JSDocs to `.mdx` format, which is compatible with docusaurus instances. 

### How to generate the docs

Run:

```bash
npm install
```

Or:

```bash
npm install --save-dev jsdoc-babel @babel/cli @babel/core @babel/preset-env @babel/preset-typescript jsdoc-to-markdown jsdoc-to-mdx
```

Then you can just run the npm script:

```bash
npm run build:docs:sdk
```

This will generate a `docs_sdk` folder with all generated documentation. It also copies de `../README.md` into 
`docs_sdk/sdk.md` to use it as docusaurus main page.