# Vocdoni SDK Docs

Here you can generate the Vocdoni SDK documentation directly from the code using TypeDoc. It uses the package [typedoc-plugin-markdown](https://www.npmjs.com/package/typedoc-plugin-markdown) to generate markdown files.

This library exports the TypeDoc to `.md` format, which is compatible with docusaurus instances. 

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
`temp_docs/README.md` to use it as docusaurus main page.