import { GitRepository } from "../../src/Git/GitRepository";
import { GitDeltaType } from "../../src/Git/Types";
import { FileTagsDatabase } from "../../src/Scope/FileTagsDatabase";
import { cloneMockRepositoryToFolder, commitFilesUsingGitNatively, deleteFiles, makeUniqueFolderForTest, renameFiles } from "../utils/utils";

describe("Database file", () => {
  it("After files are deleted, the information about them is purged from database", async () => {
    const FOLDER_PATH = makeUniqueFolderForTest();
    const REPO_PATH = cloneMockRepositoryToFolder(FOLDER_PATH);

    const savedDatabase = new FileTagsDatabase(REPO_PATH);

    savedDatabase.load();

    const filesToDelete = [
      "src/tagged-file.js",
      "src/file-ignored-by-database.js"
    ];

    deleteFiles(filesToDelete, REPO_PATH);
    commitFilesUsingGitNatively(filesToDelete, REPO_PATH, "delete commit");

    const repository = new GitRepository(REPO_PATH);

    const unpushedCommits = await repository.getUnpushedCommits();
    expect(unpushedCommits.length).toBe(1);

    const commit = unpushedCommits[0];

    const fileDataArray = await repository.getFileDataForCommits([commit], true);

    expect(fileDataArray.length).toBe(2);

    expect(fileDataArray[0].change).toBe(GitDeltaType.DELETED);
    expect(fileDataArray[1].change).toBe(GitDeltaType.DELETED);

    const newDatabase = new FileTagsDatabase(REPO_PATH);

    newDatabase.load();
    newDatabase.updateDatabaseBasedOnChanges(fileDataArray);

    // Check if the files were deleted

    expect(savedDatabase.isFileInDatabase("src/tagged-file.js")).toBe(true);
    expect(newDatabase.isFileInDatabase("src/tagged-file.js")).toBe(false);

    expect(savedDatabase.isIgnored("src/file-ignored-by-database.js")).toBe(true);
    expect(newDatabase.isIgnored("src/file-ignored-by-database.js")).toBe(false);

    expect(newDatabase.fileCount).toBe(savedDatabase.fileCount - 1);
    expect(newDatabase.ignoredFilesCount).toBe(savedDatabase.ignoredFilesCount - 1);
  });

  it("After files are renamed, the information about them is purged from database", async () => {
    const FOLDER_PATH = makeUniqueFolderForTest();
    const REPO_PATH = cloneMockRepositoryToFolder(FOLDER_PATH);

    const savedDatabase = new FileTagsDatabase(REPO_PATH);

    savedDatabase.load();

    const filesToRename = [
      ["src/tagged-file.js", "src/tagged-file-renamed.js"],
      ["src/file-ignored-by-database.js", "src/file-ignored-by-database-renamed.js"],
    ];

    renameFiles(filesToRename, REPO_PATH);
    commitFilesUsingGitNatively(filesToRename.map(files => files[1]), REPO_PATH, "rename commit");

    const repository = new GitRepository(REPO_PATH);

    const unpushedCommits = await repository.getUnpushedCommits();
    expect(unpushedCommits.length).toBe(1);

    const commit = unpushedCommits[0];

    const fileDataArray = await repository.getFileDataForCommits([commit], true);

    expect(fileDataArray.length).toBe(2);

    expect(fileDataArray[0].change).toBe(GitDeltaType.RENAMED);
    expect(fileDataArray[1].change).toBe(GitDeltaType.RENAMED);

    const newDatabase = new FileTagsDatabase(REPO_PATH);

    newDatabase.load();
    newDatabase.updateDatabaseBasedOnChanges(fileDataArray);

    // Check if the files were deleted

    expect(savedDatabase.isFileInDatabase("src/tagged-file.js")).toBe(true);
    expect(savedDatabase.isFileInDatabase("src/tagged-file-renamed.js")).toBe(false);
    expect(newDatabase.isFileInDatabase("src/tagged-file.js")).toBe(false);
    expect(newDatabase.isFileInDatabase("src/tagged-file-renamed.js")).toBe(true);

    expect(savedDatabase.isIgnored("src/file-ignored-by-database.js")).toBe(true);
    expect(savedDatabase.isIgnored("src/file-ignored-by-database-renamed.js")).toBe(false);
    expect(newDatabase.isIgnored("src/file-ignored-by-database.js")).toBe(false);
    expect(newDatabase.isIgnored("src/file-ignored-by-database-renamed.js")).toBe(true);

    expect(newDatabase.fileCount).toBe(savedDatabase.fileCount);
    expect(newDatabase.ignoredFilesCount).toBe(savedDatabase.ignoredFilesCount);
  });
});
