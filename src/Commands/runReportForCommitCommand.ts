import { Commit } from "nodegit";
import { GitRepository } from "../Git/GitRepository";
import { ExternalMapReferenceFinder } from "../References/ExternalMapReferenceFinder";
import { IReferenceFinder } from "../References/IReferenceFinder";
import { TSReferenceFinder } from "../References/TSReferenceFinder";
import { ReportGenerator } from "../Report/ReportGenerator";
import { ConfigFile } from "../Scope/ConfigFile";
import { FileTagsDatabase } from "../Scope/FileTagsDatabase";
import { TagsDefinitionFile } from "../Scope/TagsDefinitionFile";
import { fileExists } from "../FileSystem/fileSystemUtils";
import { RelevancyManager } from "../Relevancy/RelevancyManager";
import { ADFValidator } from "../Report/ADFValidator";
import { JiraBuilder } from "../Report/JiraBuilder";

export function runReportForCommitCommand(args: Array<string>, root: string) {
    // Checks if all files from the commit are present in database (or excluded)
    const hash = args[1];
    if (!hash) {
        console.log("--report-for-commit requires commit hash, use: --report-for-commit <hash>");
        process.exit(1);
    }

    const repository = new GitRepository(root);
    const tagsDefinitionFile = new TagsDefinitionFile(root);
    const fileTagsDatabase = new FileTagsDatabase(root);
    const configFile = new ConfigFile(root);

    const referenceFinders: Array<IReferenceFinder> = [];

    const projects = configFile.getProjects();

    projects.forEach(project => {
        referenceFinders.push(new TSReferenceFinder(root, project.location));

        if (project.useExternalImportMap) {
            if (!project.supportedFiles) {
                throw new Error(
                    `When using 'useExternalImportMap' ou have to specify supported file extenstions for project ${project.name}: add 'supportedFiles: [".extension"]' to config file`
                );
            }
            if (!fileExists(project.useExternalImportMap)) {
                console.log(`'useExternalImportMap' - External map for project ${project.name} not found at ${project.useExternalImportMap}, so there won't be references found for files: ${project.supportedFiles}`);
            } else {
                referenceFinders.push(new ExternalMapReferenceFinder(project.useExternalImportMap, project.supportedFiles));
            }
        }
    });

    const generator = new ReportGenerator(repository, tagsDefinitionFile, fileTagsDatabase, configFile, referenceFinders, true);
    const relevancyManager = new RelevancyManager();

    repository.getCommitByHash(hash).then(async (commit: Commit) => {
        const relevancyMap = relevancyManager.loadRelevancyMapFromCommits([commit]);
        const report = await generator.generateReportForCommit(commit, projects[0].name, relevancyMap, false);
        if (generator.isReportEmpty(report)) {
            console.log("Report is empty (no tags were found in modified files).");
            return;
        }

        const jiraBuilder = new JiraBuilder();

        return generator.getReportAsJiraComment(report, jiraBuilder, true);
    }).then(async commentReport => {
        if (!commentReport) {
            return;
        }

        const validator = new ADFValidator();

        await validator.loadSchema();
        validator.validateADF(commentReport.adfDocument);
    })
}
