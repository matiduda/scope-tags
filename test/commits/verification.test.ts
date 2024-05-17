import { appendSomeTextToFile, cloneMockRepositoryToFolder, commitEmptyFiles, commitFiles, commitModitication, createEmptyFiles, makeUniqueFolderForTest } from "../_utils/utils";
import { VerificationStatus, verifyUnpushedCommits } from "../../src/Commands/runVerifyUnpushedCommitsCommand";
import { Utils } from "../../src/Scope/Utils";
import { FileTagsDatabase } from "../../src/Scope/FileTagsDatabase";
import { ConfigFile } from "../../src/Scope/ConfigFile";
import { join } from "path";
import { readdirSync } from "fs-extra";

describe("Commit verification by scope tags script", () => {

	it("Mock repository has been cloned correctly, if not, then there may be a problem with test init", async () => {
		const FOLDER_PATH = makeUniqueFolderForTest();
		const REPO_PATH = cloneMockRepositoryToFolder(FOLDER_PATH);

		const fileList = readdirSync(REPO_PATH);

		expect(fileList.length).toBeGreaterThan(0);
	});

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

		console.debug(`Verification status: ${Utils.getEnumKeyByEnumValue(VerificationStatus, verificationStatus)}`);

		expect(verificationStatus).toBe(VerificationStatus.VERIFIED);
	});

	it("When commits consists only of ignored files (from database.json), the commit is marked as verified", async () => {
		const FOLDER_PATH = makeUniqueFolderForTest();
		const REPO_PATH = cloneMockRepositoryToFolder(FOLDER_PATH);

		const testFile = "src/file-ignored-by-database.js";

		const database = new FileTagsDatabase(REPO_PATH);
		const config = new ConfigFile(REPO_PATH);

		expect(database.isIgnored(testFile, config.getIgnoredFileExtenstions())).toBe(true);

		const repository = await commitModitication([testFile], REPO_PATH);

		const unpushedCommits = await repository.getUnpushedCommits();
		expect(unpushedCommits.length).toBe(1);

		const verificationStatus = await verifyUnpushedCommits([], REPO_PATH, true);

		console.debug(`Verification status: ${Utils.getEnumKeyByEnumValue(VerificationStatus, verificationStatus)}`);

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

		const database = new FileTagsDatabase(REPO_PATH);
		const config = new ConfigFile(REPO_PATH);

		newFiles.forEach(newFile => {
			expect(database.isFileInDatabase(newFile)).toBe(false);
			expect(database.isIgnored(newFile, config.getIgnoredFileExtenstions())).toBe(false);
		});

		await commitEmptyFiles(newFiles, REPO_PATH);

		const verificationStatus = await verifyUnpushedCommits([], REPO_PATH, true);

		console.debug(`Verification status: ${Utils.getEnumKeyByEnumValue(VerificationStatus, verificationStatus)}`);

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

		const database = new FileTagsDatabase(REPO_PATH);
		const config = new ConfigFile(REPO_PATH);

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

		console.debug(`Verification status: ${Utils.getEnumKeyByEnumValue(VerificationStatus, verificationStatus)}`);

		expect(verificationStatus).toBe(VerificationStatus.NOT_VERIFIED);
	});
});
