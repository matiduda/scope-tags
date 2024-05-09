import { cloneMockRepositoryToFolder, makeUniqueFolderForTest } from "../_utils/utils";
import { CommitMessageRelevancyInfo, RelevancyManager } from "../../src/Relevancy/RelevancyManager";
import { FileData, GitDeltaType } from "../../src/Git/Types";
import { Relevancy } from "../../src/Relevancy/Relevancy";
import { Commit } from "nodegit";

const fs = require('fs');

const checkRelevancyAndFileData = (info: CommitMessageRelevancyInfo, fileData: FileData, expectedRelevancy: Relevancy | undefined, expectedCommitSHA: string) => {
    expect(0);
    expect(info.path).toBe(fileData.newPath);
    expect(info.relevancy).toBe(expectedRelevancy);
    expect(info.commit).toBe(expectedCommitSHA);
}

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

    it("Correctly encodes relevancy data in a commit", async () => {
        const FOLDER_PATH = makeUniqueFolderForTest();
        const REPO_PATH = cloneMockRepositoryToFolder(FOLDER_PATH);

        const relevancyManager = new RelevancyManager();

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
            [mockFileData2, Relevancy.MEDIUM],
            [mockFileData3, Relevancy.HIGH],
        ]);

        const mockCommit: Commit = {
            message: () => `[TEST-1234] This is a commit message
            
            `,
            sha: () => "sha",
        } as Commit;

        mockCommit.message

        const generatedMessage = relevancyManager.convertRelevancyDataToCommitMessage(mockRelevancyData, mockCommit);

        console.debug(generatedMessage);

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
});
