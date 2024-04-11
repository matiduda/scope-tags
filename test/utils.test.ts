import { resolve, join } from "path";
import { existsSync } from "fs";
import { copySync } from "fs-extra";
import rimraf from "rimraf";

// Common test constants

export const TEMP_TEST_FOLDER = resolve("./tmp/");

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

export const cloneMockRepository = () => {

}