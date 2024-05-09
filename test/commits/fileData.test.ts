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


describe("Tesing if file data is retrieved correctly", () => {

    it("When a commit is created, it is detected by the script as unpushed", async () => {
        const FOLDER_PATH = makeUniqueFolderForTest();
        const REPO_PATH = cloneMockRepositoryToFolder(FOLDER_PATH);


        const testFile = "src/some_newly_added_file_xd.js";

        // Make a new .jpg asset which is marked as ignored by config.json
        const repo = await commitEmptyFiles([testFile], REPO_PATH);

        const unpushedCommits = await repo.getUnpushedCommits();
        expect(unpushedCommits.length).toBe(1);

        const com = unpushedCommits[0];

        const fileData = repo.getFileDataUsingNativeGitCommand(com);

        // convert and show the output.
        console.debug();

        // return toTree.diff(fromTree, (d: any) => {
        //     console.debug("OK");

        //     // const patches = await diff.patches();

        //     // for (const patch of patches) {
        //     //     let a = patch.newFile().path()
        //     // }

        //     // console.debug("Loading diffs...");

        //     // return com.getDiff().then((diff: any) => {
        //     //     console.debug("Loaded diffs");

        //     //     console.debug(diff)
        //     // });

        // });

    });
});
