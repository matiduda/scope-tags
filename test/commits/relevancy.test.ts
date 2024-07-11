import { Commit } from "nodegit";
import { FileData, GitDeltaType } from "../../src/Git/Types";
import { CommitMessageRelevancyInfo, Relevancy } from "../../src/Relevancy/Relevancy";
import { RelevancyManager } from "../../src/Relevancy/RelevancyManager";
import { FileTagsDatabase } from "../../src/Scope/FileTagsDatabase";
import { TagsDefinitionFile } from "../../src/Scope/TagsDefinitionFile";
import { cloneMockRepositoryToFolder, commitModitication, makeUniqueFolderForTest } from "../utils/utils";

const fs = require('fs');

const checkRelevancyAndFileData = (info: CommitMessageRelevancyInfo, fileData: FileData, expectedRelevancy: Relevancy | undefined, expectedCommitSHA: string) => {
    expect(0);
    expect(info.path).toBe(fileData.newPath);
    expect(info.relevancy).toBe(expectedRelevancy);
    expect(info.commit).toBe(expectedCommitSHA);
}

const mockFileData1: FileData = {
    oldPath: "src/basic/commands/command.ts",
    newPath: "src/basic/commands/command.ts",
    change: GitDeltaType.ADDED,
    linesAdded: 120,
    linesRemoved: 10,
    commitedIn: {
        sha: () => "sha"
    } as Commit
};

const mockFileData2: FileData = {
    oldPath: "assets/basic/assets/asset.jpg",
    newPath: "assets/basic/assets/asset.jpg",
    change: GitDeltaType.MODIFIED,
    linesAdded: 5,
    linesRemoved: 0,
    commitedIn: {
        sha: () => "sha"
    } as Commit
};

const mockFileData3: FileData = {
    oldPath: "config/basic/config/data.log",
    newPath: "config/basic/config/data.log",
    change: GitDeltaType.DELETED,
    linesAdded: 0,
    linesRemoved: 1050,
    commitedIn: {
        sha: () => "sha"
    } as Commit
};

const mockRelevancyData = new Map<FileData, Relevancy>([
    [mockFileData1, Relevancy.LOW],
    [mockFileData2, Relevancy.LOW],
    [mockFileData3, Relevancy.HIGH],
]);

