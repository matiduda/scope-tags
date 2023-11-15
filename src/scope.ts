#!/usr/bin/env node
import { getGitProjectRoot } from "./Git/Project";
import { ConfigFile } from "./Scope/ConfigFile";
import { FileStatusInDatabase, FileTagsDatabase } from "./Scope/FileTagsDatabase";
import { ensureScopeFolderExists, scopeFolderExists } from "./FileSystem/fileSystemUtils";
import { TagsDefinitionFile } from "./Scope/TagsDefinitionFile";
import { Menu } from "./Console/Menu";
import { YesNoMenu } from "./Console/YesNoMenu";
import { GitRepository } from "./Git/GitRepository";
import { FileTagger } from "./Console/FileTagger";
import { Commit } from "nodegit";

// Will be needed to get output from script
const [, , ...args] = process.argv;

console.log("args:", args);

// Find git repository
const root: string = getGitProjectRoot();
console.log("Found Git repository in: " + root);

switch (args[0]) {
    case "--tag-unpushed-commits": {

        const repository = new GitRepository(root);
        repository.getFileDataForUnpushedCommits().then(fileData => {

            const configFile = new ConfigFile(root).load();
            const tagsDefinitionFile = new TagsDefinitionFile(root).load();
            const fileTagsDatabase = new FileTagsDatabase(root).load();

            const fileTagger = new FileTagger(tagsDefinitionFile, fileTagsDatabase, repository);

            fileTagger.start(fileData).then(() => {
                console.log("All files tagged");
            });
        });
        break;
    }
    case "--verify": {
        // Checks if all files from the commit are present in database (or excluded)
        const commitHash = args[1];
        if (!commitHash) {
            console.log("--verify requires commit hash, usa: scope --verify <hash>");
            process.exit(1);
        }

        const repository = new GitRepository(root);
        repository.getCommitByHash(commitHash).then((commit: Commit) => {

            repository.getFileDataForCommit(commit).then(fileDataArray => {
                console.log(`Checking files for commit '${commit.message().trim()}'`)
                const fileTagsDatabase = new FileTagsDatabase(root).load();

                const statusMap = fileTagsDatabase.checkMultipleFileStatusInDatabase(fileDataArray);

                const filesNotPresentInDatabase = fileDataArray.filter(fileData => {
                    statusMap.get(fileData) !== FileStatusInDatabase.NOT_IN_DATABASE;
                });

                if (filesNotPresentInDatabase.length) {
                    console.log("Commit not verified, no tags found for required files:");
                    filesNotPresentInDatabase.forEach(console.log);
                    process.exit(2);
                } else {
                    console.log("Commit not verified, no tags found for required files:");
                }
            });
        });
        break;
    }
    case "--report": {
        // TODO: Run tag analysis
        break;
    }
    default: {
        if (!scopeFolderExists(root)) {
            new YesNoMenu().ask("Do you want to create empty configuration?").then(answer => {
                if (answer) {
                    const scopeFolderPath = ensureScopeFolderExists(root);
                    [
                        new ConfigFile(root),
                        new TagsDefinitionFile(root),
                        new FileTagsDatabase(root),
                    ].forEach(config => config.initDefault());

                    console.log("\nInitialized empty configuration at:\n" + scopeFolderPath);
                } else {
                    console.log("Exiting.");
                    process.exit(0);
                }
                startCLI();
            });
        } else {
            startCLI();
        }
        break;
    }
}

function startCLI() {
    const configFile = new ConfigFile(root).load();
    const tagsDefinitionFile = new TagsDefinitionFile(root).load();
    const fileTagsDatabase = new FileTagsDatabase(root).load();

    new Menu(tagsDefinitionFile).start().then(() => console.log("Exit."));
}