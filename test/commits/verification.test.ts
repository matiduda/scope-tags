import { join } from "path";
import { appendFileSync, closeSync, openSync } from "fs";
import { cloneMockRepositoryToFolder, makeUniqueFolderForTest } from "../_utils/utils";
import { GitRepository } from "../../src/Git/GitRepository";

const fs = require('fs');
const { execSync } = require('child_process');

const appendSomeTextToFile = (filePath: string) => {
    appendFileSync(filePath, "some_appended_text");
};

const createEmptyFiles = (fileNames: string[], rootFolder: string) => {
    fileNames.forEach(fileName => {
        const fd = openSync(join(rootFolder, fileName), 'a');
        closeSync(fd);
        appendSomeTextToFile(join(rootFolder, fileName));
    });
};

const commitEmptyFiles = async (fileNames: string[], repositoryPath: string): Promise<GitRepository> => {
    createEmptyFiles(fileNames, repositoryPath);

    // const repository = new GitRepository(repositoryPath);
    // const oid = await repository.commitFiles("test commit", fileNames)

    for (const fileName of fileNames) {
        execSync(
            `cd ${repositoryPath} && git add ${fileName}`, (err: any, stdout: any, stderr: any) => {
                console.debug(`stdout: ${stdout}`);
                console.debug(`stderr: ${stderr}`);
            });
    }

    execSync(
        `cd ${repositoryPath} && git commit -m "TESTING"`, (err: any, stdout: any, stderr: any) => {
            console.debug(`stdout: ${stdout}`);
            console.debug(`stderr: ${stderr}`);
        });

    console.debug(`[Empty files] Created new commit`)

    return new GitRepository(repositoryPath);
};

const commitModitication = async (fileNames: string[], repositoryPath: string): Promise<GitRepository> => {
    fileNames.forEach(fileName => {
        appendSomeTextToFile(join(repositoryPath, fileName));
    })

    const repository = new GitRepository(repositoryPath);
    const oid = await repository.commitFiles("test commit", fileNames)

    console.debug(`[Modified files] Created new commit ${oid}`)

    return repository;
};

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
    })

    it("When a commit is created, it is detected by the script as unpushed", async () => {
        // const FOLDER_PATH = makeUniqueFolderForTest();
        // const REPO_PATH = cloneMockRepositoryToFolder(FOLDER_PATH);

        // const testFile = "src/new_test_file.js";

        // // Make a new .jpg asset which is marked as ignored by config.json
        // const repository = await commitEmptyFiles([testFile], REPO_PATH);

        // const unpushedCommits = await repository.getUnpushedCommits();
        // expect(unpushedCommits.length).toBe(1);

        // const verificationStatus = await verifyUnpushedCommits([], REPO_PATH);

        // console.debug(`Verification status: ${Utils.getEnumKeyByEnumValue(VerificationStatus, verificationStatus)}`)

        // expect(verificationStatus).toBe(VerificationStatus.VERIFIED);
    });


    // it("When commits consists only of files which extensions are ignored, the commit is marked as verified", async () => {
    //     const FOLDER_PATH = makeUniqueFolderForTest();
    //     const REPO_PATH = cloneMockRepositoryToFolder(FOLDER_PATH);

    //     const testFile = "assets/new_asset.jpg";

    //     // Make a new .jpg asset which is marked as ignored by config.json
    //     const repository = await commitEmptyFiles([testFile], REPO_PATH);

    //     const unpushedCommits = await repository.getUnpushedCommits();
    //     expect(unpushedCommits.length).toBe(1);

    //     const verificationStatus = await verifyUnpushedCommits([], REPO_PATH);

    //     console.debug(`Verification status: ${Utils.getEnumKeyByEnumValue(VerificationStatus, verificationStatus)}`)

    //     expect(verificationStatus).toBe(VerificationStatus.VERIFIED);
    // });

    // it("When commits consists only of ignored files (from database.json), the commit is marked as verified", async () => {
    //     const FOLDER_PATH = makeUniqueFolderForTest();
    //     const REPO_PATH = cloneMockRepositoryToFolder(FOLDER_PATH);

    //     const testFile = "src/file-ignored-by-database.js";

    //     const database = new FileTagsDatabase(REPO_PATH).load();
    //     const config = new ConfigFile(REPO_PATH).load();

    //     expect(database.isIgnored(testFile, config.getIgnoredFileExtenstions())).toBe(true);

    //     const repository = await commitModitication([testFile], REPO_PATH);

    //     const unpushedCommits = await repository.getUnpushedCommits();
    //     expect(unpushedCommits.length).toBe(1);

    //     const verificationStatus = await verifyUnpushedCommits([], REPO_PATH);

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
