import { JSONFile } from "../FileSystem/JSONFile";
import { GitRepository } from "../Git/GitRepository";
import { Report } from "./ReportGenerator";

type CommitData = {
    hash: string,
    issue: string,
};

export class BuildIntegration {

    private _repository: GitRepository;

    private _allCommits: Array<CommitData>;
    private _issueKeyToCommitsMap: Map<string, Array<CommitData>>;

    constructor(
        commitListFile: string,
        repository: GitRepository,
    ) {
        this._repository = repository;
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
        console.log("Updating issue of key " + issueKey);

    }
}