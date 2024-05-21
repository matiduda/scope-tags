import { appendSomeTextToFile, cloneMockRepositoryToFolder, commitEmptyFiles, commitFiles, commitModitication, createEmptyFiles, makeUniqueFolderForTest, mergeBranchToCurrent } from "../utils/utils";
import { VerificationStatus, verifyUnpushedCommits } from "../../src/Commands/runVerifyUnpushedCommitsCommand";
import { GitRepository } from "../../src/Git/GitRepository";
import { ConfigFile } from "../../src/Scope/ConfigFile";
import { FileTagsDatabase } from "../../src/Scope/FileTagsDatabase";
import { RelevancyManager } from "../../src/Relevancy/RelevancyManager";
import { Utils } from "../../src/Scope/Utils";
import { join } from "path";

const fs = require('fs');

describe("Commit verification by scope tags script", () => {

    it("Mock repository has been cloned correctly, if not, then there may be a problem with test init", async () => {
        const FOLDER_PATH = makeUniqueFolderForTest();
        const REPO_PATH = cloneMockRepositoryToFolder(FOLDER_PATH);

        const fileList = fs.readdirSync(REPO_PATH);

        expect(fileList.length).toBeGreaterThan(0);
    })

    it("When a commit is created, it is detected by the script as unpushed", async () => {
        const FOLDER_PATH = makeUniqueFolderForTest();
        const REPO_PATH = cloneMockRepositoryToFolder(FOLDER_PATH);

        const testFile = "src/new_test_file.js";

        const repository = await commitEmptyFiles([testFile], REPO_PATH);

        const unpushedCommits = await repository.getUnpushedCommits();
        expect(unpushedCommits.length).toBe(1);
    });


    it("When commits consists only of files which extensions are ignored, the commit is marked as verified", async () => {
        const FOLDER_PATH = makeUniqueFolderForTest();
        const REPO_PATH = cloneMockRepositoryToFolder(FOLDER_PATH);

        const testFile = "assets/new_asset.jpg";

        // Make a new .jpg asset which is marked as ignored by config.json
        const repository = await commitEmptyFiles([testFile], REPO_PATH);

        const unpushedCommits = await repository.getUnpushedCommits();
        expect(unpushedCommits.length).toBe(1);

        const verificationStatus = await verifyUnpushedCommits([], REPO_PATH, true);

        console.debug(`Verification status: ${Utils.getEnumKeyByEnumValue(VerificationStatus, verificationStatus)}`)

        expect(verificationStatus).toBe(VerificationStatus.VERIFIED);
    });

    it("When commits consists only of ignored files (from database.json), the commit is marked as verified", async () => {
        const FOLDER_PATH = makeUniqueFolderForTest();
        const REPO_PATH = cloneMockRepositoryToFolder(FOLDER_PATH);

        const testFile = "src/file-ignored-by-database.js";

        const database = new FileTagsDatabase(REPO_PATH).load();
        const config = new ConfigFile(REPO_PATH).load();

        expect(database.isIgnored(testFile, config.getIgnoredFileExtenstions())).toBe(true);

        const repository = await commitModitication([testFile], REPO_PATH);

        const unpushedCommits = await repository.getUnpushedCommits();
        expect(unpushedCommits.length).toBe(1);

        const verificationStatus = await verifyUnpushedCommits([], REPO_PATH, true);

        console.debug(`Verification status: ${Utils.getEnumKeyByEnumValue(VerificationStatus, verificationStatus)}`)

        expect(verificationStatus).toBe(VerificationStatus.VERIFIED);
    });

    it("When commits consists of files not present in database.json, the commit is marked as not verified", async () => {
        const FOLDER_PATH = makeUniqueFolderForTest();
        const REPO_PATH = cloneMockRepositoryToFolder(FOLDER_PATH);

        const newFiles = [
            "src/newly-added-file1.js",
            "src/newly-added-file2.js",
            "src/newly-added-file3.js",
        ];

        const database = new FileTagsDatabase(REPO_PATH).load();
        const config = new ConfigFile(REPO_PATH).load();

        newFiles.forEach(newFile => {
            expect(database.isFileInDatabase(newFile)).toBe(false);
            expect(database.isIgnored(newFile, config.getIgnoredFileExtenstions())).toBe(false)
        });

        await commitEmptyFiles(newFiles, REPO_PATH);

        const verificationStatus = await verifyUnpushedCommits([], REPO_PATH, true);

        console.debug(`Verification status: ${Utils.getEnumKeyByEnumValue(VerificationStatus, verificationStatus)}`)

        expect(verificationStatus).toBe(VerificationStatus.NOT_VERIFIED);
    });

    it("When commits consists of files not present in database.json, but has some ignored files, the commit is marked as not verified", async () => {
        const FOLDER_PATH = makeUniqueFolderForTest();
        const REPO_PATH = cloneMockRepositoryToFolder(FOLDER_PATH);

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

        createEmptyFiles(newlyAddedFiles, REPO_PATH);
        modifiedFiles.forEach(file => appendSomeTextToFile(join(REPO_PATH, file)));

        await commitFiles(allFiles, REPO_PATH);

        const database = new FileTagsDatabase(REPO_PATH).load();
        const config = new ConfigFile(REPO_PATH).load();

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

        const verificationStatus = await verifyUnpushedCommits([], REPO_PATH, true);

        console.debug(`Verification status: ${Utils.getEnumKeyByEnumValue(VerificationStatus, verificationStatus)}`)

        expect(verificationStatus).toBe(VerificationStatus.NOT_VERIFIED);
    });

    it("When commit is a merge commit, the commit is marked as merge commit", async () => {
        const FOLDER_PATH = makeUniqueFolderForTest();
        const REPO_PATH = cloneMockRepositoryToFolder(FOLDER_PATH);

        const branchToMergeName = "branch-with-some-new-files";

        mergeBranchToCurrent(REPO_PATH, branchToMergeName);

        const repository = new GitRepository(REPO_PATH);
        const config = new ConfigFile(REPO_PATH);
        const database = new FileTagsDatabase(REPO_PATH);
        const relevancy = new RelevancyManager();

        config.load();
        database.load();

        const [mergeCommit, realCommit] = await repository.getUnpushedCommits();

        expect(mergeCommit).toBeDefined();
        expect(realCommit).toBeDefined();

        const mergeCommitInfo = await repository.verifyCommit(mergeCommit, config, database, relevancy, true);
        const realCommitInfo = await repository.verifyCommit(realCommit, config, database, relevancy, true);

        expect(mergeCommitInfo.isMergeCommit).toBe(true);

        expect(realCommitInfo.isMergeCommit).toBe(false);
        expect(realCommitInfo.isSkipped).toBe(false);

        const verificationStatus = await verifyUnpushedCommits([], REPO_PATH, true);

        expect(verificationStatus).toBe(VerificationStatus.NOT_VERIFIED);
    });

    // Not pretty fix for squashed commits, at least in BitBucket
    it("When commit summary has 'Merge', the commit is marked as merge commit", async () => {
        const FOLDER_PATH = makeUniqueFolderForTest();
        const REPO_PATH = cloneMockRepositoryToFolder(FOLDER_PATH);

        const testFile = "src/some-file-in-squashed-merge.js";

        const database = new FileTagsDatabase(REPO_PATH).load();
        const config = new ConfigFile(REPO_PATH).load();

        const repository = new GitRepository(REPO_PATH);
        const relevancy = new RelevancyManager();

        // Some common merge commit messages

        const commonMergeCommitMessages = [
            "Merge pull request #9 from mhagger/recursive-option",
            "Merged in STH-1234-test-branch (pull request #1234)"
        ];

        for (const message of commonMergeCommitMessages) {
            await commitModitication(
                [testFile],
                REPO_PATH,
                message
            );
        }

        const unpushedCommits = await repository.getUnpushedCommits();
        expect(unpushedCommits.length).toBe(commonMergeCommitMessages.length);

        for (const commit of unpushedCommits) {
            const commitInfo = await repository.verifyCommit(commit, config, database, relevancy, true);
            expect(commitInfo.isMergeCommit).toBe(true);
        }
        const verificationStatus = await verifyUnpushedCommits([], REPO_PATH, true);

        console.debug(`Verification status: ${Utils.getEnumKeyByEnumValue(VerificationStatus, verificationStatus)}`)

        expect(verificationStatus).toBe(VerificationStatus.VERIFIED);
    });
});
