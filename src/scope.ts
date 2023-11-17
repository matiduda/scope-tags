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
import { ReportGenerator } from "./Report/ReportGenerator";

// Will be needed to get output from script
const [, , ...args] = process.argv;

// Find git repository
const root: string = getGitProjectRoot();
if (!root) {
    console.error("Git repository not found.");
    process.exit(1);
}

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
        const fileTagsDatabase = new FileTagsDatabase(root).load();

        // Checks if all files from the commit are present in database (or excluded)
        const commitHash = args[1];
        if (!commitHash) {
            console.log("--verify requires commit hash, use: scope --verify <hash>");
            process.exit(1);
        }

        const repository = new GitRepository(root);

        repository.getCommitByHash(commitHash).then(async (commit: Commit) => {
            await verifyCommit(commit, fileTagsDatabase, repository);
        });
        break;
    }
    case "--verify-unpushed-commits": {
        // Checks if all files from unpushed commits are present in database (or excluded)

        const repository = new GitRepository(root);
        const fileTagsDatabase = new FileTagsDatabase(root).load();

        repository.getUnpushedCommits().then(async (commits: Commit[]) => {
            if (!commits.length) {
                console.log("No commits found that can be verified");
                process.exit(0);
            }

            for (const commit of commits) {
                await verifyCommit(commit, fileTagsDatabase, repository);
            }
        });
        break;
    }
    case "--report-for-commit": {
        // TODO: Run tag analysis
        break;
    }
    case "--report-for-commit-list": {
        // Checks if all files from the commit are present in database (or excluded)
        const commitListFile = args[1];
        if (!commitListFile) {
            console.log("--report-for-commit-list requires a path to file, use: --verify <hash>");
            process.exit(1);
        }

        const repository = new GitRepository(root);
        const configFile = new ConfigFile(root).load();
        const tagsDefinitionFile = new TagsDefinitionFile(root).load();
        const fileTagsDatabase = new FileTagsDatabase(root).load();

        const generator = new ReportGenerator(commitListFile, configFile, tagsDefinitionFile, fileTagsDatabase, repository);
        generator.notifyAllAffectedTickets().then(() => {
            console.log("[Scope tags] All tasks updated");
        })

        break;
    }
    case "--debug": {
        // TODO: Add verbose mode
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

async function verifyCommit(commit: Commit, database: FileTagsDatabase, repository: GitRepository) {
    const fileDataArray = await repository.getFileDataForCommit(commit);
    const statusMap = database.checkMultipleFileStatusInDatabase(fileDataArray);

    const filesNotPresentInDatabase = fileDataArray.filter(fileData => {
        return statusMap.get(fileData) === FileStatusInDatabase.NOT_IN_DATABASE;
    });


    if (filesNotPresentInDatabase.length) {
        console.log("Commit not verified, no tags found for required files:\n");
        filesNotPresentInDatabase.forEach(file => console.log(`- ${file.newPath}`));
        console.log("\nPlease run\n\npx scope --tag-unpushed-commits\n\nto tag them");

        process.exit(1);
    }
}