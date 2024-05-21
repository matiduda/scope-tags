
import { Commit } from "nodegit";
import { HTMLCreator } from "../HTMLCreator/HTMLCreator";
import { FileInfo, FileReference } from "../Report/ReportGenerator";
import { FileData, GitDeltaType } from "../Git/Types";
import { Utils } from "../Scope/Utils";
import { TagIdentifier } from "../Scope/FileTagsDatabase";
import { Relevancy } from "../Relevancy/Relevancy";
import { RelevancyManager } from "../Relevancy/RelevancyManager";
import { ConfigFile } from "../Scope/ConfigFile";

// What we need to know:
// - Commits matched a single task, for each commit
//   - A list of files which were modified (can also list ignored files)
//   - A list of tags associated which each file
// - Reports which were generated for each task


export enum ConfigurationProperty {
    PACKAGE_VERSION = "PACKAGE_VERSION",
    BUILD_TAG = "BUILD_TAG",
    BUILD_DATA_FILE_LOCATION = "BUILD_DATA_FILE_LOCATION",
    CURRENT_DATE = "CURRENT_DATE",
    EXTERNAL_IMPORT_MAP_CHUNK_COUNT = "EXTERNAL_IMPORT_MAP_CHUNK_COUNT",
    POSTED_REPORTS = "POSTED_REPORTS",
}

export type ConfigurationMap = Map<ConfigurationProperty, string>;

export type IssueLog = {
    key: string,
    commitInfos: CommitLog[],
    errors: string[],
};

export type CommitLog = {
    hash: string,
    fileLogs: FileLog[],
    message: string,
    summary: string,
    hasRelevancy: boolean,
};

export type FileLog = {
    path: string,
    updatedPath: string
    changeType: string,
    linesAdded: number,
    linesRemoved: number,
    relevancy: Relevancy | null,
    databaseContent: TagIdentifier[],
    referencedFiles: FileReference[],
    ignored: boolean,
}

export class Logger {

    private static _configuration: ConfigurationMap = new Map([
        [ConfigurationProperty.PACKAGE_VERSION, require("../../package.json").version],
        [ConfigurationProperty.CURRENT_DATE, new Date().toLocaleString()],
    ]);

    private static _issues: IssueLog[] = [];
    private static _DETACHED_ID = "__detached__";

    private static _relevancyManager = new RelevancyManager();

    private constructor() { }

    public static setConfigurationProperty(property: ConfigurationProperty, value: string) {
        Logger._configuration.set(property, value);
    }

    public static pushIssueInfo(issueKey: string, commits: Commit[]) {
        Logger._issues.push(({
            key: issueKey,
            errors: [],
            commitInfos: commits.map(commit => ({
                hash: commit.sha(),
                fileLogs: [],
                message: Utils.replaceAll(commit.message(), "\"", "'").trim(),
                summary: commit.summary(),
                hasRelevancy: Logger._relevancyManager.doesCommitMessageHaveRelevancyData(commit.message()),
            })),
        } as unknown as IssueLog));
    }

    static pushErrorMessage(issue: string, error: any) {
        let matchingIssue = Logger._issues.find(issueLog => issueLog.key === issue);

        if (!matchingIssue) {
            matchingIssue = this._getDetachedIssueLogs();
            return;
        }

        const justText = error.toString().replace(
            /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');

        matchingIssue.errors.push(justText);
    }

    static pushFileInfo(fileData: FileData, fileInfo: FileInfo) {
        let matchingCommitFileLogs;

        Logger._issues.forEach(issue => {
            issue.commitInfos.forEach(commitInfo => {
                if (commitInfo.hash === fileData.commitedIn?.sha()) {
                    matchingCommitFileLogs = commitInfo.fileLogs;
                }
            });
        });

        matchingCommitFileLogs = matchingCommitFileLogs || this._getDetachedIssueLogs().commitInfos[0].fileLogs;

        const newFileLog: FileLog = {
            path: fileData.oldPath,
            updatedPath: fileData.oldPath !== fileData.newPath ? fileData.newPath : "-",
            changeType: Utils.getEnumKeyByEnumValue(GitDeltaType, fileData.change) || `= ${fileData.change} (unknown)`,
            linesAdded: fileInfo.linesAdded,
            linesRemoved: fileInfo.linesRemoved,
            relevancy: fileInfo.relevancy,
            databaseContent: fileInfo.tagIdentifiers,
            referencedFiles: fileInfo.usedIn,
            ignored: fileInfo.ignored,
        }

        matchingCommitFileLogs.push(newFileLog);
    }

    private static _getDetachedIssueLogs(): IssueLog {
        const currentDetachedIssueLog = Logger._issues.find(issueInfo => issueInfo.key === Logger._DETACHED_ID);
        if (currentDetachedIssueLog) {
            return currentDetachedIssueLog;
        }

        const newDetachedIssueLog: IssueLog = {
            key: Logger._DETACHED_ID,
            errors: [],
            commitInfos: [{
                hash: Logger._DETACHED_ID,
                fileLogs: [],
                message: "No commit message",
                summary: "No commit summary",
                hasRelevancy: false,
            }]
        };

        Logger._issues.push(newDetachedIssueLog);
        return newDetachedIssueLog;
    }

    public static exportLogsToHTML(configFile: ConfigFile): string {
        const htmlCreator = new HTMLCreator("Scope Tags");

        // ... add HTML content here

        htmlCreator.appendConfiguration(Logger._configuration);
        htmlCreator.appendIssueTableOfContents(Logger._issues);
        htmlCreator.appendIssueLogs(Logger._issues, configFile.getViewIssueUrl(), configFile.getRepositoryURL(), configFile.getSeeCommitURL());
        htmlCreator.appendInstructions();

        return htmlCreator.renderHTML();
    }

    public static parseConfigurationPropertyName(configurationProperty: ConfigurationProperty) {
        const name = configurationProperty.toString().replace(/_/g, " ");
        return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    }
}