import { JSONFile } from "../FileSystem/JSONFile";
import { GitRepository } from "../Git/GitRepository";
import { ConfigFile } from "../Scope/ConfigFile";
import fetch from "node-fetch";

type CommitData = {
    hash: string,
    issue: string,
};

type UpdateRequest = {
    issue: string, // Issue key on Jira
    report: string // Stringified ADF macro to be pasted in a comment
}

export class BuildIntegration {

    private _repository: GitRepository;
    private _config: ConfigFile;

    private _allCommits: Array<CommitData>;
    private _issueKeyToCommitsMap: Map<string, Array<CommitData>>;

    constructor(
        commitListFile: string,
        repository: GitRepository,
        config: ConfigFile,
    ) {
        this._repository = repository;
        this._config = config;
        this._issueKeyToCommitsMap = new Map();

        this._allCommits = this._loadCommitList(commitListFile);

        this.getUniqueIssues().forEach(uniqueIssue => {
            const commitsMatchingIssue = this._allCommits.filter(commitData => commitData.issue === uniqueIssue);
            this._issueKeyToCommitsMap.set(uniqueIssue, commitsMatchingIssue);
        });

        console.log(this._issueKeyToCommitsMap);
    }

    private _loadCommitList(path: string): Array<CommitData> {
        return JSONFile.loadFrom<Array<CommitData>>(path);
    }

    public getUniqueIssues(): Array<string> {
        if (!this._allCommits || !this._allCommits.length) {
            throw new Error("Commit list cannot be empty!");
        }

        const allIssues = this._allCommits.map(commit => commit.issue);
        return allIssues.filter((value, index, array) => array.indexOf(value) === index);
    }

    public getIssueCommits(issueKey: string): Array<CommitData> {
        return this._issueKeyToCommitsMap.get(issueKey) || [];
    }

    public async updateIssue(request: UpdateRequest): Promise<void> {
        const updateURL = this._config.getUpdateIssueURL();
        if (!updateURL) {
            console.warn(
                `Cannot send report to issue '${request.issue}' because there is no 'updateIssueURL' set in config file`);
            return;
        }

        process.stdout.write(`Sending report to issue '${request.issue}' ... `);

        const rawResponse = await fetch(updateURL, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request)
        });

        const content = await rawResponse.json();

        console.log(content);
    }
}