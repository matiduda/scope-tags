#!/usr/bin/env node
import { getGitProjectRoot } from "./Git/Project";
import { ConfigFile } from "./Scope/ConfigFile";
import { FileTagsDatabase } from "./Scope/FileTagsDatabase";
import { ensureScopeFolderExists, scopeFolderExists } from "./FileSystem/fileSystemUtils";
import { TagsDefinitionFile } from "./Scope/TagsDefinitionFile";
import { Menu } from "./Console/Menu";
import { YesNoMenu } from "./Console/YesNoMenu";

// Will be needed to get output from script
const [, , ...args] = process.argv;

// Find git repository
const root: string = getGitProjectRoot();
console.log("Found Git repository in: " + root);

function startCLI() {
    const configFile = new ConfigFile(root).load();
    const tagsDefinitionFile = new TagsDefinitionFile(root).load();
    const fileTagsDatabase = new FileTagsDatabase(root).load();

    new Menu(configFile, tagsDefinitionFile, fileTagsDatabase).start().then(() => console.log("Exit."));
}

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

if (args[0] === "--report") {
    // TODO: Run tag analysis
    process.exit(0);
}

if (args[0] === "--last-commit") {
    // TODO: Tag last commit

    // const repository = new GitRepository(root);
    // repository.getFileDataFromLastCommit().then(data => {
    //     console.log("OK:");
    //     console.log(data)
    // });
    process.exit(0);
}

if (args[0] === "--commits") {
    // TODO: Tag multiple commits

    // const repository = new GitRepository(root);
    // repository.getFileDataFromLastCommit().then(data => {
    //     console.log("OK:");
    //     console.log(data)
    // });
    process.exit(0);
}

if (args[0]) {
    // Change tags of file / directory
    process.exit(0);
}