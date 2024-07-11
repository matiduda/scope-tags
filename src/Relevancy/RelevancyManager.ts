import { Commit } from "nodegit";
import { FileData } from "../Git/Types";
import { FileTagsDatabase } from "../Scope/FileTagsDatabase";
import { CommitMessageRelevancyInfo, Relevancy, RelevancyDescriptions, RelevancyMap } from "./Relevancy";

const { Scale } = require('enquirer');

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

    private static PAGE_LIMIT = 10;

    public constructor() { }

    public async start(entries: Array<RelevancyEntry>, fileTagsDatabase: FileTagsDatabase): Promise<Map<FileData, Relevancy>> {

        const notIgnoredEntries = entries.filter(entry => !fileTagsDatabase.isIgnored(entry.newPath));

        const uniqueEntries = notIgnoredEntries.filter((value, index, self) =>
            index === self.findIndex((t) => (
                t.newPath === value.newPath
            ))
        );

        const answerMap = new Map<FileData, Relevancy>();

        const fullPages = Math.floor(uniqueEntries.length / RelevancyManager.PAGE_LIMIT);
        const totalPages = uniqueEntries.length % RelevancyManager.PAGE_LIMIT ? fullPages + 1 : fullPages;

        for (let i = 0; i < totalPages; i++) {
            const currentPageStartingIndex = i * RelevancyManager.PAGE_LIMIT;
            const currentPageEntries = uniqueEntries.slice(currentPageStartingIndex, currentPageStartingIndex + RelevancyManager.PAGE_LIMIT)

            const answer = await this._getRelevancy(currentPageEntries, i, totalPages);

            // Map answers
            currentPageEntries.forEach(uniqueEntry => {
                // Set every matching fileData to the same relevancy, this doesn't neet to be change specific

                const matchingFileData = notIgnoredEntries.filter(entry => entry.newPath === uniqueEntry.newPath);
                matchingFileData.forEach(fileData => answerMap.set(fileData, this._getRelevancyByIndex(answer[uniqueEntry.newPath])));
            });
        }

        return answerMap;
    }

    public convertRelevancyDataToCommitMessage(data: Map<FileData, Relevancy>, headCommit: Commit): string {
        // Store the relevancy from the commit if it has one
        let relevancyArrayFromCurrentCommit: CommitMessageRelevancyInfo[] = [];

        if (this.doesCommitMessageHaveRelevancyData(headCommit.message())) {
            relevancyArrayFromCurrentCommit = this.convertCommitMessageToRelevancyData(headCommit, false);
        }

        const relevancyArray: CommitMessageRelevancyInfo[] = [...data].map(([fileData, relevancy]) => {
            // Check if fileData was commited in current head commit,
            // since this commit stores relevancy data and will be changed later,
            // store it's SHA as "__current__", so it can be read later...
            const commitShaOrIdentifier = fileData.commitedIn?.sha() === headCommit.sha()
                ? RelevancyManager.CURRENT_COMMIT
                : fileData.commitedIn?.sha();

            return {
                path: fileData.newPath,
                relevancy: relevancy,
                commit: commitShaOrIdentifier,
            } as CommitMessageRelevancyInfo;
        });

        // Merge relevancies - if some are duplicates, overwrite them
        relevancyArray.forEach(relevancyEntry => {
            const matchingRelevancyFromCurrentCommit = relevancyArrayFromCurrentCommit.find(relevancy => relevancy.path === relevancyEntry.path);

            if(matchingRelevancyFromCurrentCommit) {
                matchingRelevancyFromCurrentCommit.relevancy = relevancyEntry.relevancy;
                matchingRelevancyFromCurrentCommit.commit = relevancyEntry.commit;
            } else {
                relevancyArrayFromCurrentCommit.push(relevancyEntry);
            }
        });

        const outputRelevancyArray = JSON.stringify(relevancyArray);

        const commitMessageWithoutRelevancy = headCommit.message().replace(/__relevancy__.+__relevancy__/gs, "");

        return `${commitMessageWithoutRelevancy}\n${RelevancyManager.COMMIT_MSG_PREFIX}${outputRelevancyArray}${RelevancyManager.COMMIT_MSG_PREFIX}`;
    }

    public convertCommitMessageToRelevancyData(commit: Commit, replaceCurrentCommitSHA = true): Array<CommitMessageRelevancyInfo> {

        if (!this.doesCommitMessageHaveRelevancyData(commit.message())) {
            throw new Error(`Commit message '${commit.message()}' does not include correct relevancy data`);
        }

        const info: CommitMessageRelevancyInfo[] = [];

        // Check every line, as commit could have multiple relevancies

        let currentLine = 0;

        for (const line of commit.message().split("\n")) {
            currentLine++;

            const prefixStartIndex = line.indexOf(RelevancyManager.COMMIT_MSG_PREFIX);
            const relevancyEndIndex = line.lastIndexOf(RelevancyManager.COMMIT_MSG_PREFIX);

            if (prefixStartIndex === -1 || relevancyEndIndex === -1 || prefixStartIndex === relevancyEndIndex) {
                continue;
            }

            const relevancyJSON = line.substring(prefixStartIndex + RelevancyManager.COMMIT_MSG_PREFIX.length, relevancyEndIndex);

            try {
                const parsedRelevancy = JSON.parse(relevancyJSON) as Array<CommitMessageRelevancyInfo>;

                parsedRelevancy.forEach(relevancy => {
                    // Replace current commit' sha
                    if (replaceCurrentCommitSHA) {
                        if (relevancy.commit === RelevancyManager.CURRENT_COMMIT) {
                            relevancy.commit = commit.sha();
                        }
                    }
                    info.push(relevancy)
                });
            } catch (e) {
                throw new Error(`Could not parse relevancy data from line ${currentLine}: '${line}', found relevancy data: '${relevancyJSON}'`);
            }
        }

        return info;
    }

    // public addRelevancyFromCommit(fileDataRelevancy: Map<FileData, Relevancy>, commit: Commit) {
    //     const relevancyFromCommit = this.convertCommitMessageToRelevancyData(commitMessageWithRelevancy);
    //     relevancyFromCommit.forEach(relevancyEntry => {
    //         if(fileDataRelevancy.has)
    //     });
    // }

    public doesCommitMessageHaveRelevancyData(commitMessage: string): boolean {

        // Check every line, as commit could have multiple relevancies

        let commitMessageHasRelevancy = false;

        for (const line of commitMessage.split("\n")) {
            const prefixStartIndex = line.indexOf(RelevancyManager.COMMIT_MSG_PREFIX);
            const relevancyEndIndex = line.lastIndexOf(RelevancyManager.COMMIT_MSG_PREFIX);

            if (prefixStartIndex === -1 || relevancyEndIndex === -1 || prefixStartIndex === relevancyEndIndex) {
                continue;
            }

            const relevancyJSON = line.substring(prefixStartIndex + RelevancyManager.COMMIT_MSG_PREFIX.length, relevancyEndIndex);

            try {
                JSON.parse(relevancyJSON);
                commitMessageHasRelevancy = true;
            } catch (e) {
                return false;
            }
        }

        return commitMessageHasRelevancy;
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
        return Object.values(Relevancy).map((relevancy) => RelevancyDescriptions.get(relevancy));
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
