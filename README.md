[![npm version](https://badge.fury.io/js/scope-tags.svg)](https://badge.fury.io/js/scope-tags)

### How to install

From the repository you want to test the package run

```
npm i scope-tags -D
```

### How to verify the package before release

From the repository you want to test the package run
```
npm link <path to local clone of this repository>
```

### Features to do

- [ ] Import and configure `ts-morph` library
- [ ] Basic command line interface
- [ ] Basic file to module mapping

### Nice to have

- [ ] If eslint available, compare changed files before and after linting. Then, ommit files which only have these changes from scope report.
- [ ] Github workflows with tests

### Architecture diagram

![Alt text](img/architecture.png)