[![npm version](https://badge.fury.io/js/scope-tags.svg)](https://badge.fury.io/js/scope-tags)
![unit tests](https://github.com/matiduda/scope-tags/actions/workflows/run-unit-tests.yml/badge.svg)

### How to install

From the repository you want to test the package run

```
npm i scope-tags -D
```

### Features to do

- [x] Import `ts-morph` library
    - [x] Test if it reads the project data correctly
    - [x] Find relative tsconfig.json
    - [x] Add support for multiple tsconfig.json's
    - [ ] Add tests for this ?
- [x] `.scope` metadata initialization
    - [x] `tags.json`
    - [x] `database.json`
- [ ] Basic command line interface and tag management:
    - [ ] Reading `tags.json`
    - [ ] Adding, deleting, updating tags
- [x] Basic file to module mapping
- [ ] Tags should have (possibly nested) categories
- [ ] Add [np package](https://www.npmjs.com/package/np) to handle publishing to npm

### Assertions to add

- [ ] On loading `tags.json` assert that all parents exist in database, if not then these modules won't be displayed

### Nice to have

- [ ] If eslint available, compare changed files before and after linting. Then, ommit files which only have these changes from scope report.
- [ ] Github workflows with tests
- [ ] Changes severity using [survey prompt](https://github.com/enquirer/enquirer#scale-prompt)? Severity based on git diffs?
- [ ] Use [spinner](https://www.npmjs.com/package/ora) while waiting for async operations (opening repo, ast analysis)

### To be discussed

- [ ] Testing approach - how each functionality should be tested?
    - Is creating a separate test git repository for each test a good idea? (too much hustle)
- [ ] What actions can be performed on files?
    - Adding 
### Architecture diagram

![Alt text](img/architecture.png)