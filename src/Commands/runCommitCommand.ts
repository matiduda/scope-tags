import { GitRepository } from "../Git/GitRepository";
import { ConfigFile } from "../Scope/ConfigFile";
import { FileTagsDatabase } from "../Scope/FileTagsDatabase";
import { FileTagger } from "../Console/FileTagger";
import { TagsDefinitionFile } from "../Scope/TagsDefinitionFile";

export function runCommitCommand(args: Array<string>, root: string) {
    // Checks if all files from the commit are present in database (or excluded)
    const commitHash = args[1];
    if (!commitHash) {
        console.log("--commit option requires complete git commit hash, use: scope --commit <hash>");
        process.exit(1);
    }

    const repository = new GitRepository(root);
    repository.getCommitByHash(commitHash).then(async commit => {

        const tagsDefinitionFile = new TagsDefinitionFile(root).load();
        const fileTagsDatabase = new FileTagsDatabase(root).load();
        const config = new ConfigFile(root).load();

        const fileTagger = new FileTagger(tagsDefinitionFile, fileTagsDatabase, repository);
        const fileData = await repository.getFileDataForCommit(commit);

        const fileDataToTag = fileTagsDatabase.updateDatabaseBasedOnChanges(fileData)
            .filter(fileData => !fileTagsDatabase.isIgnored(fileData.newPath) && !config.isFileExtensionIgnored(fileData.newPath));

        fileTagger.start(fileDataToTag).then(() => {
            console.log("\nAll files tagged. Saving to database...");
            fileTagsDatabase.save();
        });

    });
}
