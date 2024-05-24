import { GitRepository } from "../Git/GitRepository";
import { ExternalMapReferenceFinder } from "../References/ExternalMapReferenceFinder";
import { IReferenceFinder } from "../References/IReferenceFinder";
import { TSReferenceFinder } from "../References/TSReferenceFinder";
import { BuildIntegration } from "../Report/BuildIntegration";
import { ReportGenerator } from "../Report/ReportGenerator";
import { FileTagsDatabase } from "../Scope/FileTagsDatabase";
import { TagsDefinitionFile } from "../Scope/TagsDefinitionFile";
import { fileExists, getExtension, removeFile, resolvePath, saveHTMLLogs } from "../FileSystem/fileSystemUtils";
import { RelevancyManager } from "../Relevancy/RelevancyManager";
import { ConfigurationProperty, Logger } from "../Logger/Logger";
import { ConfigFile } from "../Scope/ConfigFile";
import { ADFValidator } from "../Report/ADFValidator";
import { JiraBuilder } from "../Report/JiraBuilder";

const os = require("os");

export async function runReportForCommitListCommand(args: Array<string>, root: string) {
    // Checks if all files from the commit are present in database (or excluded)

    const buildDataFile = args[1];
    if (!buildDataFile) {
        console.log("--report-for-commit-list requires a path to a file with commit list, use: --report-for-commit-list <file> <optional: html log file path>");
        process.exit(1);
    } else if (!fileExists(buildDataFile)) {
        console.log(`[Scope tags] Helper file ${buildDataFile} does not exist, which means there was no changes (from: '${root}')`);
        return;
    }

    Logger.setConfigurationProperty(ConfigurationProperty.BUILD_DATA_FILE_LOCATION, resolvePath(buildDataFile));

    const logFilePath = args[2];
    if (logFilePath && getExtension(logFilePath) !== ".html") {
        console.log(`Log file '${logFilePath}' must have .html extension`);
        return;
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
            if (!ExternalMapReferenceFinder.importMapExistsAt(project.useExternalImportMap)) {
                console.log(`[Scope tags] 'useExternalImportMap' - External map for project ${project.name} not found at ${project.useExternalImportMap}, so there won't be references found for files: ${project.supportedFiles}`);
            } else {
                const externalMapReferenceFinder = new ExternalMapReferenceFinder(project.useExternalImportMap, project.supportedFiles);
                referenceFinders.push(externalMapReferenceFinder);
                Logger.setConfigurationProperty(ConfigurationProperty.EXTERNAL_IMPORT_MAP_CHUNK_COUNT, externalMapReferenceFinder.getImportMapChunkCount().toString());
            }
        }
    })

    const generator = new ReportGenerator(repository, tagsDefinitionFile, fileTagsDatabase, configFile, referenceFinders);
    const relevancyTagger = new RelevancyManager();
    const buildIntegration = new BuildIntegration(buildDataFile, configFile);
    const uniqueIssues = buildIntegration.getUniqueIssues();

    let totalCommitCount = 0;
    let reportsGenerated = 0;
    let reportsPosted = 0;

    for (const issue of uniqueIssues) {
        console.log(`[Scope tags]: Checking commits of issue '${issue}'`);

        const issueCommits = buildIntegration.getIssueCommits(issue);
        const buildTag = buildIntegration.getBuildTag();

        Logger.setConfigurationProperty(ConfigurationProperty.BUILD_TAG, buildTag);

        // const commits = await repository.getCommitsByHashes(commits.map(commit => commit.hash)).then(async (commits: Commit[]) => {
        const commits = await repository.getCommitsByHashes(issueCommits.map(commit => commit.hash));

        for (const commit of commits) {
            console.log(`[Scope tags]: Found '${commit.summary()}'`);
        }

        Logger.pushIssueInfo(issue, commits);

        totalCommitCount += commits.length;

        console.log(`[Scope tags]: Loading relevancy map...'`);
        const relevancyMap = relevancyTagger.loadRelevancyMapFromCommits(commits);

        console.log(`[Scope tags]: Generating report for issue '${issue}'...'`);
        const report = await generator.generateReportForCommits(commits, projects[0].name, buildTag, relevancyMap);

        if (generator.isReportEmpty(report)) {
            console.log(`[Scope tags]: Report ommited because no tags for modified files were found`);
            continue;
        }

        const jiraBuilder = new JiraBuilder();

        const commentReport = generator.getReportAsJiraComment(report, jiraBuilder, false);
        const commentReportADF = `{adf:display=block}${commentReport.comment}{adf}`;

        console.log(`[Scope tags]: Validating ADF of report for issue '${issue}'...'`);

        const validator = new ADFValidator();

        await validator.loadSchema();
        const reportIsValid = validator.validateADF(commentReport.adfDocument, issue);

        if (!reportIsValid) {
            console.log(`[Scope tags]: Ommiting report for issue ${issue} as it have not passed ADF validation`);
            continue;
        }

        console.log(`[Scope tags]: Posting report as comment for issue '${issue}'...'`);

        const reportPostedSuccessfully = await buildIntegration.updateIssue({
            issue: issue,
            report: commentReportADF,
            hostname: os.hostname(),
        });

        if (reportPostedSuccessfully) {
            reportsPosted++;
        }

        reportsGenerated++;
    }

    Logger.setConfigurationProperty(ConfigurationProperty.POSTED_REPORTS, `${reportsPosted} of ${reportsGenerated} generated`);

    if (logFilePath) {
        if (fileExists(logFilePath)) {
            console.log(`Deleting existing HTML logs from '${logFilePath}' to create new log file`);
            removeFile(logFilePath);
        }

        saveHTMLLogs(logFilePath, Logger.exportLogsToHTML(configFile));
        console.log(`[Scope tags]: Saved HTML logs to '${logFilePath}'...'`);
    }

    console.log(`[Scope tags]: Posted comments: ${reportsPosted}`);
    console.log(`[Scope tags]: Commits processed: ${totalCommitCount}`);
}
