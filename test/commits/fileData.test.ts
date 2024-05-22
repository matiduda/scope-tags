import { cloneMockRepositoryToFolder, commitEmptyFiles, makeUniqueFolderForTest } from "../utils/utils";
import { FileData, GitDeltaType } from "../../src/Git/Types";

describe("Tesing if file data is retrieved correctly", () => {

    it("When a commit is created, it is detected by the script as unpushed with correct FileData", async () => {
        const FOLDER_PATH = makeUniqueFolderForTest();
        const REPO_PATH = cloneMockRepositoryToFolder(FOLDER_PATH);

        const testFile = "src/_NEW_FILE_.txt";

        const repo = await commitEmptyFiles([testFile], REPO_PATH);

        const unpushedCommits = await repo.getUnpushedCommits();
        expect(unpushedCommits.length).toBe(1);

        const commit = unpushedCommits[0];

        const fileDataArray: FileData[] = repo.getFileDataUsingNativeGitCommand(commit);

        expect(fileDataArray.length).toBe(1);

        const ourFileData = fileDataArray[0];

        expect(ourFileData).toBeDefined();
        expect(ourFileData.oldPath).toBe(testFile);
        expect(ourFileData.newPath).toBe(testFile);
        expect(ourFileData.change).toBe(GitDeltaType.ADDED);
        expect(ourFileData.linesAdded).toBe(1);
        expect(ourFileData.linesRemoved).toBe(0);
        expect(ourFileData.commitedIn).toBe(commit);
    });
});