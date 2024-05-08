import { resolve, join, sep, posix } from "path";
import { existsSync, mkdirSync } from "fs";

import { MOCK_REPOSITORY, TEST_DATA_FOLDER } from "./globals";

import { v4 as uuidv4 } from 'uuid';

// Mocked repository

const MOCK_REPO_SOURCE_PATH = resolve("./test/_repo");

export const CLONED_MOCK_REPO_NAME = "_repo_cloned";

// Temp folder

export const assertTemporaryFolderExists = () => {
    const folderPath = resolve(TEST_DATA_FOLDER);
    if (!existsSync(folderPath)) {
        mkdirSync(folderPath);
    }
}

// Temporary folder for test based on auto generated ID

export const makeUniqueFolderForTest = (): string => {

    // TODO: Spróbować https://github.com/jestjs/jest/issues/7774

    const testID = uuidv4();
    const tempFolderPath = join(TEST_DATA_FOLDER, testID);
    mkdirSync(join(TEST_DATA_FOLDER, testID));
    return tempFolderPath;
}

export const removeUniqueFolderForTest = (path: string) => {
    // TODO: Make cleaning work
}

export const cloneMockRepositoryToFolder = (parentFolder: string): string => {
    const { execSync } = require('child_process');

    const clonedRepoPath = join(parentFolder, CLONED_MOCK_REPO_NAME).split(sep).join(posix.sep);

    execSync(`git clone --no-hardlinks ${MOCK_REPOSITORY} ${clonedRepoPath} && cd ${clonedRepoPath} && git remote rm origin`, (err: any, stdout: any, stderr: any) => {
        if (err) {
            console.debug(err);
            return;
        }
        console.debug(`stdout: ${stdout}`);
        console.debug(`stderr: ${stderr}`);
    });

    return clonedRepoPath;
}