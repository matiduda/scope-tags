import { FileTagger } from "../Console/FileTagger";
import { GitRepository } from "../Git/GitRepository";
import { FileData } from "../Git/Types";
import { Relevancy } from "../Relevancy/Relevancy";
import { RelevancyManager } from "../Relevancy/RelevancyManager";
import { ConfigFile } from "../Scope/ConfigFile";
import { FileTagsDatabase } from "../Scope/FileTagsDatabase";
import { TagsDefinitionFile } from "../Scope/TagsDefinitionFile";

export function runAddCommand(args: Array<string>, root: string) {
    const repository = new GitRepository(root);
    repository.getFileDataForUnpushedCommits().then(async fileData => {

        const tagsDefinitionFile = new TagsDefinitionFile(root);
        const fileTagsDatabase = new FileTagsDatabase(root);
        const config = new ConfigFile(root)

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
                fileDataRelevancy = await relevancyTagger.start(fileDataToTag, fileTagsDatabase);
            } catch (e) {
                console.log("[Scope tags] Could not add relevancy, the changes won't be saved.");
                return;
            }

            // Save tags to database
            fileTagsDatabase.save();

            console.log("[Scope tags] Changes saved to the database.");

            const mostRecentCommit = await repository.getLatestCommit();

            const newCommitMessage = relevancyTagger.convertRelevancyDataToCommitMessage(fileDataRelevancy, mostRecentCommit);

            await repository.amendMostRecentCommit([fileTagsDatabase.getPath(), tagsDefinitionFile.getPath()], newCommitMessage);

        }); // TODO: Save already tagged files
    }).catch(e => {
        // Two possible cases:

        // 1. User requested exit
        // 2. Some real error happened

        console.log(e);
    }); // TODO: Save already tagged files - ???
}