describe("Relevancy manager tests", () => {

    it("Reports no relevancy when there is no relevancy in commit message", async () => {
        const relevancyManager = new RelevancyManager();

        const commitMessagesWithoutRelevancy = [
            "[TEST-1234] There is no relevancy data in this commit message",
            `[TEST-1234] There is no relevancy data in this commit message
            
            
            `,
            `[TEST-1234] There is no relevancy data in this commit message
            
            __relevancy__
            `,
            `[TEST-1234] There is no relevancy data in this commit message
            
            __relevancy____relevancy__
            `, `[TEST-1234] There is no relevancy data in this commit message
            
            __relevancy__ddddddd__relevancy__
            `,
        ];

        commitMessagesWithoutRelevancy.forEach(message => {
            const hasRelevancy = relevancyManager.doesCommitMessageHaveRelevancyData(message);

            if (hasRelevancy) {
                console.debug(message);
            }

            expect(hasRelevancy).toBe(false);
        })
    })

    it("Reports relevancy when there is correct relevancy encoded", async () => {
        const relevancyManager = new RelevancyManager();

        const commitMessagesWithRelevancy = [
            `[TEST-1234] There is correct relevancy data in this commit message
            
            __relevancy__[]__relevancy__`,
            `[TEST - 1234] There is correct relevancy data in this commit message

            __relevancy__[{"path":"src/basic/commands/command.ts","relevancy":"LOW","commit":"__current__"}]__relevancy__
            `,
            `[TEST-1234] This is a commit message with multiple relevancies

            
                __relevancy__[{"path":"src/basic/commands/command.ts","relevancy":"LOW","commit":"__current__"}]__relevancy__

                __relevancy__[{"path":"assets/basic/assets/asset.jpg","relevancy":"LOW","commit":"__current__"},{"path":"config/basic/config/data.log","relevancy":"HIGH","commit":"__current__"}]__relevancy__
            `,
        ];

        commitMessagesWithRelevancy.forEach(message => {
            const hasRelevancy = relevancyManager.doesCommitMessageHaveRelevancyData(message);

            if (!hasRelevancy) {
                console.debug(message);
            }

            expect(hasRelevancy).toBe(true);
        })
    })


    it("Correctly encodes relevancy data in a commit", async () => {
        const relevancyManager = new RelevancyManager();

        const mockCommit: Commit = {
            message: () => `[TEST-1234] This is a commit message
            
            `,
            sha: () => "sha",
        } as Commit;

        const generatedMessage = relevancyManager.convertRelevancyDataToCommitMessage(mockRelevancyData, mockCommit);

        expect(relevancyManager.doesCommitMessageHaveRelevancyData(generatedMessage)).toBe(true);

        // Read relevancy back

        const mockCommitWithGeneratedRelevancy: Commit = {
            message: () => generatedMessage,
            sha: () => "sha",
        } as Commit;

        const generatedRelevancyData: CommitMessageRelevancyInfo[] = relevancyManager.convertCommitMessageToRelevancyData(mockCommitWithGeneratedRelevancy, true);

        checkRelevancyAndFileData(generatedRelevancyData[0], mockFileData1, mockRelevancyData.get(mockFileData1), "sha");
        checkRelevancyAndFileData(generatedRelevancyData[1], mockFileData2, mockRelevancyData.get(mockFileData2), "sha");
        checkRelevancyAndFileData(generatedRelevancyData[2], mockFileData3, mockRelevancyData.get(mockFileData3), "sha");
    })

    it("Correctly reads multiple relevancies from a merge commit", async () => {
        const relevancyManager = new RelevancyManager();

        const mockCommitWithGeneratedRelevancy: Commit = {
            message: () => `[TEST-1234] This is a commit message with multiple relevancies
            


            
                __relevancy__[{"path":"src/basic/commands/command.ts","relevancy":"LOW","commit":"__current__"}]__relevancy__

                __relevancy__[{"path":"assets/basic/assets/asset.jpg","relevancy":"LOW","commit":"__current__"},{"path":"config/basic/config/data.log","relevancy":"HIGH","commit":"__current__"}]__relevancy__
            `,
            sha: () => "sha",
        } as Commit;

        expect(relevancyManager.doesCommitMessageHaveRelevancyData(mockCommitWithGeneratedRelevancy.message())).toBe(true);

        // Read relevancy back

        const generatedRelevancyData: CommitMessageRelevancyInfo[] = relevancyManager.convertCommitMessageToRelevancyData(mockCommitWithGeneratedRelevancy, true);

        expect(generatedRelevancyData.length).toBe(3);

        checkRelevancyAndFileData(generatedRelevancyData[0], mockFileData1, mockRelevancyData.get(mockFileData1), "sha");
        checkRelevancyAndFileData(generatedRelevancyData[1], mockFileData2, mockRelevancyData.get(mockFileData2), "sha");
        checkRelevancyAndFileData(generatedRelevancyData[2], mockFileData3, mockRelevancyData.get(mockFileData3), "sha");
    });

    it("Correctly replaces existing relevancy in a commit message (low -> high relevancy)", async () => {
        const FOLDER_PATH = makeUniqueFolderForTest();
        const REPO_PATH = cloneMockRepositoryToFolder(FOLDER_PATH);

        // Assume relevancy is already added

        const repository = await commitModitication(
            ["src/tagged-file.js"],
            REPO_PATH,
            `[TEST - 1234] There is correct relevancy data in this commit message

            __relevancy__[{"path":"src/tagged-file.js","relevancy":"LOW","commit":"__current__"}]__relevancy__
        `);

        const relevancyManager = new RelevancyManager();
        
        const headCommit = (await repository.getUnpushedCommits())[0];
        
        expect(headCommit).toBeDefined();
        expect(relevancyManager.doesCommitMessageHaveRelevancyData(headCommit.message())).toBe(true);

        // And user selects new relevancy using npx scope --add

        const userSelectedRelevancy = new Map<FileData, Relevancy>([
            [{
                oldPath: "src/tagged-file.js",
                newPath: "src/tagged-file.js",
                change: GitDeltaType.MODIFIED,
                linesAdded: 100,
                linesRemoved: 200,
            } as FileData,
            Relevancy.HIGH]
        ]);

        const newCommitMessage = relevancyManager.convertRelevancyDataToCommitMessage(userSelectedRelevancy, headCommit);
        
        expect(relevancyManager.doesCommitMessageHaveRelevancyData(newCommitMessage)).toBe(true);

        const extractedRelevancy = relevancyManager.convertCommitMessageToRelevancyData({
            message: () => newCommitMessage,
            sha: () => "sha",
        } as Commit);

        expect(extractedRelevancy[0]).toBeDefined();
        expect(extractedRelevancy[0].path).toBe("src/tagged-file.js");
        expect(extractedRelevancy[0].relevancy).toBe(Relevancy.HIGH);

        const tagsDefinitionFile = new TagsDefinitionFile(REPO_PATH);
        const fileTagsDatabase = new FileTagsDatabase(REPO_PATH);

        await repository.amendMostRecentCommit([fileTagsDatabase.getPath(), tagsDefinitionFile.getPath()], newCommitMessage, true);

        const headCommitAfterChange = (await repository.getUnpushedCommits())[0];

        expect(headCommitAfterChange).toBeDefined();
        const msg = headCommitAfterChange.message();
        
        expect(relevancyManager.doesCommitMessageHaveRelevancyData(headCommitAfterChange.message())).toBe(true);


        const newExtractedRelevancy = relevancyManager.convertCommitMessageToRelevancyData({
            message: () => headCommitAfterChange.message(),
            sha: () => "sha",
        } as Commit);

        expect(newExtractedRelevancy[0]).toBeDefined();
        expect(newExtractedRelevancy[0].path).toBe("src/tagged-file.js");
        expect(newExtractedRelevancy[0].relevancy).toBe(Relevancy.HIGH);
    });

    
    it("Correctly replaces existing relevancy in a commit message (high -> low relevancy)", async () => {
        const FOLDER_PATH = makeUniqueFolderForTest();
        const REPO_PATH = cloneMockRepositoryToFolder(FOLDER_PATH);

        // Assume relevancy is already added

        const repository = await commitModitication(
            ["src/tagged-file.js"],
            REPO_PATH,
            `[TEST - 1234] There is correct relevancy data in this commit message

            __relevancy__[{"path":"src/tagged-file.js","relevancy":"HIGH","commit":"__current__"}]__relevancy__
        `);

        const relevancyManager = new RelevancyManager();
        
        const headCommit = (await repository.getUnpushedCommits())[0];
        
        expect(headCommit).toBeDefined();
        expect(relevancyManager.doesCommitMessageHaveRelevancyData(headCommit.message())).toBe(true);

        // And user selects new relevancy using npx scope --add

        const userSelectedRelevancy = new Map<FileData, Relevancy>([
            [{
                oldPath: "src/tagged-file.js",
                newPath: "src/tagged-file.js",
                change: GitDeltaType.MODIFIED,
                linesAdded: 100,
                linesRemoved: 200,
            } as FileData,
            Relevancy.LOW]
        ]);

        const newCommitMessage = relevancyManager.convertRelevancyDataToCommitMessage(userSelectedRelevancy, headCommit);
        
        expect(relevancyManager.doesCommitMessageHaveRelevancyData(newCommitMessage)).toBe(true);

        const extractedRelevancy = relevancyManager.convertCommitMessageToRelevancyData({
            message: () => newCommitMessage,
            sha: () => "sha",
        } as Commit);

        expect(extractedRelevancy[0]).toBeDefined();
        expect(extractedRelevancy[0].path).toBe("src/tagged-file.js");
        expect(extractedRelevancy[0].relevancy).toBe(Relevancy.LOW);

        const tagsDefinitionFile = new TagsDefinitionFile(REPO_PATH);
        const fileTagsDatabase = new FileTagsDatabase(REPO_PATH);

        await repository.amendMostRecentCommit([fileTagsDatabase.getPath(), tagsDefinitionFile.getPath()], newCommitMessage, true);

        const headCommitAfterChange = (await repository.getUnpushedCommits())[0];

        expect(headCommitAfterChange).toBeDefined();
        const msg = headCommitAfterChange.message();
        
        expect(relevancyManager.doesCommitMessageHaveRelevancyData(headCommitAfterChange.message())).toBe(true);


        const newExtractedRelevancy = relevancyManager.convertCommitMessageToRelevancyData({
            message: () => headCommitAfterChange.message(),
            sha: () => "sha",
        } as Commit);

        expect(newExtractedRelevancy[0]).toBeDefined();
        expect(newExtractedRelevancy[0].path).toBe("src/tagged-file.js");
        expect(newExtractedRelevancy[0].relevancy).toBe(Relevancy.LOW);
    });
});
