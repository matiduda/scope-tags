import { Commit } from "nodegit";
import { GitRepository } from "../Git/GitRepository";
import { FileTagsDatabase, TagIdentifier } from "../Scope/FileTagsDatabase";
import { Module, Tag, TagsDefinitionFile } from "../Scope/TagsDefinitionFile";
import { FileData } from "../Git/Types";
import { IReferenceFinder } from "../References/IReferenceFinder";
import { fileExists, getExtension } from "../FileSystem/fileSystemUtils";
import { JiraBuilder, ReportTableRow } from "./JiraBuilder";

export type ModuleReport = {
    module: Module["name"],
    files: Array<FileInfo>,
}

type FileInfo = {
    file: string,
    tagIdentifiers: Array<TagIdentifier>,
    linesAdded: number,
    linesRemoved: number,
    usedIn: Array<FileReference>
}

type FileReference = {
    file: string,
    tagIdentifiers: Array<TagIdentifier>,
}

export type Report = {
    allModules: Array<ModuleReport>
    date: Date,
};

type ReportTableEntry = {
    "Affected module": string,
    "Affected tags": string,
    "Lines": string,
    "Modified": string,
    "Used in": string,
}

export class ReportGenerator {

    private _repository: GitRepository;
    private _tagsDefinitionFile: TagsDefinitionFile;
    private _fileTagsDatabase: FileTagsDatabase;

    private _referenceFinders: Array<IReferenceFinder>;

    constructor(
        repository: GitRepository,
        tagsDefinitionFile: TagsDefinitionFile,
        fileTagsDatabase: FileTagsDatabase,
        referenceFinders: Array<IReferenceFinder>
    ) {
        this._repository = repository;
        this._tagsDefinitionFile = tagsDefinitionFile;
        this._fileTagsDatabase = fileTagsDatabase;
        this._referenceFinders = referenceFinders;
    }

    public async generateReportForCommit(commit: Commit): Promise<Report> {
        return this.generateReportForCommits([commit]);
    }

    public async generateReportForCommits(commits: Array<Commit>): Promise<Report> {
        const filesAffectedByCommits: Array<FileData> = await this._repository.getFileDataForCommits(commits);

        return new Promise<Report>(async (resolve, reject) => {

            const fileInfoArray: Array<FileInfo> = this._getFileInfo(filesAffectedByCommits)
            const affectedModules = this._getAffectedModules(fileInfoArray);

            const report: Report = {
                allModules: [],
                date: this._repository.getMostRecentChangeDateFromCommitList(commits),
            };

            for (const module of affectedModules) {
                const fileInfoMatchingModule = fileInfoArray.filter(
                    fileInfo => fileInfo.tagIdentifiers.some(identifier => identifier.module === module.name)
                );

                const moduleReport: ModuleReport = {
                    module: module.name,
                    files: [...fileInfoMatchingModule],
                }

                report.allModules.push(moduleReport);
            }

            resolve(report);
        });
    }

    private _getFileInfo(fileDataArray: Array<FileData>): Array<FileInfo> {

        const fileInfoArray: Array<FileInfo> = [];

        for (const fileData of fileDataArray) {
            const fileInfo: FileInfo = {
                file: fileData.newPath,
                tagIdentifiers: this._fileTagsDatabase.getTagIdentifiersForFile(fileData.newPath),
                linesAdded: fileData.linesAdded,
                linesRemoved: fileData.linesRemoved,
                usedIn: this._getFileReferences(fileData.newPath),
            };

            fileInfoArray.push(fileInfo);
        }
        return fileInfoArray;
    }

    private _getAffectedModules(fileInfoArray: Array<FileInfo>): Array<Module> {
        const moduleNames: Array<string> = [];

        for (const fileInfo of fileInfoArray) {
            fileInfo.tagIdentifiers.forEach(identifier => {
                if (!moduleNames.includes(identifier.module)) {
                    moduleNames.push(identifier.module);
                };
            })
        }

        return this._tagsDefinitionFile.getModulesByNames(moduleNames);
    }

