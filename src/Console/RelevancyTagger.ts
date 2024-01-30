import { Commit } from "nodegit";
import { FileData, Relevancy } from "../Git/Types";

const { Scale } = require('enquirer');

type RelevancyDescription = {
    name: string,
    message: string,
};

type RelevancyEntry = FileData;

type RelevancyChoice = {
    name: string,
    message: string,
    initial: number,
}

type ScalePromptAnswerType = {
    [k: string]: number
}

type CommitMessageRelevancyInfo = {
    path: string,
    relevancy: string,
    commit: string
};

export class RelevancyTagger {
    private static COMMIT_MSG_PREFIX = "__relevancy__";


    private _relevancyDescriptions = new Map<Relevancy, RelevancyDescription>([
        [Relevancy.LOW, { name: "Low", message: "Does not list file at all (example: formatting changes)" }],
        [Relevancy.MEDIUM, { name: "Medium", message: "Does list tags for file, but does not search references for it" }],
        [Relevancy.HIGH, { name: "High", message: "Does list tags for file and performs full reference search" }],
    ])

    private static PAGE_LIMIT = 10;

    public constructor() { }

    public async start(entries: Array<RelevancyEntry>): Promise<Map<FileData, Relevancy>> {

        this._assertNoDuplicateEntries(entries);

        const answerMap = new Map<FileData, Relevancy>();

        const fullPages = Math.floor(entries.length / RelevancyTagger.PAGE_LIMIT);
        const totalPages = entries.length % RelevancyTagger.PAGE_LIMIT ? fullPages + 1 : fullPages;

        for (let i = 0; i < totalPages; i++) {
            const currentPageStartingIndex = i * RelevancyTagger.PAGE_LIMIT;
            const currentPageEntries = entries.slice(currentPageStartingIndex, currentPageStartingIndex + RelevancyTagger.PAGE_LIMIT)

            const answer = await this._getRelevancy(currentPageEntries, i, totalPages);

            // Map answers
            currentPageEntries.forEach(entry => {
                answerMap.set(entry, this._getRelevancyByIndex(answer[entry.oldPath]))
            });
        }
        return answerMap;
    }

    public convertRelevancyDataToCommitMessage(data: Map<FileData, Relevancy>): string {
        const relevancyArray: Array<CommitMessageRelevancyInfo> = [...data].map(([fileData, relevancy]) => ({
            path: fileData.oldPath,
            relevancy: relevancy,
            commit: fileData.commitedIn,
        } as CommitMessageRelevancyInfo));

        return `\n${RelevancyTagger.COMMIT_MSG_PREFIX}${JSON.stringify(relevancyArray)}`;
    }

    public convertCommitMessageToRelevancyData(commitMessage: string): CommitMessageRelevancyInfo {
        const prefixStartIndex = commitMessage.indexOf(RelevancyTagger.COMMIT_MSG_PREFIX);

        if (prefixStartIndex === -1) {
            throw new Error(`Commit message '${commitMessage}' does not include relevancy info`);
        }

        const relevancyJSON = commitMessage.substring(prefixStartIndex + RelevancyTagger.COMMIT_MSG_PREFIX.length);

        try {
            return JSON.parse(relevancyJSON) as CommitMessageRelevancyInfo;
        } catch (e) {
            throw new Error(`Could not parse relevancy data from commit message: '${commitMessage}'`);
        }
    }

    public doesCommitMessageHaveRelevancyData(commitMessage: string): boolean {
        return commitMessage.includes(RelevancyTagger.COMMIT_MSG_PREFIX);
    }

    private _assertNoDuplicateEntries(entries: Array<RelevancyEntry>) {
        entries.forEach((entry, index) => entries.forEach((duplicate, duplicateIndex) => {
            if (entry.oldPath === duplicate.oldPath && index !== duplicateIndex) {
                console.log(
                    `[RelevancyTagger] Found duplicate entry:
    1. ${entry.oldPath} at index ${index}
    2. ${duplicate.oldPath} at index ${duplicateIndex}`)
                throw new Error("Cannot have two entries with the same file path");
            }
        }));
    }

    private async _getRelevancy(entries: Array<RelevancyEntry>, currentPage: number, pageCount: number): Promise<ScalePromptAnswerType> {
        const header = pageCount > 1 ? ` (page ${currentPage + 1} of ${pageCount})` : "";

        const prompt = new Scale({
            name: 'relevancy',
            message: 'Please select expected level of impact of changes' + header,
            scale: this._getScale(),
            margin: [0, 0, 2, 1],
            choices: this._mapEntriesToChoices(entries),
        });

        return await prompt.run() as ScalePromptAnswerType;
    }

    private _getScale() {
        return Object.values(Relevancy).map((relevancy) => this._relevancyDescriptions.get(relevancy));
    }

    private _mapEntriesToChoices(entries: Array<RelevancyEntry>, initial = 1): Array<RelevancyChoice> {
        return entries.map(entry => ({
            name: entry.newPath,
            message: entry.newPath,
            initial: initial,
        } as RelevancyChoice))
    }

    private _getRelevancyByIndex(index: number): Relevancy {
        return Object.values(Relevancy)[index];
    }
}