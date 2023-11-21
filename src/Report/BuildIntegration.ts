import { JSONFile } from "../FileSystem/JSONFile";
import { GitRepository } from "../Git/GitRepository";
import { Report } from "./ReportGenerator";

type CommitData = {
    hash: string,
    issue: string,
};

type BuildData = {
    buildTag: string, // TODO: Add current date when appending report
    commits: Array<CommitData>,
}

export class BuildIntegration {

    private _repository: GitRepository;
    private _buildData: BuildData;

    constructor(
        buildDataFile: string,
        repository: GitRepository,
    ) {
        this._buildData = this._loadBuildData(buildDataFile);
        this._repository = repository;
    }

    private _loadBuildData(path: string): BuildData {
        return JSONFile.loadFrom<BuildData>(path);
    }

    public getUniqueIssues(): Array<string> {
        if (!this._buildData) {
            throw new Error("Build metadata not loaded!");
        }
        const allTickets = this._buildData.commits.map(commit => commit.issue);
        return allTickets.filter((value, index, array) => array.indexOf(value) === index);
    }

    public getIssueCommitsHashes(issueKey: string): string[] {
        if (!this._buildData) {
            throw new Error("Build metadata not loaded!");
        }
        return this._buildData.commits
            .filter(commit => commit.issue === issueKey)
            .map(commit => commit.hash);
    }

    public async updateIssue(key: string, report: Report): Promise<void> {
        console.log(`[Scope tags] Generating report for issue ${key}`);
    }
}