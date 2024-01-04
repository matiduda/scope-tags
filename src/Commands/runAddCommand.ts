import { GitRepository } from "../Git/GitRepository";
import { ConfigFile } from "../Scope/ConfigFile";
import { FileTagsDatabase } from "../Scope/FileTagsDatabase";
import { FileTagger } from "../Console/FileTagger";
import { TagsDefinitionFile } from "../Scope/TagsDefinitionFile";

export function runAddCommand(args: Array<string>, root: string) {
    const repository = new GitRepository(root);
    repository.getFileDataForUnpushedCommits().then(fileData => {

        const tagsDefinitionFile = new TagsDefinitionFile(root).load();
        const fileTagsDatabase = new FileTagsDatabase(root).load();
        const config = new ConfigFile(root).load();

        const fileTagger = new FileTagger(tagsDefinitionFile, fileTagsDatabase, repository);

        const fileDataToTag = fileTagsDatabase.updateDatabaseBasedOnChanges(fileData)
            .filter(file => !config.isFileExtensionIgnored(file.newPath));

        fileTagger.start(fileDataToTag).then(async () => {
            console.log("All files tagged");

            await repository.amendFileToMostRecentCommit(fileTagsDatabase.getPath());

        }); // TODO: Save already tagged files
        // }).catch(e => console.log("Canceled")); // TODO: Save already tagged files
    });
}