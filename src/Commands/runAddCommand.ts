import { GitRepository } from "../Git/GitRepository";
import { ConfigFile } from "../Scope/ConfigFile";
import { FileTagsDatabase } from "../Scope/FileTagsDatabase";
import { FileTagger } from "../Console/FileTagger";
import { TagsDefinitionFile } from "../Scope/TagsDefinitionFile";
import { RelevancyManager } from "../Relevancy/RelevancyManager";
import { FileData } from "../Git/Types";
import { Relevancy } from "../Relevancy/Relevancy";

export function runAddCommand(args: Array<string>, root: string) {
    const repository = new GitRepository(root);
    repository.getFileDataForUnpushedCommits().then(async fileData => {

        const tagsDefinitionFile = new TagsDefinitionFile(root).load();
        const fileTagsDatabase = new FileTagsDatabase(root).load();
        const config = new ConfigFile(root).load();

        const fileTagger = new FileTagger(tagsDefinitionFile, fileTagsDatabase, repository);

        let fileDataToTag = fileTagsDatabase.updateDatabaseBasedOnChanges(fileData)
            .filter(file => !config.isFileExtensionIgnored(file.newPath));

        if (fileDataToTag.length === 0) {
            console.log("[Scope tags] Found no commits that could be tagged.");
            return;
        }

        const relevancyTagger = new RelevancyManager();

        fileTagger.start(fileDataToTag).then(async (_taggedFileData) => {

            // Select relevancy for each file
            let fileDataRelevancy: Map<FileData, Relevancy> = new Map();

            try {
                fileDataRelevancy = await relevancyTagger.start(fileDataToTag);
            } catch (e) {
                console.log("[Scope tags] Could not add relevancy, the changes won't be saved.");
                return;
            }

            // Save tags to database
            fileTagsDatabase.save();

            console.log("[Scope tags] Changes saved to the database.");

            const mostRecentCommit = await repository.getLatestCommit();

            const newCommitMessage = relevancyTagger.convertRelevancyDataToCommitMessage(fileDataRelevancy, mostRecentCommit);

            const mostRecentCommitSummary = mostRecentCommit.summary();
            const mostRecentCommitMessage = mostRecentCommit.message();

            if (relevancyTagger.doesCommitMessageHaveRelevancyData(mostRecentCommitMessage)) {
                throw new Error(`Commit '${mostRecentCommitSummary}' already has relevancy data, so it can't be saved.
    commit message: ${mostRecentCommitMessage}`);
            }

            await repository.amendMostRecentCommit([fileTagsDatabase.getPath(), tagsDefinitionFile.getPath()], newCommitMessage);

        }); // TODO: Save already tagged files
    }).catch(e => console.log("Canceled")); // TODO: Save already tagged files - ???
}