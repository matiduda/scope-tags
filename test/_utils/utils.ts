import { resolve, join } from "path";
import { existsSync, stat } from "fs";
import { copySync } from "fs-extra";

import rimraf from "rimraf";
import { TEMP_TEST_FOLDER } from "./globals";

// Mocked repository

const MOCK_REPO_SOURCE_PATH = resolve("./test/_repo");
const MOCK_REPO_DESTINATION_PATH = resolve(join(TEMP_TEST_FOLDER, "./tmp/_repo_cloned"));

export const initMockRepository = (): void => {
    if (!existsSync(MOCK_REPO_SOURCE_PATH)) {
        throw new Error(`Could not find mock repository in '${MOCK_REPO_SOURCE_PATH}'. Make sure tests are run in the root of the repository.`);
    }

    try {
        copySync(MOCK_REPO_SOURCE_PATH, MOCK_REPO_DESTINATION_PATH, { overwrite: false })
    } catch (err) {
        console.error(err)
    }

    return;
}

export const purgeMockRepository = () => {
    if (!existsSync(MOCK_REPO_DESTINATION_PATH)) {
        throw new Error(`Could not purge mock repository located in '${MOCK_REPO_DESTINATION_PATH}' as this folder does not exist`);
    }
    rimraf.sync(resolve(MOCK_REPO_DESTINATION_PATH));
}

// Temp folder

export const assertTemporaryFolderExists = () => {
    stat(TEMP_TEST_FOLDER, function(err, stats) {
        console.debug(stats);

        if (!err) {
            console.log('file or directory exists');
        }
        else if (err.code === 'ENOENT') {
            console.log('file or directory does not exist');
        }
    });

    if (!existsSync(TEMP_TEST_FOLDER)) {
        throw new Error(`Temporary folder '${TEMP_TEST_FOLDER}' does not exist`);
    }
}