#!/usr/bin/env node
import { getGitProjectRoot } from "./Git/Project";
import { ConfigFile } from "./Scope/ConfigFile";
import { FileTagsDatabase } from "./Scope/FileTagsDatabase";
import { ensureScopeFolderExists, scopeFolderExists } from "./FileSystem/fileSystemUtils";
import { TagsDefinitionFile } from "./Scope/TagsDefinitionFile";
import { Menu } from "./Console/Menu";
import { YesNoMenu } from "./Console/YesNoMenu";
import { GitRepository } from "./Git/GitRepository";
import { FileTagger } from "./Console/FileTagger";

// Will be needed to get output from script
const [, , ...args] = process.argv;

console.log("args:", args);

// Find git repository
const root: string = getGitProjectRoot();
console.log("Found Git repository in: " + root);

function startCLI() {
    const configFile = new ConfigFile(root).load();
    const tagsDefinitionFile = new TagsDefinitionFile(root).load();
    const fileTagsDatabase = new FileTagsDatabase(root).load();

    new Menu(tagsDefinitionFile).start().then(() => console.log("Exit."));
}

switch (args[0]) {
    case "--report": {
        // TODO: Run tag analysis
        break;
    }
    case "--last-commit": {
        const repository = new GitRepository(root);
        repository.getFileDataFromLastCommit().then(fileData => {

            const configFile = new ConfigFile(root).load();
            const tagsDefinitionFile = new TagsDefinitionFile(root).load();
            const fileTagsDatabase = new FileTagsDatabase(root).load();

            const fileTagger = new FileTagger(tagsDefinitionFile, fileTagsDatabase, repository);

            fileTagger.start(fileData).then(() => {
                console.log("All files tagged");

                repository.getLatestCommit().then(commit => {
                    repository.markCommitAsDone(commit).then(() => process.exit(0));
                })
            })
        });
        break;
    }
    case "--report": {
        // TODO: Run tag analysis
        break;
    }
    case "--commits": {
        // TODO: Tag multiple commits

        // const repository = new GitRepository(root);
        // repository.getFileDataFromLastCommit().then(data => {
        //     console.log("OK:");
        //     console.log(data)
        // });
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

