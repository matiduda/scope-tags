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

export function runReportForCommitCommand(args: Array<string>, root: string) {
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
                    `When using 'useExternalImportMap' ou have to specify supported file extenstions for project ${project.name}: add 'supportedFiles: [".extension"]' to config file`
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

    repository.getCommitByHash(hash).then(async (commit: Commit) => {
        const report = await generator.generateReportForCommit(commit, projects[0].name);
        generator.getReportAsJiraComment(report, true);
    });
}