import { JSONFile } from "../FileSystem/JSONFile";
import { GitRepository } from "../Git/GitRepository";
import { ConfigFile } from "../Scope/ConfigFile";
import { Report } from "./ReportGenerator";
import fetch from "node-fetch";

type CommitData = {
    hash: string,
    issue: string,
};

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

    public async updateIssue(issueKey: string, report: Report): Promise<void> {
        const updateURL = this._config.getUpdateIssueURL();
        if (!updateURL) {
            console.warn(
                `Cannot update issue ${issueKey} because there is no 'updateIssueURL' set for projects: ${this._config.getProjects().map(project => project.name).join(", ")}
            `);
        }

        const response = await fetch('https://gs-client.testowaplatforma123.net/pr-merged/scope-tags?task=VGF-16672');
        const data = await response.json();

        console.log("Updating issue of key " + issueKey);
        console.log(data);
    }
}