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
{
    "buildTag": "build-123",
    "commitsAndIssues": [
        {
            "hash": "commit hash in long format",
            "issue": "JIRA-KEY"
        },
        {
            "hash": "commit hash in long format",
            "issue": "JIRA-KEY"
        }
        ...
    ]
}
```

## config.json

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
> To use multiple files use a file name with `{x}` specifying current import map chunk.

- Option `gitCommitCountLimit` is a maximum number of commits to search for when doing rev walk on git push hook - used just on the user side while running commands `--verify-unpushed-commits` or `--skip`. It this number is reached you'll get a warning and ignoring it may result in some files being ommited from tag verification.

- Option `logsURL` is used to link to logs directly from generated reports - makes it easier to see all changes which were made to that build. It is optional, if not present the link won't be added to reports. The URL should contain build tag (`"buildTag"` specified in build metadata file) somewhere.

```
    "logsURL"
```

### Local development

1. Clone this repository
2. Run `npm install` (preffered Node/NPM version: v12.16.3 / 6.14.4)
3. Run `npm link`
4. Use the local version of the script using `scope` (without the `npx prefix`) (if it doesn't work - restart the terminal)
5. `npx scope` runs version installed in the current repository (as a dependency), `scope` runs locally builded version

### Features to do

- [x] Import `ts-morph` library
    - [x] Test if it reads the project data correctly
    - [x] Find relative tsconfig.json
    - [x] Add support for multiple tsconfig.json's
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
    - [x] Add report to task (build integration)
- [x] Custom import map for `.yaml` files
    - [x] Read external import map if configured
    - [x] Test if it correctly identifies imported yaml file
- [x] Some kind of debugging options:
    - [x] --see -> to be able to see which files are 

### Assertions to add

- [ ] On loading `tags.json` assert that all parents exist in database, if not then these modules won't be displayed

### Nice to have

- [-] Use [spinner](https://www.npmjs.com/package/ora) while waiting for async operations (opening repo, ast analysis) - probably not needed because wait time is short
- [x] Github workflows with tests
- [-] If eslint available, compare changed files before and after linting. Then, ommit files which only have these changes from scope report - won't be needed because of git option to discard whitespaces and empty lines
- [x] Changes severity using [survey prompt](https://github.com/enquirer/enquirer#scale-prompt)? Severity based on git diffs? - Added change `relevancy`
- [ ] Add keyboard shortcut hints when selecting tags and files -> https://github.com/enquirer/enquirer#select-choices
- [ ] Add groups on select prompt:
    - [ ] Group files based on common path (files from same directory sould be grouped)
    - [ ] Group tags based on parent modules
- [ ] Add remove hanging tags option to tag manager - search for tags not assigned to any module and ask the user if they want to delete them
- [ ] Unit tests for common actions:
    - [ ] Testing if files are correstly updated in database depending on changes in git
- [ ] Add [np package](https://www.npmjs.com/package/np) to handle publishing to npm - giga optional

### To be discussed

- [ ] Testing approach - how each functionality should be tested?
- [ ] What actions can be performed on files?
    - Adding

### Architecture diagram

![Alt text](img/architecture.png)