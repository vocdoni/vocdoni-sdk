# Vocdoni SDK Docs

Here you can generate the Vocdoni SDK documentation from the JSDocs annotations on the source code. It uses the package
[`jsdoc-to-mdx`](https://github.com/naver/jsdoc-to-mdx) that untherneath uses the well known `jsdoc-to-markdown` library.

This library export the JSDocs to `.mdx` format, which is compatible with docusaurus instances. 

### How to generate the docs

Run:

```bash
yarn
```

Then you can just run the npm script:

```bash
yarn build
```

This will generate a `temp_docs` folder with all generated documentation. It also copies de `../README.md` into 
`temp_docs/sdk.md` to use it as docusaurus main page.