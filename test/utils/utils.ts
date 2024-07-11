import { appendFileSync, existsSync, mkdirSync } from "fs";
import { join, posix, resolve, sep } from "path";
import { MOCK_REMOTE_URL, MOCK_REPOSITORY, TEST_DATA_FOLDER } from "./globals";

import { execSync } from "child_process";
import fs from "fs";
import readline from "readline";
import * as rimraf from "rimraf";
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

export const mergeBranchToCurrent = (repositoryPath: string, branchName: string): void => {
    const { execSync } = require("child_process");

    execSync(
        `cd ${repositoryPath} && git merge --no-ff origin/${branchName}`,
        (err: any, stdout: any, stderr: any) => {
            if (err) {
                console.debug(err);
                return;
            }
            console.debug(`stdout: ${stdout}`);
            console.debug(`stderr: ${stderr}`);
        });
};

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

export const commitModitication = async (
    fileNames: string[],
    repositoryPath: string,
    commitMessage = "test commit"
): Promise<GitRepository> => {
    fileNames.forEach(fileName => {
        appendSomeTextToFile(join(repositoryPath, fileName));
    });

    const repository = new GitRepository(repositoryPath);
    const oid = await repository.commitFiles(commitMessage, fileNames);

    console.debug(`[Modified files] Created new commit ${oid}`);

    return repository;
};

export const deleteFiles = (
    fileNames: string[],
    repositoryPath: string,
): void => {
    for (const fileName of fileNames) {
        const filePath = join(repositoryPath, fileName);
        if (existsSync(filePath)) {
            rimraf.sync(filePath);
        } else {
            console.debug(`[Delete files] File ${filePath} does not exist`);
        }
    }
};

export const renameFiles = (
    fileNames: string[][],
    repositoryPath: string,
): void => {
    for (const fileName of fileNames) {
        const filePathBefore = join(repositoryPath, fileName[0]);
        const filePathAfter = join(repositoryPath, fileName[1]);
        if (existsSync(filePathBefore)) {
            execSync(`cd ${repositoryPath} && git mv ${fileName[0]} ${fileName[1]}`);
        } else {
            console.debug(`[Rename files] File ${filePathBefore} does not exist`);
        }
    }
};

// Nodegit does not work well in Jest with deletion / renaming
export const commitFilesUsingGitNatively = (
    fileNames: string[],
    repositoryPath: string,
    commitMessage = "test commit"
) => {
    execSync(`cd ${repositoryPath} && git add ${fileNames.join(" ")} && git commit -m "${commitMessage}"`);
};

// https://stackoverflow.com/questions/28747719/what-is-the-most-efficient-way-to-read-only-the-first-line-of-a-file-in-node-js
export async function getFirstLine(pathToFile: string): Promise<string> {
    const readable = fs.createReadStream(pathToFile);
    const reader = readline.createInterface({ input: readable });
    const line: string = await new Promise((resolve) => {
        reader.on("line", (line) => {
            reader.close();
            resolve(line);
        });
    });
    readable.close();
    return line;
}