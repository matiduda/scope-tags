import { resolve, join, sep, posix } from "path";
import { appendFileSync, existsSync, mkdirSync } from "fs";

import { MOCK_REMOTE_URL, MOCK_REPOSITORY, TEST_DATA_FOLDER } from "./globals";

import * as uuid from "uuid";
import { GitRepository } from "../../src/Git/GitRepository";

// Mocked repository

const MOCK_REPO_SOURCE_PATH = resolve("./test/_repo");

export const CLONED_MOCK_REPO_NAME = "_repo_cloned";

// Temp folder

export const assertTemporaryFolderExists = () => {
    const folderPath = resolve(TEST_DATA_FOLDER);
    if (!existsSync(folderPath)) {
        mkdirSync(folderPath);
    }
};

/**
 * Temporary folder for test based on auto generated ID.
 * Every test should be sanboxed to not bleed to others.
 * It is not supposed to be deleted by tests, because git creates some lock files.
 *
 * @returns {string} Generated repository path
 */
export const makeUniqueFolderForTest = (): string => {

    const testID = uuid.v4();
    const tempFolderPath = join(TEST_DATA_FOLDER, testID);
    mkdirSync(join(TEST_DATA_FOLDER, testID));
    return tempFolderPath;
};


export const cloneMockRepositoryToFolder = (parentFolder: string): string => {
    const { execSync } = require("child_process");

    const clonedRepoPath = join(parentFolder, CLONED_MOCK_REPO_NAME).split(sep).join(posix.sep);

    execSync(
        `git clone --no-hardlinks ${MOCK_REPOSITORY} ${clonedRepoPath} && cd ${clonedRepoPath} && git remote rm origin && git remote add origin ${MOCK_REMOTE_URL} && git fetch origin`,
        (err: any, stdout: any, stderr: any) => {
            if (err) {
                console.debug(err);
                return;
            }
            console.debug(`stdout: ${stdout}`);
            console.debug(`stderr: ${stderr}`);
        });

    return clonedRepoPath;
};

export const getRandomUUID = () => uuid.v4();

export const appendSomeTextToFile = (filePath: string) => {
    appendFileSync(filePath, getRandomUUID());
};

export const createEmptyFiles = (fileNames: string[], rootFolder: string) => {
    fileNames.forEach(fileName => {
        appendSomeTextToFile(join(rootFolder, fileName));
    });
};

export const commitEmptyFiles = async (fileNames: string[], repositoryPath: string): Promise<GitRepository> => {
    createEmptyFiles(fileNames, repositoryPath);

    const repository = new GitRepository(repositoryPath);
    const oid = await repository.commitFiles("[commitEmptyFiles] Test", fileNames);

    console.debug(`[commitEmptyFiles] Created new commit ${oid.tostrS()}`);

    return repository;
};

export const commitFiles = async (fileNames: string[], repositoryPath: string): Promise<GitRepository> => {
    const repository = new GitRepository(repositoryPath);
    const oid = await repository.commitFiles("[commitFiles] Test", fileNames);

    console.debug(`[commitFiles] Created new commit ${oid.tostrS()}`);

    return repository;
};

export const createFolder = (location: string): string => {
    const folderPath = join(location, getRandomUUID());
    mkdirSync(folderPath);
    return folderPath;
};

export const commitModitication = async (fileNames: string[], repositoryPath: string): Promise<GitRepository> => {
    fileNames.forEach(fileName => {
        appendSomeTextToFile(join(repositoryPath, fileName));
    });

    const repository = new GitRepository(repositoryPath);
    const oid = await repository.commitFiles("test commit", fileNames);

    console.debug(`[Modified files] Created new commit ${oid}`);

    return repository;
};
