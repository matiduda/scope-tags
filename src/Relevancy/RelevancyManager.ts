import { Commit } from "nodegit";
import { FileData, FilePath } from "../Git/Types";
import { Relevancy } from "./Relevancy";

const { Scale } = require('enquirer');

export type CommitMessageRelevancyInfo = {
    path: string,
    relevancy: Relevancy,
    commit: string
};

export type RelevancyMap = Map<FilePath, Array<CommitMessageRelevancyInfo>>;

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

export class RelevancyManager {

    private static COMMIT_MSG_PREFIX = "__relevancy__";
    private static CURRENT_COMMIT = "__current__";


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

        const fullPages = Math.floor(entries.length / RelevancyManager.PAGE_LIMIT);
        const totalPages = entries.length % RelevancyManager.PAGE_LIMIT ? fullPages + 1 : fullPages;

        for (let i = 0; i < totalPages; i++) {
            const currentPageStartingIndex = i * RelevancyManager.PAGE_LIMIT;
            const currentPageEntries = entries.slice(currentPageStartingIndex, currentPageStartingIndex + RelevancyManager.PAGE_LIMIT)

            const answer = await this._getRelevancy(currentPageEntries, i, totalPages);

            // Map answers
            currentPageEntries.forEach(entry => {
                answerMap.set(entry, this._getRelevancyByIndex(answer[entry.newPath]))
            });
        }

