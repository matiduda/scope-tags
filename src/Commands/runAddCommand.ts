import { GitRepository } from "../Git/GitRepository";
import { ConfigFile } from "../Scope/ConfigFile";
import { FileTagsDatabase } from "../Scope/FileTagsDatabase";
import { FileTagger } from "../Console/FileTagger";
import { TagsDefinitionFile } from "../Scope/TagsDefinitionFile";
import { RelevancyTagger } from "../Console/RelevancyTagger";

export function runAddCommand(args: Array<string>, root: string) {
    const repository = new GitRepository(root);
    repository.getFileDataForUnpushedCommits().then(async fileData => {

        const tagsDefinitionFile = new TagsDefinitionFile(root).load();
        const fileTagsDatabase = new FileTagsDatabase(root).load();
        const config = new ConfigFile(root).load();

        const fileTagger = new FileTagger(tagsDefinitionFile, fileTagsDatabase, repository);

        let fileDataToTag = fileTagsDatabase.updateDatabaseBasedOnChanges(fileData)
            .filter(file => !config.isFileExtensionIgnored(file.newPath));

        const relevancyTagger = new RelevancyTagger();

        fileTagger.start(fileDataToTag).then(async (_taggedFileData) => {

            // Select relevancy for each file
            const fileDataRelevancy = await relevancyTagger.start(fileDataToTag);

            console.log("All files tagged");

            // Save tags to database
            fileTagsDatabase.save();

            const newCommitMessage = relevancyTagger.convertRelevancyDataToCommitMessage(fileDataRelevancy);

            const mostRecentCommit = await repository.getLatestCommit();
            const mostRecentCommitSummary = mostRecentCommit.summary();
            const mostRecentCommitMessage = mostRecentCommit.message();

            if (relevancyTagger.doesCommitMessageHaveRelevancyData(mostRecentCommitMessage)) {
                throw new Error(`Commit '${mostRecentCommitSummary}' already has relevancy data, so it can't be saved.
    commit message: ${mostRecentCommitMessage}`);
            }

            await repository.amendMostRecentCommit(fileTagsDatabase.getPath(), newCommitMessage);

        }); // TODO: Save already tagged files
    }).catch(e => console.log("Canceled")); // TODO: Save already tagged files
}