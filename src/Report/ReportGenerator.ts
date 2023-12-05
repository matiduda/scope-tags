import { Commit } from "nodegit";
import { GitRepository } from "../Git/GitRepository";
import { FileTagsDatabase, TagIdentifier } from "../Scope/FileTagsDatabase";
import { Module, Tag, TagsDefinitionFile } from "../Scope/TagsDefinitionFile";
import { FileData } from "../Git/Types";
import { IReferenceFinder } from "../References/IReferenceFinder";
import { fileExists, getExtension, getFileBaseName } from "../FileSystem/fileSystemUtils";

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
        const tableEntries = report.allModules.map((moduleReport: ModuleReport): ReportTableEntry => {
            const entry: ReportTableEntry = {
                "Affected module": moduleReport.module,
                "Affected tags": this._nicePrintTags(moduleReport),
                "Lines": this._nicePrintLines(moduleReport),
                "Modified": report.date.toLocaleDateString(),
                "Used in": this._nicePrintUsedIn(moduleReport),
            }
            return entry;
        });
        console.log(JSON.stringify(tableEntries));
    }

    private _nicePrintTags(moduleReport: ModuleReport, addFiles: boolean = false): string {
        let output = "";

        const allTags: Array<Tag["name"]> = [];
        const currentModule = this._tagsDefinitionFile.getModuleByName(moduleReport.module);

        moduleReport.files.forEach(file => {
            file.tagIdentifiers.forEach(tagIdentifier => {
                if (!allTags.includes(tagIdentifier.tag)) {
                    allTags.push(tagIdentifier.tag);
                }
            })
        })

        if (addFiles) {
            allTags.forEach(tag => {
                const filesMatchingTag = moduleReport.files.filter(file => file.tagIdentifiers.some(identifier => identifier.tag === tag));
                output += `${tag} (${filesMatchingTag.map(file => getFileBaseName(file.file)).join(', ')})`;
            })
        } else {
            output = allTags.filter(tag => currentModule?.tags.includes(tag)).map(tag => tag).join(', ');
        }

        return output;
    }

    private _nicePrintLines(moduleReport: ModuleReport): string {
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
        return output;
    }

    private _nicePrintUsedIn(moduleReport: ModuleReport): string {
        let output = "";

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

        uniqueReferencedModules.forEach((referencedModule, index) => {
            output += `${referencedModule} (`

            const tagsMatchingAnyReference: Array<Tag["name"]> = [];

            moduleReport.files.forEach(fileInfo => {
                fileInfo.usedIn.forEach(reference => {
                    reference.tagIdentifiers.forEach(identifier => {
                        if (identifier.module === referencedModule && !tagsMatchingAnyReference.includes(identifier.tag)) {
                            tagsMatchingAnyReference.push(identifier.tag);
                        }
                    })
                })
            });

            output += tagsMatchingAnyReference.join(", ") + ")";

            if (index !== uniqueReferencedModules.length - 1) {
                output += ", ";
            }
        })
        return output;
    };
}