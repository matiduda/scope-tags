#!/usr/bin/env node
import { getGitProjectRoot } from "./Git/Project";
import { ConfigFile } from "./Scope/ConfigFile";
import { FileStatusInDatabase, FileTagsDatabase } from "./Scope/FileTagsDatabase";
import { ensureScopeFolderExists, fileExists, getAllFilesFromDirectory, isDirectory, scopeFolderExists } from "./FileSystem/fileSystemUtils";
import { TagsDefinitionFile } from "./Scope/TagsDefinitionFile";
import { Menu } from "./Console/Menu";
import { YesNoMenu } from "./Console/YesNoMenu";
import { GitRepository } from "./Git/GitRepository";
import { FileTagger } from "./Console/FileTagger";
import { Commit } from "nodegit";
import { ReportGenerator } from "./Report/ReportGenerator";
import { BuildIntegration } from "./Report/BuildIntegration";
import { TSReferenceFinder } from "./References/TSReferenceFinder";
import { IReferenceFinder } from "./References/IReferenceFinder";
import { ExternalMapReferenceFinder } from "./References/ExternalMapReferenceFinder";

// Will be needed to get output from script
const [, , ...args] = process.argv;

// Find git repository
const root: string = getGitProjectRoot();
if (!root) {
    console.error("Git repository not found.");
    process.exit(1);
}

