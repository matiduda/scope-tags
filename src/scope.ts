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
            console.log(`File or directory ${path} does not exist`);
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

        const fileData = repository.convertFilesToFileData(filesToTag);

        fileTagger.start(fileData).then(() => {
            console.log("All files tagged");
        });
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
    case "--unpushed": {
        const repository = new GitRepository(root);
        repository.getFileDataForUnpushedCommits().then(fileData => {

            const tagsDefinitionFile = new TagsDefinitionFile(root).load();
            const fileTagsDatabase = new FileTagsDatabase(root).load();
            const fileTagger = new FileTagger(tagsDefinitionFile, fileTagsDatabase, repository);

            const fileDataToTag = fileTagsDatabase.updateDatabaseBasedOnChanges(fileData);

            fileTagger.start(fileDataToTag).then(() => {
                console.log("All files tagged");
            }).catch(e => console.log("Canceled")); // TODO: Save already tagged files
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
    case "--debug": {
        // TODO: Add verbose mode
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
    default: {
        if (args[1]) {
            throw new Error(`Unsupported option: '${args[1]}'`);
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
    new Menu(tagsDefinitionFile).start().then(() => console.log("Exit."));
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