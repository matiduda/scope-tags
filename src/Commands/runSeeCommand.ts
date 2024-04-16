import { ConfigFile } from "../Scope/ConfigFile";
import { FileTagsDatabase } from "../Scope/FileTagsDatabase";
import { fileExists, getAllFilesFromDirectory, isDirectory } from "../FileSystem/fileSystemUtils";
import { runListUnpushedCommitsCommand } from "./runListUnpushedCommitsCommand";

export function runSeeCommand(args: Array<string>, root: string) {
    const path = args[1];
    if (!path) {
        runListUnpushedCommitsCommand(args, root);
        return;
    } else if (!fileExists(path)) {
        console.log(`File or directory '${path}' does not exist`);
        process.exit(1);
    }
    const filesToSee = isDirectory(path) ? getAllFilesFromDirectory(path) : [path];

    const config = new ConfigFile(root);
    const fileTagsDatabase = new FileTagsDatabase(root);

    const filesToCheck = filesToSee.filter(file => !config.isFileExtensionIgnored(file));
    const filesInDatabase = filesToCheck.filter(file => fileTagsDatabase.isFileInDatabase(file));
    const ignoredFilesInDatabase = filesToCheck.filter(file => fileTagsDatabase.isIgnored(file));

    if (!filesInDatabase.length && !ignoredFilesInDatabase.length) {
        console.log("No info about files found in database");
    } else {
        if (filesInDatabase.length) {
            console.log("\n── Tagged files ──\n");
            filesInDatabase.forEach(file => {
                const tagsForFile = fileTagsDatabase.getTagIdentifiersForFile(file);
                console.log(`${file}\t→ ${tagsForFile.map(tagIdentifier => `${tagIdentifier.tag}`).join(", ")}`);
            });
        }
        if (ignoredFilesInDatabase.length) {
            console.log("\n── Ignored files ──\n");
            ignoredFilesInDatabase.forEach(file => console.log(`${file}`));
        }
    }
}