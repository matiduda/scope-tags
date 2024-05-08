import { resolve, join } from "path";
import { closeSync, openSync } from "fs";
import rimraf from "rimraf";
import { cloneMockRepositoryToFolder, makeUniqueFolderForTest, removeUniqueFolderForTest } from "../_utils/utils";
import { TEST_DATA_FOLDER } from "../_utils/globals";
import { GitRepository } from "../../src/Git/GitRepository";
import { VerificationStatus, verifyUnpushedCommits } from "../../src/Commands/runVerifyUnpushedCommitsCommand";
import { Utils } from "../../src/Scope/Utils";

const fs = require('fs');

afterAll(() => {
    rimraf.sync(resolve(TEST_DATA_FOLDER));
});

// const appendSomeTextToFile = (fileName: string) => {
//     appendFileSync(join(MOCK_REPO_DESTINATION_PATH, fileName), "some_appended_text");
// };

const createEmptyFiles = (fileNames: string[], rootFolder: string) => {
    fileNames.forEach(fileName => {
        const fd = openSync(join(rootFolder, fileName), 'a');
        closeSync(fd);
    });
};

const commitEmptyFiles = async (fileNames: string[], repositoryPath: string) => {
    createEmptyFiles(fileNames, repositoryPath);

    const repository = new GitRepository(repositoryPath);
    const oid = await repository.commitFiles("test commit", fileNames)

    console.debug(`Created new commit ${oid}`)
};

// const commitModitication = async (fileNames: string[]) => {
//     fileNames.forEach(fileName => {
//         appendSomeTextToFile(fileName);
//     })

//     const repository = new GitRepository(MOCK_REPO_DESTINATION_PATH);
//     const oid = await repository.commitFiles("test commit", fileNames)

//     console.debug(`Created new commit ${oid}`)
// };

// const commitAll = async () => {
//     const repository = new GitRepository(MOCK_REPO_DESTINATION_PATH);
//     const oid = await repository.commitFiles("test commit")
//     console.debug(`Created new commit ${oid}`)
// };


describe("Commit verification by scope tags script", () => {

    it("Mock repository has been cloned correctly, if not, then there may be a problem with test init", async () => {
        const FOLDER_PATH = makeUniqueFolderForTest();
        const REPO_PATH = cloneMockRepositoryToFolder(FOLDER_PATH);

        const fileList = fs.readdirSync(REPO_PATH);

        expect(fileList.length).toBeGreaterThan(0);

        removeUniqueFolderForTest(FOLDER_PATH);
    })

    it("When commits consists only of files which extensions are ignored, the commit is marked as verified", async () => {
        const FOLDER_PATH = makeUniqueFolderForTest();
        const REPO_PATH = cloneMockRepositoryToFolder(FOLDER_PATH);

        const testFile = "assets/new_asset.jpg";

        // Make a new .jpg asset which is marked as ignored by config.json
        await commitEmptyFiles([testFile], REPO_PATH);

        const verificationStatus = await verifyUnpushedCommits([], REPO_PATH);

        console.debug(`Verification status: ${Utils.getEnumKeyByEnumValue(VerificationStatus, verificationStatus)}`)

        expect(verificationStatus).toBe(VerificationStatus.VERIFIED);

        removeUniqueFolderForTest(FOLDER_PATH);
    });

    // it("When commits consists only of ignored files (from database.json), the commit is marked as verified", async () => {
    //     const testFile = "src/file-ignored-by-database.js";

    //     const database = new FileTagsDatabase(MOCK_REPO_DESTINATION_PATH).load();
    //     const config = new ConfigFile(MOCK_REPO_DESTINATION_PATH).load();

    //     expect(database.isIgnored(testFile, config.getIgnoredFileExtenstions())).toBe(true);

    //     // Make a new commit modifying this file
    //     await commitModitication([testFile]);

    //     const verificationStatus = await verifyUnpushedCommits([], MOCK_REPO_DESTINATION_PATH);

    //     console.debug(`Verification status: ${Utils.getEnumKeyByEnumValue(VerificationStatus, verificationStatus)}`)

    //     expect(verificationStatus).toBe(VerificationStatus.VERIFIED);
    // });

    // it("When commits consists of files not present in database.json, the commit is marked as not verified", async () => {
    //     const newFiles = [
    //         "src/newly-added-file1.js",
    //         "src/newly-added-file2.js",
    //         "src/newly-added-file3.js",
    //     ];

    //     const database = new FileTagsDatabase(MOCK_REPO_DESTINATION_PATH).load();
    //     const config = new ConfigFile(MOCK_REPO_DESTINATION_PATH).load();

    //     newFiles.forEach(newFile => {
    //         expect(database.isFileInDatabase(newFile)).toBe(false);
    //         expect(database.isIgnored(newFile, config.getIgnoredFileExtenstions())).toBe(false)
    //     });

    //     await commitEmptyFiles(newFiles);

    //     const verificationStatus = await verifyUnpushedCommits([], MOCK_REPO_DESTINATION_PATH);

    //     console.debug(`Verification status: ${Utils.getEnumKeyByEnumValue(VerificationStatus, verificationStatus)}`)

    //     expect(verificationStatus).toBe(VerificationStatus.NOT_VERIFIED);
    // });

    // it("When commits consists of files not present in database.json, but has some ignored files, the commit is marked as not verified", async () => {
    //     const newlyAddedFiles = [
    //         "assets/some-new-asset.jpg",
    //         "src/some-new-file.js",
    //     ];

    //     const modifiedFiles = [
    //         "src/index.js",
    //         "src/file-ignored-by-database.js",
    //         "src/tagged-file.js",
    //     ];

    //     const allFiles = newlyAddedFiles.concat(modifiedFiles);

    //     createEmptyFiles(newlyAddedFiles);
    //     allFiles.forEach(file => appendSomeTextToFile(file));

    //     await commitAll();

    //     const database = new FileTagsDatabase(MOCK_REPO_DESTINATION_PATH).load();
    //     const config = new ConfigFile(MOCK_REPO_DESTINATION_PATH).load();

    //     // Assertions

    //     allFiles.forEach(file => {
    //         if (file === "src/tagged-file.js") {
    //             expect(database.isFileInDatabase(file)).toBe(true);
    //         } else {
    //             expect(database.isFileInDatabase(file)).toBe(false);
    //         }
    //     });

    //     expect(database.isIgnored(newlyAddedFiles[0], config.getIgnoredFileExtenstions())).toBe(true);
    //     expect(database.isIgnored(newlyAddedFiles[1], config.getIgnoredFileExtenstions())).toBe(false);

    //     expect(database.isIgnored(modifiedFiles[0], config.getIgnoredFileExtenstions())).toBe(false);
    //     expect(database.isIgnored(modifiedFiles[1], config.getIgnoredFileExtenstions())).toBe(true);
    //     expect(database.isIgnored(modifiedFiles[0], config.getIgnoredFileExtenstions())).toBe(false);

    //     const verificationStatus = await verifyUnpushedCommits([], MOCK_REPO_DESTINATION_PATH);

    //     console.debug(`Verification status: ${Utils.getEnumKeyByEnumValue(VerificationStatus, verificationStatus)}`)

    //     expect(verificationStatus).toBe(VerificationStatus.NOT_VERIFIED);
    // });
});
