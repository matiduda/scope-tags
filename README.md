[![npm version](https://badge.fury.io/js/scope-tags.svg)](https://www.npmjs.com/package/scope-tags)
![Auto test and deploy](https://github.com/matiduda/scope-tags/actions/workflows/test-and-deploy-to-npm.yml/badge.svg)

> Currently in internal beta tests

# Scope Tags

Command line tool for doing [change impact analysis](https://en.wikipedia.org/wiki/Change_impact_analysis) in large TypeScript projects.
- Supports integration with JIRA using a local server (1 POST endpoint required).
- Generates detailed HTML logs with every commit details
- Commits can be *verified* (eg. by a git hook) to prevent those without saved metadata
- Can be configured by the user

### Architecture diagram

![Alt text](img/architecture.png)

### How to install

From the repository you want to test the package run

```
npm i scope-tags -D
```

Make sure your Git configuration has case-sensitivity enabled
```
git config --global core.ignorecase false
```

### How to run

From the repository you want to test the package run

```
npx scope
```
You can list available commands using
```
npx scope --help
```

### Configuration

Scope tags support some option configurable by the user. This enables you to modify the script behaviour and set some global data which is used by the report generator. Available options are:

- `projects: Object[]` - Array with project details in following format:

| Parameter name        | Type     | Description                                                                                                                            |
|-----------------------|----------|--------------------------------------------------------------------------------------------------                                      |
| name                  | string   | Name of the project                                                                                                                    |
| location              | string   | Path to the project `tsconfig.json` file                                                                                               |
| useExternalImportMap? | string   | Path to import map file which can be used to find references to other types than `.ts` or `.tsx` - see **Externral Import Map** below  |
| supportedFiles?       | string[] | Array of files supported by the external import map                                                                                    |

- `gitCommitCountLimit: number` - It is the maximum number of commits to search for when doing rev walk on git push hook - used just on the user side while running commands `--verify-unpushed-commits` or `--skip`. It this number is reached you'll get a warning and ignoring it may result in some files being ommited from tag verification.
- `updateIssueURL?: string` - URL used for the POST endpoint with generated report for JIRA issues
- `ignoredExtensions: string[]` - List of file extensions ignored by the script
- `viewIssueURL?: string` - URL used to link from generated HTML logs to Jira issues
- `logsURL?: string` - Location of the generated HTML logs while running  `--report-for-commit-list`. Used to link to logs directly from generated reports - makes it easier to see all changes which were made to that build. It is optional, if not present the link won't be added to reports. The URL should contain build tag (`"buildTag"` specified in build metadata file) somewhere.

- Option `--report-for-commit-list buildData.json ./logs.html` is used to do a bunch of stuff - generate reports, logs, and update Jira issues.
It requires additional metadata file `buildData.json` in the following format:

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

`./logs.html` is the destination path of generated HTML logs.

## Eternal import map

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

### Local development

1. Clone this repository using `git clone --recurse-submodules https://github.com/matiduda/scope-tags`
2. Make sure you're using the correct verion of Node - `v12.16.1 (npm v6.13.4)`
3. Run `npm install` (preffered Node/NPM version: v12.16.3 / 6.14.4)
4. Run `npm link`
5. Use the local version of the script using `scope` (without the `npx prefix`) (if it doesn't work - restart the terminal)
6. `npx scope` runs version installed in the current repository (as a dependency), `scope` runs locally builded version

> To run test suite use `npm run test`

### Publishing

For unit testing there is a [separate mock repository](https://github.com/matiduda/scope-tags-mock-repo-for-testing-only), which should be keeped up-to-date

Publishing is made automatically by pushing a commit to the main branch, see [github action](https://github.com/matiduda/scope-tags/actions/workflows/test-and-deploy-to-npm.yml)

The mock repo can be updated automatically by running `./pushTestRepo.sh`

### Features to do in order of importance

- [ ] Find a way to clone test repository locally - this will make unit testing much quicker
- [ ] Unit tests for:
    - [ ] The basic actions which can be performed on files - adding, deleting, modifying, renaming. After initial database entry the script should automatically handle all cases.
    - [ ] Testing if files are correstly updated in database depending on changes in git
    - [ ] On loading `tags.json` assert that all parents exist in database, if not then these modules won't be displayed
- [ ] Add unit tests for even the basic stuff - reading and parsing JSON files, synchronization between the database and repository, etc.
- [ ] Add unit tests for the basic actions which can be performed on files - adding, deleting, modifying, renaming. After initial database entry the script should automatically handle all cases.
- [ ] Add [adf-validator](https://github.com/torifat/adf-validator/tree/master) which would give more specific errors (right now comments are just not being posted)
- [ ] Add remove hanging tags option to tag manager - search for tags not assigned to any module and ask the user if they want to delete them
- [ ] Add keyboard shortcut hints when selecting tags and files -> https://github.com/enquirer/enquirer#select-choices

### Special thanks

- [adf-validator](https://github.com/torifat/adf-validator) for showing how to validate Jira's ADF
