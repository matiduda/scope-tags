import { JSONFile } from "../FileSystem/JSONFile";
import { GitRepository } from "../Git/GitRepository";
import { FileData, FilePath } from "../Git/Types";
import { ConfigFile } from "../Scope/ConfigFile";
import { FileTagsDatabase } from "../Scope/FileTagsDatabase";
import { Module, Tag, TagsDefinitionFile } from "../Scope/TagsDefinitionFile";

export type CommitData = {
    hash: string,
    message: string,
    author: string,
    jiraIssueKey: string,
};

export type BuildData = {
    buildTag: string, // TODO: Add current date when appending report
    commitData: Array<CommitData>,
}

type ReferencedFilesReport = {
    fileName: string,
    tags: Array<Tag>
}

type ModuleReport = {
    module: Module,
    files: Array<FilePath>,
    tags: Array<Tag>,
    linesAdded: number,
    linesDeleted: number,
    references: Array<ReferencedFilesReport>,
}

export class ReportGenerator {

    private _configFile: ConfigFile;
    private _tagsDefinitionFile: TagsDefinitionFile;
    private _fileTagsDatabase: FileTagsDatabase;
    private _repository: GitRepository;

    private _buildData: BuildData;

    constructor(
        path: string,
        configFile: ConfigFile,
        tagsDefinitionFile: TagsDefinitionFile,
        fileTagsDatabase: FileTagsDatabase,
        repository: GitRepository
    ) {
        this._configFile = configFile;
        this._tagsDefinitionFile = tagsDefinitionFile;
        this._fileTagsDatabase = fileTagsDatabase;
        this._repository = repository;

        this._buildData = this._loadBuildData(path);
    }

    private _loadBuildData(path: string): BuildData {
        return JSONFile.loadFrom<BuildData>(path);
    }

    private _getUniqueTickets() {
        const allTickets = this._buildData.commitData.map(data => data.jiraIssueKey);
        return allTickets.filter((value, index, array) => array.indexOf(value) === index);
    }

    private _getCommitsMatchingTicket(jiraTicket: string): CommitData[] {
        return this._buildData.commitData.filter(data => data.jiraIssueKey === jiraTicket);
    }

    public async notifyAllAffectedTickets(): Promise<void> {
        const uniqueJiraTickets = this._getUniqueTickets();

        uniqueJiraTickets.forEach(async jiraTicket => {
            console.log("Searching file data for " + jiraTicket);
            const commitsMatchingTicket = this._getCommitsMatchingTicket(jiraTicket);

            const commitHashesMatchingTicket = commitsMatchingTicket.map(commitData => commitData.hash);
            const fileDataArray: FileData[] = await this._repository.getFileDataForCommitHashes(commitHashesMatchingTicket);

            for (const f of fileDataArray) {
                console.log(f.newPath);
            }
        })
    }
}