    private _getFileReferences(file: string): Array<FileReference> {
        const references: Array<FileReference> = [];

        if (!fileExists(file)) {
            return references;
        }

        this._referenceFinders.forEach(referenceFinder => {
            if (!referenceFinder.getSupportedFilesExtension().includes(getExtension(file))) {
                return;
            }
            const foundReferences = referenceFinder.findReferences(file);

            foundReferences.forEach(reference => {
                const fileReference: FileReference = {
                    file: reference,
                    tagIdentifiers: this._fileTagsDatabase.getTagIdentifiersForFile(reference),
                };
                references.push(fileReference);
            });
        });

        return references;
    }

    public printReportAsTable(report: Report): void {
        // TODO: Remove
    }

    private _calculateLines(moduleReport: ModuleReport): { added: number, removed: number } {
        let combinedLinesAdded = 0;
        let combinedLinesRemoved = 0;
        let output = "";

        moduleReport.files.forEach(file => {
            combinedLinesAdded += file.linesAdded;
            combinedLinesRemoved += file.linesRemoved;
        })

        if (combinedLinesAdded) {
            output += `++${combinedLinesAdded}`;
        }
        if (combinedLinesRemoved) {
            output += ` --${combinedLinesRemoved}`;
        }

        return {
            added: combinedLinesAdded,
            removed: combinedLinesRemoved
        };
    }

    public getReportAsJiraComment(report: Report, printToConsole = false): string {
        const finalReportTableData: Array<ReportTableRow> = report.allModules.map(moduleReport => {
            return {
                affectedTags: this._getAffectedTags(moduleReport),
                lines: this._calculateLines(moduleReport),
                lastChange: report.date,
                referencedTags: this._getReferencedTags(moduleReport),
            };
        });

        const jiraBuilder = new JiraBuilder();
        return jiraBuilder.parseReport(finalReportTableData, report.date, printToConsole);
    }

    private _getAffectedTags(moduleReport: ModuleReport): Array<string> {
        const allTags: Array<Tag["name"]> = [];
        const currentModule = this._tagsDefinitionFile.getModuleByName(moduleReport.module);

        moduleReport.files.forEach(file => {
            file.tagIdentifiers.forEach(tagIdentifier => {
                if (!allTags.includes(tagIdentifier.tag)) {
                    allTags.push(tagIdentifier.tag);
                }
            })
        })

        return allTags.filter(tag => currentModule?.tags.includes(tag)).map(tag => tag);
    }

    private _getReferencedTags(moduleReport: ModuleReport): Array<{
        module: string,
        tags: Array<string>
    }> {
        // TODO: Switch to {
        //      tag: string,
        //      modules: Array<string>   
        // }

        const uniqueReferencedModules: Array<Module["name"]> = [];

        moduleReport.files.forEach(fileInfo => {
            fileInfo.usedIn.forEach(reference => {
                reference.tagIdentifiers.forEach(identifier => {
                    if (!uniqueReferencedModules.includes(identifier.module)) {
                        uniqueReferencedModules.push(identifier.module);
                    }
                })
            })
        });

        return uniqueReferencedModules.map((referencedModule, index) => {

            const tagNamesMatchingAnyReference: Array<Tag["name"]> = [];

            moduleReport.files.forEach(fileInfo => {
                fileInfo.usedIn.forEach(reference => {
                    reference.tagIdentifiers.forEach(identifier => {
                        if (identifier.module === referencedModule
                            && !tagNamesMatchingAnyReference.includes(identifier.tag)
                        ) {
                            tagNamesMatchingAnyReference.push(identifier.tag);
                        }
                    })
                })
            });

            return {
                module: referencedModule,
                tags: tagNamesMatchingAnyReference
            }
        })
    };
}