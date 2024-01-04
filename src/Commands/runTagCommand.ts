import { GitRepository } from "../Git/GitRepository";
import { ConfigFile } from "../Scope/ConfigFile";
import { FileTagsDatabase } from "../Scope/FileTagsDatabase";
import { FileTagger } from "../Console/FileTagger";
import { fileExists, isDirectory, getAllFilesFromDirectory } from "../FileSystem/fileSystemUtils";
import { TagsDefinitionFile } from "../Scope/TagsDefinitionFile";

export function runTagCommitCommand(args: Array<string>, root: string) {
    const path = args[1];
    if (!path) {
        console.log("--tag option requires path to file or folder, use: scope --tag <path>");
        process.exit(1);
    } else if (!fileExists(path)) {
        console.log(`File or directory '${path}' does not exist`);
        process.exit(1);
    }

    const filesToTag = isDirectory(path) ? getAllFilesFromDirectory(path) : [path];

    if (!filesToTag.length) {
        console.log(`There are no files to tag for ${path}`);
    }

    const config = new ConfigFile(root).load();
    const repository = new GitRepository(root);
    const tagsDefinitionFile = new TagsDefinitionFile(root).load();
    const fileTagsDatabase = new FileTagsDatabase(root).load();

    const fileTagger = new FileTagger(tagsDefinitionFile, fileTagsDatabase, repository);

    const filesToCheck = filesToTag.filter(file => !config.isFileExtensionIgnored(file));
    const filesInDatabase = filesToCheck.filter(file => fileTagsDatabase.isFileInDatabase(file));
    const ignoredFilesInDatabase = filesToCheck.filter(file => fileTagsDatabase.isIgnored(file));

    if (!filesInDatabase.length && !ignoredFilesInDatabase.length) {
        const fileData = repository.convertFilesToFileData(filesToTag);

        fileTagger.start(fileData).then(() => {
            console.log("All files tagged");
        });
    } else {
        // Ask the user if they want to re-tag selected files
        fileTagger.selectFilesToAppend(filesInDatabase, ignoredFilesInDatabase).then(async selectedFiles => {
            // Remove selected ignore status from selected ignored files
            selectedFiles.forEach(selectedFile => {
                if (selectedFile.ignored) {
                    fileTagsDatabase.unIgnoreFile(selectedFile.path);
                }
            });

            if (!selectedFiles.length) {
                // If user doesn't select any file, tag the remaining available files
                selectedFiles = filesToCheck.filter(file => !filesInDatabase.includes(file) && !ignoredFilesInDatabase.includes(file)).map(file => ({ path: file, ignored: false }));
            }

            // Map files to be compatible with git-based file tagger
            const fileData = repository.convertFilesToFileData(selectedFiles.map(selectedFile => selectedFile.path));

            await fileTagger.start(fileData, false);
        });
    }
}