switch (args[0]) {
    case "--tag": {
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


        const repository = new GitRepository(root);
        const tagsDefinitionFile = new TagsDefinitionFile(root).load();
        const fileTagsDatabase = new FileTagsDatabase(root).load();

        const fileTagger = new FileTagger(tagsDefinitionFile, fileTagsDatabase, repository);

        const filesInDatabase = filesToTag.filter(file => fileTagsDatabase.isFileInDatabase(file));

        const ignoredFilesInDatabase = filesToTag.filter(file => fileTagsDatabase.isIgnored(file));

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
                    console.log(selectedFile.ignored);
                    if (selectedFile.ignored) {
                        fileTagsDatabase.unIgnoreFile(selectedFile.path);
                    }
                });

                // Map files to be compatible with git-based file tagger
                const fileData = repository.convertFilesToFileData(selectedFiles.map(selectedFile => selectedFile.path));

                await fileTagger.start(fileData);
                console.log("All files tagged");
            });
        }
        break;
    }
    case "--see": {
        const path = args[1];
        if (!path) {
            console.log("--see option requires path to file or folder, use: scope --see <path>");
            process.exit(1);
        } else if (!fileExists(path)) {
            console.log(`File or directory '${path}' does not exist`);
            process.exit(1);
        }

        const filesToSee = isDirectory(path) ? getAllFilesFromDirectory(path) : [path];

        // if (!filesToSee.length) {
        //     console.log(`There are no files to untag for ${path}`);
        // }

        const fileTagsDatabase = new FileTagsDatabase(root).load();

        const filesInDatabase = filesToSee.filter(file => fileTagsDatabase.isFileInDatabase(file));
        const ignoredFilesInDatabase = filesToSee.filter(file => fileTagsDatabase.isIgnored(file));

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
        }
        break;
    }
    case "--untag": {
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

        const filesInDatabase = filesToUntag.filter(file => fileTagsDatabase.isFileInDatabase(file));
        const ignoredFilesInDatabase = filesToUntag.filter(file => fileTagsDatabase.isIgnored(file));

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

        break;
    }
    case "--commit": {
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

            const fileTagger = new FileTagger(tagsDefinitionFile, fileTagsDatabase, repository);
            const fileData = await repository.getFileDataForCommit(commit);

            const fileDataToTag = fileTagsDatabase.updateDatabaseBasedOnChanges(fileData);

            fileTagger.start(fileDataToTag).then(() => {
                console.log("All files tagged");
            });
        });
        break;
    }
    case "--addtags": {
        const repository = new GitRepository(root);
        repository.getFileDataForUnpushedCommits().then(fileData => {

            const tagsDefinitionFile = new TagsDefinitionFile(root).load();
            const fileTagsDatabase = new FileTagsDatabase(root).load();
            const fileTagger = new FileTagger(tagsDefinitionFile, fileTagsDatabase, repository);

            const fileDataToTag = fileTagsDatabase.updateDatabaseBasedOnChanges(fileData);

            fileTagger.start(fileDataToTag).then(async () => {
                console.log("All files tagged");

                await repository.amendFileToMostRecentCommit(fileTagsDatabase.getPath());

            }); // TODO: Save already tagged files
            // }).catch(e => console.log("Canceled")); // TODO: Save already tagged files
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
        console.log("Scope tags: All commits verified");
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
        console.log("Scope tags: All commits verified");
        break;
    }
    case "--report-for-commit": {
        // Checks if all files from the commit are present in database (or excluded)
        const hash = args[1];
        if (!hash) {
            console.log("--report-for-commit requires commit hash, use: --report-for-commit <hash>");
            process.exit(1);
        }

        const repository = new GitRepository(root);
        const tagsDefinitionFile = new TagsDefinitionFile(root).load();
        const fileTagsDatabase = new FileTagsDatabase(root).load();
        const configFile = new ConfigFile(root).load();

        const referenceFinders: Array<IReferenceFinder> = [];

        const projects = configFile.getProjects();
        projects.forEach(project => {
            referenceFinders.push(new TSReferenceFinder(root, project.location));
            if (project.useExternalImportMap) {
                if (!project.supportedFiles) {
                    throw new Error(
                        `You have to specify supported file extenstions for project ${project.name}: add 'supportedFiles: [".extension"]' to config file`
                    );
                }
                referenceFinders.push(new ExternalMapReferenceFinder(project.useExternalImportMap, project.supportedFiles));
            }
        })

        const generator = new ReportGenerator(repository, tagsDefinitionFile, fileTagsDatabase, referenceFinders);

        repository.getCommitByHash(hash).then(async (commit: Commit) => {
            // console.log("Commit: " + commit.message().trim());

            const report = await generator.generateReportForCommit(commit);
            generator.printReportAsTable(report);

            // report.allModules.forEach(module => console.log(module.module, module.files))
        });
        break;
    }
    case "--report-for-commit-list": {
        // Checks if all files from the commit are present in database (or excluded)
        const buildDataFile = args[1];
        if (!buildDataFile) {
            console.log("--report-for-commit-list requires a path to a file with commit list, use: --report-for-commit-list <file>");
            process.exit(1);
        }

        const repository = new GitRepository(root);
        const configFile = new ConfigFile(root).load();
        const tagsDefinitionFile = new TagsDefinitionFile(root).load();
        const fileTagsDatabase = new FileTagsDatabase(root).load();

        const referenceFinders: Array<IReferenceFinder> = [];

        const projects = configFile.getProjects();
        projects.forEach(project => {
            referenceFinders.push(new TSReferenceFinder(root, project.location));
            if (project.useExternalImportMap) {
                if (!project.supportedFiles) {
                    throw new Error(
                        `You have to specify supported file extenstions for project ${project.name}: add 'supportedFiles: [".extension"]' to config file`
                    );
                }
                referenceFinders.push(new ExternalMapReferenceFinder(project.useExternalImportMap, project.supportedFiles));
            }
        })

        const generator = new ReportGenerator(repository, tagsDefinitionFile, fileTagsDatabase, referenceFinders);

        const buildIntegration = new BuildIntegration(buildDataFile, repository, configFile);
        const uniqueIssues = buildIntegration.getUniqueIssues();

        uniqueIssues.forEach(issue => {
            const commits = buildIntegration.getIssueCommits(issue);

            repository.getCommitsByHashes(commits.map(commit => commit.hash)).then(async (commits: Commit[]) => {
                const report = await generator.generateReportForCommits(commits);

                generator.printReportAsTable(report); // TODO: Remove
                await buildIntegration.updateIssue(issue, report);
            });
        });
        break;
    }
    case "--find-references": {
        const filePath = args[1];
        if (!filePath) {
            console.log("--report-for-commit-list requires a path to build metadata, use: --report-for-commit-list <file>");
            process.exit(1);
        }

        const tsReferenceFinder = new TSReferenceFinder(root, "tsconfig.json");
        tsReferenceFinder.findReferences(filePath);
        break;
    }
    case "--help": {
        console.log(`
    scope\t\t\tStarts command line interface, which enables you to add and remove tags and modules, and assign tags between modules

Definitions:

    "tag"
    
        Represents the most basic unit of functionality from user perspective. Typically cannot be divided into smaller parts. eg. "Start button"
    
    "module"
    
        Represents a collection of tags, which can corelate to a behaviour, single view or an action from user perspective. eg. "Main menu"
    
Options:
        
    --tag\t\t\tEnables to tag specific files or directories, usage: scope --tag <path>
    --untag\t\t\tRemoves tags for files (single or directory) in database, also removes 'ignored' status, usage: scope --untag <path>
    --see\t\t\tPrints the tags assigned to file or directory, usage: scope --see <path>
    
    --addtags\t\t\tLists files which were modified in commits, which are not yet pushed to remote, and tags them
    --commit\t\t\tLists files which were modified by a specific commit and tags them, usage: scope --commit <commit hash, long format>
    
    --verify\t\t\tReturns 0 if all files modified by a commit were tagged or ignored and 1 otherwise, usage: scope --verify <commit hash, long format>
    --verify-unpushed-commits\tWorks similar to --verify, but checks for commits no yet pushed to remote, returns 0 or 1 analogous to --verify
    
    --report-for-commit\t\tGenerates human readable report with statistics for files modified in a commit, usage: --report-for-commit <commit hash, long format>
    --report-for-commit-list\tSimilar to --report-for-commit, but enables Jira issue norification - see README.md for configuration details.
    `);
        break;
    }
    default: {
        if (args[0]) {
            console.log(`Unsupported option: '${args[0]}', to see available options use 'scope --help'`);
            break;
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
        break;
    }
}

function startCLI() {
    const tagsDefinitionFile = new TagsDefinitionFile(root).load();
    const fileTagsDatabase = new FileTagsDatabase(root).load();
    new Menu(tagsDefinitionFile, fileTagsDatabase).start().then(() => console.log("Exit."));
}

async function verifyCommit(commit: Commit, database: FileTagsDatabase, repository: GitRepository) {
    const fileDataArray = await repository.getFileDataForCommit(commit);
    const statusMap = database.checkMultipleFileStatusInDatabase(fileDataArray);

    const filesNotPresentInDatabase = fileDataArray.filter(fileData => {
        return statusMap.get(fileData) === FileStatusInDatabase.NOT_IN_DATABASE;
    });

    if (filesNotPresentInDatabase.length) {
        console.log(`Commit '${commit.message().trim()}' not verified, no tags found for required files:\n`);
        filesNotPresentInDatabase.forEach(file => console.log(`- ${file.newPath}`));
        console.log("\nPlease run\n\n\tnpx scope --unpushed\n\nto tag them");
        process.exit(1);
    }
}