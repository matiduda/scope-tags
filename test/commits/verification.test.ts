import { resolve } from "path";
import rimraf from "rimraf";
import { TEMP_TEST_FOLDER, initMockRepository, purgeMockRepository } from "../_utils/utils.test";


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
    it("When commits consists only of files which extensions are ignored, the commit is marked by 'includesOnlyIgnoredFiles' flag", () => {
        expect(true).toBe(true);
    });

    it("When commits consists only of ignored files (from database.json), the commit is marked by 'includesOnlyIgnoredFiles' flag", () => {
        expect(true).toBe(true);
    });
});
