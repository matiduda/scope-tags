[![npm version](https://badge.fury.io/js/scope-tags.svg)](https://badge.fury.io/js/scope-tags)
![unit tests](https://github.com/matiduda/scope-tags/actions/workflows/run-unit-tests.yml/badge.svg)

### How to install

From the repository you want to test the package run

```
npm i scope-tags -D
```

### Configuration

- Option `--report-for-commit-list` is used to update Jira issues, and requires additional metadata in this format:

```
[
        {
            "hash": "commit hash in long format",
            "issue": "JIRA-KEY"
        },
        {
            "hash": "commit hash in long format",
            "issue": "JIRA-KEY"
        }
]
```

- Option `projects.externalImportMap` requires additional metadata in this format:

```
[
    {
        "file": "/path/to/file",
        "imports": [
            "path/to/imported/file"
        ]
    }
]
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
        - [x] Basic command line interface and tag management:
            - [x] Reading `tags.json`
            - [x] Adding, deleting, updating tags
        - [x] Basic file to module mapping
        - [x] Tags should have (possibly nested) categories
        - [x] Instead of git notes, which are not shared by default, we should check commit based on if any of the files is not present in database
        - [x] Add scope report generation
            - [x] Get fileData for affected files
            - [x] Get tags for affected files
            - [x] Create report with affected modules
            - [ ] Add report to task (build integration)
        - [ ] Add [np package](https://www.npmjs.com/package/np) to handle publishing to npm
        - [x] Wywalić build tag bo jest zbędny

### Assertions to add




- [ ] On loading `tags.json` assert that all parents exist in database, if not then these modules won't be displayed

### Nice to have

- [x] Use [spinner](https://www.npmjs.com/package/ora) while waiting for async operations (opening repo, ast analysis) - probably not needed because wait time is short
- [ ] If eslint available, compare changed files before and after linting. Then, ommit files which only have these changes from scope report.
- [ ] Github workflows with tests
- [ ] Changes severity using [survey prompt](https://github.com/enquirer/enquirer#scale-prompt)? Severity based on git diffs?
- [ ] Add keyboard shortcut hints when selecting tags and files -> https://github.com/enquirer/enquirer#select-choices
- [ ] Add groups on select prompt:
    - [ ] Group files based on common path (files from same directory sould be grouped)
    - [ ] Group tags based on parent modules

### To be discussed

- [ ] Testing approach - how each functionality should be tested?
    - Is creating a separate test git repository for each test a good idea? (too much hustle)
- [ ] What actions can be performed on files?
    - Adding 

### Architecture diagram

![Alt text](img/architecture.png)