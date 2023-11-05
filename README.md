[![npm version](https://badge.fury.io/js/scope-tags.svg)](https://badge.fury.io/js/scope-tags)

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
    - [ ] Add support for multiple tsconfig.json's
- [ ] `.scope` metadata initialization
- [ ] Basic command line interface
- [ ] Basic file to module mapping

### Nice to have

- [ ] If eslint available, compare changed files before and after linting. Then, ommit files which only have these changes from scope report.
- [ ] Github workflows with tests

### To be discussed

- [ ] Testing approach - how each functionality should be tested?
    - Is creating a separate test git repository for each test a good idea? (too much hustle)

### Architecture diagram

![Alt text](img/architecture.png)