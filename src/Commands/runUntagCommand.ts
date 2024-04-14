import { YesNoMenu } from "../Console/YesNoMenu";
import { fileExists, isDirectory, getAllFilesFromDirectory } from "../FileSystem/fileSystemUtils";
import { FileTagsDatabase } from "../Scope/FileTagsDatabase";
import { ConfigFile } from "../Scope/ConfigFile";

export function runUntagCommand(args: Array<string>, root: string) {
    const path = args[1];
    if (!path) {
        console.log("--untag option requires path to file or folder, use: scope --untag <path>");
        process.exit(1);
    } else if (!fileExists(path)) {
        console.log(`File or directory '${path}' does not exist`);
        process.exit(1);
    }

    const filesToUntag = isDirectory(path) ? getAllFilesFromDirectory(path) : [path];

    if (!filesToUntag.length) {
        console.log(`There are no files to untag for ${path}`);
    }

    const fileTagsDatabase = new FileTagsDatabase(root).load();
    const config = new ConfigFile(root).load();

    const filesToCheck = filesToUntag.filter(file => !config.isFileExtensionIgnored(file));
    console.log(filesToUntag);
    const filesInDatabase = filesToCheck.filter(file => fileTagsDatabase.isFileInDatabase(file));
    const ignoredFilesInDatabase = filesToCheck.filter(file => fileTagsDatabase.isIgnored(file));

    if (!filesInDatabase.length && !ignoredFilesInDatabase.length) {
        console.log("No info about files found in database");
    } else {
        if (filesInDatabase.length) {
            console.log("\n── Tagged files ──\n");
            filesInDatabase.forEach(file => {
                const tagsForFile = fileTagsDatabase.getTagIdentifiersForFile(file);
                console.log(`${file}\t→ ${tagsForFile.map(tagIdentifier => `${tagIdentifier.tag}`).join(", ")}`)
            })
        }
        if (ignoredFilesInDatabase.length) {
            console.log("\n── Ignored files ──\n");
            ignoredFilesInDatabase.forEach(file => console.log(`${file}`));
        }

        const confirm = new YesNoMenu();
        confirm.ask("Are you sure you want to remove these files from database? (tagged and ignored)").then(value => {
            if (value) {
                fileTagsDatabase.removeTagsForFiles(filesInDatabase);
                ignoredFilesInDatabase.forEach(file => fileTagsDatabase.unIgnoreFile(file));
                fileTagsDatabase.save();
                console.log("Info about files removed.");
            } else {
                console.log("Files were not touched.");
            }
        })
    }
}