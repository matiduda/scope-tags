
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

export type ConfigurationMap = Map<string, string>;

export type IssueLog = {
    key: string,
    commitInfos: CommitLog[],
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
}

export class Logger {

    private static _configuration: ConfigurationMap = new Map([
        ["Package version", require("../../package.json").version],
        ["Date", new Date().toLocaleString()],
    ]);

    private static _issues: IssueLog[] = [];
    private static _DETACHED_ID = "__detached__";

    private static _relevancyManager = new RelevancyManager();

    private constructor() { }

    public static setConfigurationProperty(name: string, value: string) {
        Logger._configuration.set(name, value);
    }

    public static pushIssueInfo(issueKey: string, commits: Commit[]) {
        Logger._issues.push(({
            key: issueKey,
            commitInfos: commits.map(commit => ({
                hash: commit.sha(),
                fileLogs: [],
                message: Utils.replaceAll(commit.message(), "\"", "'").trim(),
                summary: commit.summary(),
                hasRelevancy: Logger._relevancyManager.doesCommitMessageHaveRelevancyData(commit.message()),
            })),
        } as IssueLog));
    }

    static pushFileInfo(fileData: FileData, fileInfo: FileInfo) {
        let matchingCommitFileLogs;

        Logger._issues.forEach(issue => {
            issue.commitInfos.forEach(commitInfo => {
                if (commitInfo.hash === fileData.commitedIn) {
                    matchingCommitFileLogs = commitInfo.fileLogs;
                }
            });
        });

        matchingCommitFileLogs = matchingCommitFileLogs || this._getDetachedFileLogs();

        const newFileLog: FileLog = {
            path: fileData.oldPath,
            updatedPath: fileData.oldPath !== fileData.newPath ? fileData.newPath : "-",
            changeType: Utils.getEnumKeyByEnumValue(GitDeltaType, fileData.change) || `= ${fileData.change} (unknown)`,
            linesAdded: fileInfo.linesAdded,
            linesRemoved: 0,
            relevancy: fileInfo.relevancy,
            databaseContent: fileInfo.tagIdentifiers,
            referencedFiles: fileInfo.usedIn,
        }
        matchingCommitFileLogs.push(newFileLog);
    }

    private static _getDetachedFileLogs(): FileLog[] {
        const currentDetachedIssueLog = Logger._issues.find(issueInfo => issueInfo.key === Logger._DETACHED_ID);
        if (currentDetachedIssueLog) {
            return currentDetachedIssueLog.commitInfos[0].fileLogs;
        }

        const newDetachedIssueLog: IssueLog = {
            key: Logger._DETACHED_ID,
            commitInfos: [{
                hash: Logger._DETACHED_ID,
                fileLogs: [],
                message: "No commit message",
                summary: "No commit summary",
                hasRelevancy: false,
            }]
        };

        Logger._issues.push(newDetachedIssueLog);
        return newDetachedIssueLog.commitInfos[0].fileLogs;
    }

    public static exportLogsToHTML(configFile: ConfigFile): string {
        const htmlCreator = new HTMLCreator("Scope Tags");

        // ... add HTML content here

        htmlCreator.appendConfiguration(Logger._configuration);
        htmlCreator.appendIssueTableOfContents(Logger._issues);
        htmlCreator.appendIssueLogs(Logger._issues, configFile.getViewIssueUrl());

        return htmlCreator.renderHTML();
    }
}