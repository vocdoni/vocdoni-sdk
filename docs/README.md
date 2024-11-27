# Vocdoni SDK Docs

Here you can generate the Vocdoni SDK documentation directly from the code using TypeDoc. It uses the package [typedoc-plugin-markdown](https://www.npmjs.com/package/typedoc-plugin-markdown) to generate markdown files.

This library exports the TypeDoc to `.md` format, which is compatible with docusaurus instances. 

### How to generate the docs

Run:

```bash
cd docs
yarn
```

Then you can just run the npm script:

```bash
yarn build
```

This will generate a `temp_docs` folder with all generated documentation. It also copies the `../CHANGELOG.md` into 
`temp_docs/changelog.md` and creates a `README/md` to use as a table of contents.