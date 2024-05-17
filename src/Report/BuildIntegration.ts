import { JSONFile } from "../FileSystem/JSONFile";
import { ConfigFile } from "../Scope/ConfigFile";

type CommitData = {
    hash: string,
    issue: string,
};

type BuildInfoFile = {
    buildTag: string,
    commitsAndIssues: Array<CommitData>,
}

type UpdateRequest = {
    issue: string, // Issue key on Jira
    report: string // Stringified ADF macro to be pasted in a comment
    hostname: string
}

export class BuildIntegration {

    private _config: ConfigFile;

    private _buildInfoFile: BuildInfoFile;

    private _issueKeyToCommitsMap: Map<string, Array<CommitData>>;

    constructor(
        buildInfoFile: string,
        config: ConfigFile,
    ) {
        this._config = config;
        this._issueKeyToCommitsMap = new Map();

        this._buildInfoFile = this._loadBuildInfo(buildInfoFile);

        this.getUniqueIssues().forEach(uniqueIssue => {
            const commitsMatchingIssue = this._getCommits().filter(commitData => commitData.issue === uniqueIssue);
            this._issueKeyToCommitsMap.set(uniqueIssue, commitsMatchingIssue);
        });
    }

    private _loadBuildInfo(path: string): BuildInfoFile {
        return JSONFile.loadFrom<BuildInfoFile>(path);
    }

    private _getCommits(): Array<CommitData> {
        if (!this._buildInfoFile) {
            throw new Error("[BuildIntegration] Cannot get commits, file not loaded yet");
        }
        return this._buildInfoFile.commitsAndIssues;
    }

    public getUniqueIssues(): Array<string> {
        const commits = this._getCommits();
        if (!commits || !commits.length) {
            throw new Error("Commit list cannot be empty!");
        }

        const allIssues = commits.map(commit => commit.issue);
        return allIssues.filter((value, index, array) => array.indexOf(value) === index);
    }

    public getIssueCommits(issueKey: string): Array<CommitData> {
        return this._issueKeyToCommitsMap.get(issueKey) || [];
    }

    /**
     * @returns {Promise<boolean>} True if the report was posted successfully, false otherwise
     */
    public async updateIssue(request: UpdateRequest): Promise<boolean> {
        const updateURL = this._config.getUpdateIssueURL();
        if (!updateURL) {
            console.warn(
                `Cannot send report to issue '${request.issue}' because there is no 'updateIssueURL' set in config file`);
            return false;
        }

        process.stdout.write(`Sending report to issue '${request.issue}' ... `);

        const rawResponse = await fetch(updateURL, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(request)
        });

        const content = await rawResponse.json();
        console.log(content);

        return rawResponse.ok;
    }

    public getBuildTag() {
        return this._buildInfoFile.buildTag;
    }
}