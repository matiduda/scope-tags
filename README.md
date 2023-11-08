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
    - [ ] Add tests for this ?
    - [x] Add support for multiple tsconfig.json's
- [x] `.scope` metadata initialization
- [ ] Basic command line interface and tag management:
    - [ ] Adding, deleting, updating tags
- [ ] Basic file to module mapping

### Nice to have

- [ ] If eslint available, compare changed files before and after linting. Then, ommit files which only have these changes from scope report.
- [ ] Github workflows with tests
- [ ] Changes severity using [survey prompt](https://github.com/enquirer/enquirer#scale-prompt)? Severity based on git diffs?

### To be discussed

- [ ] Testing approach - how each functionality should be tested?
    - Is creating a separate test git repository for each test a good idea? (too much hustle)
- [ ] What actions can be performed on files?
    - Adding 
### Architecture diagram

![Alt text](img/architecture.png)