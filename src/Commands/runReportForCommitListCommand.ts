import { Commit } from "nodegit";
import { GitRepository } from "../Git/GitRepository";
import { ExternalMapReferenceFinder } from "../References/ExternalMapReferenceFinder";
import { IReferenceFinder } from "../References/IReferenceFinder";
import { TSReferenceFinder } from "../References/TSReferenceFinder";
import { BuildIntegration } from "../Report/BuildIntegration";
import { ReportGenerator } from "../Report/ReportGenerator";
import { ConfigFile } from "../Scope/ConfigFile";
import { FileTagsDatabase } from "../Scope/FileTagsDatabase";
import { TagsDefinitionFile } from "../Scope/TagsDefinitionFile";
import { fileExists } from "../FileSystem/fileSystemUtils";

export function runReportForCommitListCommand(args: Array<string>, root: string) {
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
            if (!fileExists(project.useExternalImportMap)) {
                console.log(`'useExternalImportMap' - External map for project ${project.name} not found at ${project.useExternalImportMap}, so there won't be references found for files: ${project.supportedFiles}`);
            } else {
                referenceFinders.push(new ExternalMapReferenceFinder(project.useExternalImportMap, project.supportedFiles));
            }
        }
    })

    const generator = new ReportGenerator(repository, tagsDefinitionFile, fileTagsDatabase, referenceFinders);

    const buildIntegration = new BuildIntegration(buildDataFile, repository, configFile);
    const uniqueIssues = buildIntegration.getUniqueIssues();

    uniqueIssues.forEach(issue => {
        const commits = buildIntegration.getIssueCommits(issue);

        repository.getCommitsByHashes(commits.map(commit => commit.hash)).then(async (commits: Commit[]) => {
            const report = await generator.generateReportForCommits(commits);
            const commentReportJSON = generator.getReportAsJiraComment(report, true);

            await buildIntegration.updateIssue({
                issue: issue,
                report: commentReportJSON
            });
        });
    });
}