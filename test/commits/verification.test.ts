import { resolve, join } from "path";
import { appendFileSync, closeSync, openSync } from "fs";
import rimraf from "rimraf";
import { MOCK_REPO_DESTINATION_PATH, initMockRepository, purgeMockRepository } from "../_utils/utils";
import { TEMP_TEST_FOLDER } from "../_utils/globals";
import { VerificationStatus, verifyUnpushedCommits } from "../../src/Commands/runVerifyUnpushedCommitsCommand";
import { GitRepository } from "../../src/Git/GitRepository";
import { Utils } from "../../src/Scope/Utils";
import { FileTagsDatabase } from "../../src/Scope/FileTagsDatabase";
import { ConfigFile } from "../../src/Scope/ConfigFile";


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

const appendSomeTextToFile = (fileName: string) => {
    appendFileSync(join(MOCK_REPO_DESTINATION_PATH, fileName), "some_appended_text");
};

const createEmptyFiles = (fileNames: string[]) => {
    fileNames.forEach(fileName => {
        const fd = openSync(join(MOCK_REPO_DESTINATION_PATH, fileName), 'a');
        closeSync(fd);
    });
};

const commitEmptyFiles = async (fileNames: string[]) => {
    createEmptyFiles(fileNames);

    const repository = new GitRepository(MOCK_REPO_DESTINATION_PATH);
    const oid = await repository.commitFiles("test commit", fileNames)

    console.debug(`Created new commit ${oid}`)
};

const commitModitication = async (fileNames: string[]) => {
    fileNames.forEach(fileName => {
        appendSomeTextToFile(fileName);
    })

    const repository = new GitRepository(MOCK_REPO_DESTINATION_PATH);
    const oid = await repository.commitFiles("test commit", fileNames)

    console.debug(`Created new commit ${oid}`)
};

const commitAll = async () => {
    const repository = new GitRepository(MOCK_REPO_DESTINATION_PATH);
    const oid = await repository.commitFiles("test commit")
    console.debug(`Created new commit ${oid}`)
};


describe("Commit verification by scope tags script", () => {
    it("Mock repository to be cloned with content", () => {
        const fileList = fs.readdirSync(MOCK_REPO_DESTINATION_PATH);
        if (fileList.length === 0) {
            console.debug("There is no content with mock repo, probably scope-tags repository was not correctly cloned, please refer to README.md");
        }
        expect(fileList.length).toBeGreaterThan(0);
    })

    it("When commits consists only of files which extensions are ignored, the commit is marked as verified", async () => {
        const testFile = "assets/new_asset.jpg";

        // Make a new .jpg asset which is marked as ignored by config.json
        await commitEmptyFiles([testFile]);

        const verificationStatus = await verifyUnpushedCommits([], MOCK_REPO_DESTINATION_PATH);

        console.debug(`Verification status: ${Utils.getEnumKeyByEnumValue(VerificationStatus, verificationStatus)}`)

        expect(verificationStatus).toBe(VerificationStatus.VERIFIED);
    });

    it("When commits consists only of ignored files (from database.json), the commit is marked as verified", async () => {
        const testFile = "src/file-ignored-by-database.js";

        const database = new FileTagsDatabase(MOCK_REPO_DESTINATION_PATH).load();
        const config = new ConfigFile(MOCK_REPO_DESTINATION_PATH).load();

        expect(database.isIgnored(testFile, config.getIgnoredFileExtenstions())).toBe(true);

        // Make a new commit modifying this file
        await commitModitication([testFile]);

        const verificationStatus = await verifyUnpushedCommits([], MOCK_REPO_DESTINATION_PATH);

        console.debug(`Verification status: ${Utils.getEnumKeyByEnumValue(VerificationStatus, verificationStatus)}`)

        expect(verificationStatus).toBe(VerificationStatus.VERIFIED);
    });

    it("When commits consists of files not present in database.json, the commit is marked as not verified", async () => {
        const newFiles = [
            "src/newly-added-file1.js",
            "src/newly-added-file2.js",
            "src/newly-added-file3.js",
        ];

        const database = new FileTagsDatabase(MOCK_REPO_DESTINATION_PATH).load();
        const config = new ConfigFile(MOCK_REPO_DESTINATION_PATH).load();

        newFiles.forEach(newFile => {
            expect(database.isFileInDatabase(newFile)).toBe(false);
            expect(database.isIgnored(newFile, config.getIgnoredFileExtenstions())).toBe(false)
        });

        await commitEmptyFiles(newFiles);

        const verificationStatus = await verifyUnpushedCommits([], MOCK_REPO_DESTINATION_PATH);

        console.debug(`Verification status: ${Utils.getEnumKeyByEnumValue(VerificationStatus, verificationStatus)}`)

        expect(verificationStatus).toBe(VerificationStatus.NOT_VERIFIED);
    });

    it("When commits consists of files not present in database.json, but has some ignored files, the commit is marked as not verified", async () => {
        const newlyAddedFiles = [
            "assets/some-new-asset.jpg",
            "src/some-new-file.js",
        ];

        const modifiedFiles = [
            "src/index.js",
            "src/file-ignored-by-database.js",
            "src/tagged-file.js",
        ];

        const allFiles = newlyAddedFiles.concat(modifiedFiles);

        createEmptyFiles(newlyAddedFiles);
        allFiles.forEach(file => appendSomeTextToFile(file));

        await commitAll();

        const database = new FileTagsDatabase(MOCK_REPO_DESTINATION_PATH).load();
        const config = new ConfigFile(MOCK_REPO_DESTINATION_PATH).load();

        // Assertions

        allFiles.forEach(file => {
            if (file === "src/tagged-file.js") {
                expect(database.isFileInDatabase(file)).toBe(true);
            } else {
                expect(database.isFileInDatabase(file)).toBe(false);
            }
        });

        expect(database.isIgnored(newlyAddedFiles[0], config.getIgnoredFileExtenstions())).toBe(true);
        expect(database.isIgnored(newlyAddedFiles[1], config.getIgnoredFileExtenstions())).toBe(false);

        expect(database.isIgnored(modifiedFiles[0], config.getIgnoredFileExtenstions())).toBe(false);
        expect(database.isIgnored(modifiedFiles[1], config.getIgnoredFileExtenstions())).toBe(true);
        expect(database.isIgnored(modifiedFiles[0], config.getIgnoredFileExtenstions())).toBe(false);

        const verificationStatus = await verifyUnpushedCommits([], MOCK_REPO_DESTINATION_PATH);

        console.debug(`Verification status: ${Utils.getEnumKeyByEnumValue(VerificationStatus, verificationStatus)}`)

        expect(verificationStatus).toBe(VerificationStatus.NOT_VERIFIED);
    });
});
