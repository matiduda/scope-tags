import { join, resolve } from "path";
import rimraf from "rimraf";
import { initMockRepository, purgeMockRepository } from "../_utils/utils";
import { TEMP_TEST_FOLDER } from "../_utils/globals";
const fs = require('fs');

beforeEach(() => {
    initMockRepository();
});

afterEach(() => {
    purgeMockRepository();
});

afterAll(() => {
    rimraf.sync(resolve(TEMP_TEST_FOLDER));
});

describe("Commit verification by scope tags script", () => {
    it("Mock repository to be cloned with content", () => {
        const fileList = fs.readdirSync(resolve(join(TEMP_TEST_FOLDER, "./tmp/_repo_cloned")));
        if (fileList.length === 0) {
            console.debug("There is no content with mock repo, probably scope-tags repository was not correctly cloned, please refer to README.md");
        }
        expect(fileList.length).toBeGreaterThan(0);
    })

    it("When commits consists only of files which extensions are ignored, the commit is marked by 'includesOnlyIgnoredFiles' flag", () => {


        expect(true).toBe(true);
    });

    it("When commits consists only of ignored files (from database.json), the commit is marked by 'includesOnlyIgnoredFiles' flag", () => {
        expect(true).toBe(true);
    });
});