        return answerMap;
    }

    public convertRelevancyDataToCommitMessage(data: Map<FileData, Relevancy>, headCommit: Commit): string {
        // Store the relevancy from the commit if it has one
        let relevancyArrayFromCurrentCommit: CommitMessageRelevancyInfo[] = [];

        if (this.doesCommitMessageHaveRelevancyData(headCommit.message())) {
            relevancyArrayFromCurrentCommit = this.convertCommitMessageToRelevancyData(headCommit, false);
            console.log("Relevancy from current commit:");
            console.log(JSON.stringify(relevancyArrayFromCurrentCommit));
        }

        const relevancyArray: CommitMessageRelevancyInfo[] = [...data].map(([fileData, relevancy]) => {
            console.log(fileData.newPath);
            console.log(relevancy);

            // Check if fileData was commited in current head commit,
            // since this commit stores relevancy data and will be changed later,
            // store it's SHA as "__current__", so it can be read later...
            const commitShaOrIdentifier = fileData.commitedIn?.sha() === headCommit.sha()
                ? RelevancyManager.CURRENT_COMMIT
                : fileData.commitedIn;

            return {
                path: fileData.newPath,
                relevancy: relevancy,
                commit: commitShaOrIdentifier,
            } as CommitMessageRelevancyInfo;
        });

        // Merge relevancies - if some are duplicates, select those with higher relevancy
        const allRelevancies: CommitMessageRelevancyInfo[] = relevancyArray.concat(relevancyArrayFromCurrentCommit);
        const mergedRelevancies: CommitMessageRelevancyInfo[] = [];

        relevancyArray.concat(relevancyArrayFromCurrentCommit).forEach(relevancy => {
            console.log(JSON.stringify(relevancy));

            if (mergedRelevancies.some(mergedRelevancy => {
                console.log(JSON.stringify(mergedRelevancy));
                return mergedRelevancy.path === relevancy.path
            })) {
                return;
            }

            const relevanciesForThisFileData = allRelevancies.filter(mergedRelevancy => mergedRelevancy.path === relevancy.path);

            if (relevanciesForThisFileData.length === 0) {
                throw new Error("[RelevancyManager] Could not merge relevancy data to current head commit");
            } else if (relevanciesForThisFileData.length === 1) {
                mergedRelevancies.push(relevancy);
                return;
            } else {
                // Find highest relevancy for this file
                let highestPossibleRelevancyData = relevanciesForThisFileData[0];

                for (let i = 1; i < relevanciesForThisFileData.length; i++) {
                    if (this._getIndexByRelevancy(relevanciesForThisFileData[i].relevancy) > this._getIndexByRelevancy(highestPossibleRelevancyData.relevancy)) {
                        highestPossibleRelevancyData = relevanciesForThisFileData[i];
                    }
                }
                mergedRelevancies.push(highestPossibleRelevancyData);
            }
        });

        const outputRelevancyArray = JSON.stringify(mergedRelevancies);

        const commitMessageWithoutRelevancy = headCommit.message().replace(/__relevancy__.+__relevancy__/gs, "");

        return `${commitMessageWithoutRelevancy}\n${RelevancyManager.COMMIT_MSG_PREFIX}${outputRelevancyArray}${RelevancyManager.COMMIT_MSG_PREFIX}`;
    }

    public convertCommitMessageToRelevancyData(commit: Commit, replaceCurrentCommitSHA = true): Array<CommitMessageRelevancyInfo> {
        const commitMessage = commit.message();

        const prefixStartIndex = commitMessage.indexOf(RelevancyManager.COMMIT_MSG_PREFIX);
        const relevancyEndIndex = commitMessage.lastIndexOf(RelevancyManager.COMMIT_MSG_PREFIX);

        if (prefixStartIndex === -1) {
            throw new Error(`Commit message '${commitMessage}' does not include relevancy info`);
        }

        const relevancyJSON = commitMessage.substring(prefixStartIndex + RelevancyManager.COMMIT_MSG_PREFIX.length, relevancyEndIndex);

        let relevancyInfo = [];

        try {
            relevancyInfo = JSON.parse(relevancyJSON) as Array<CommitMessageRelevancyInfo>;
        } catch (e) {
            throw new Error(`Could not parse relevancy data from commit message: '${commitMessage}', found relevancy data: '${relevancyJSON}'`);
        }

        // Replace current commit' sha
        if (replaceCurrentCommitSHA) {
            relevancyInfo.forEach(info => {
                if (info.commit === RelevancyManager.CURRENT_COMMIT) {
                    info.commit = commit.sha();
                }
            });
        }
        return relevancyInfo;
    }

    // public addRelevancyFromCommit(fileDataRelevancy: Map<FileData, Relevancy>, commit: Commit) {
    //     const relevancyFromCommit = this.convertCommitMessageToRelevancyData(commitMessageWithRelevancy);
    //     relevancyFromCommit.forEach(relevancyEntry => {
    //         if(fileDataRelevancy.has)
    //     });
    // }

    public doesCommitMessageHaveRelevancyData(commitMessage: string): boolean {
        return commitMessage.includes(RelevancyManager.COMMIT_MSG_PREFIX);
    }

    public loadRelevancyMapFromCommits(commits: Commit[]): RelevancyMap {
        const relevancyTagger = new RelevancyManager();

        const commitToRelevancyMap: RelevancyMap = new Map();

        for (const commit of commits) {
            if (!relevancyTagger.doesCommitMessageHaveRelevancyData(commit.message())) {
                continue;
            }

            console.log(`[Scope tags]: Found relevancy info in commit: ${commit.summary()}`);
            const relevancyArray = relevancyTagger.convertCommitMessageToRelevancyData(commit);

            relevancyArray.forEach(relevancyEntry => {
                const commitRelevancies = commitToRelevancyMap.get(relevancyEntry.commit);

                if (!commitRelevancies) {
                    commitToRelevancyMap.set(relevancyEntry.commit, [relevancyEntry]);
                } else {
                    commitRelevancies.push(relevancyEntry);
                }
            });
        }
        return commitToRelevancyMap;
    }


    private _assertNoDuplicateEntries(entries: Array<RelevancyEntry>) {
        entries.forEach((entry, index) => entries.forEach((duplicate, duplicateIndex) => {
            if (entry.newPath === duplicate.newPath && index !== duplicateIndex) {
                console.log(
                    `[RelevancyManager] Found duplicate entry:
    1. ${entry.newPath} at index ${index}
    2. ${duplicate.newPath} at index ${duplicateIndex}`)
                throw new Error("[RelevancyManager] Cannot add relevancy with multiple entries the same file path");
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

    private _getIndexByRelevancy(relevancy: Relevancy): number {
        return Object.values(Relevancy).indexOf(relevancy);
    }
}
