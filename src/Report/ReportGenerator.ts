import { Commit } from "nodegit";
import { GitRepository } from "../Git/GitRepository";
import { FileTagsDatabase } from "../Scope/FileTagsDatabase";
import { Module, Tag, TagsDefinitionFile } from "../Scope/TagsDefinitionFile";
import { FileData } from "../Git/Types";
import { IReferenceFinder } from "../References/IReferenceFinder";
import { getExtension, getFileBaseName } from "../FileSystem/fileSystemUtils";

export type ModuleReport = {
    module: Module["name"],
    files: Array<FileInfo>,
}

type FileInfo = {
    file: string,
    tags: Array<Tag>,
    modules: Array<Module>,
    linesAdded: number,
    linesRemoved: number,
    usedIn: Array<FileReference>
}

type FileReference = {
    file: string,
    tags: Array<Tag>,
    modules: Array<Module>,
}

export type Report = {
    allModules: Array<ModuleReport>
    date: Date,
    buildId: string
};

type ReportTableEntry = {
    "Affected module": string,
    "Affected tags": string,
    "Lines": string,
    "Date": string,
    "Build": string,
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
        const filesAffectedByCommits: Array<FileData> = await this._repository.getFileDataForCommits(commits)

        return new Promise<Report>(async (resolve, reject) => {

            const fileInfoArray: Array<FileInfo> = this._getFileInfo(filesAffectedByCommits)
            const affectedModules = this._getAffectedModules(fileInfoArray);

            const report: Report = {
                allModules: [],
                date: new Date(),
                buildId: "-"
            };

            for (const module of affectedModules) {
                const fileInfoMatchingModule = fileInfoArray.filter(fileInfo => fileInfo.modules.includes(module));

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
            const fileTagNames = this._fileTagsDatabase.getTagNamesForFile(fileData.newPath);
            const fileTags = this._tagsDefinitionFile.getTagsByNames(fileTagNames);
            const fileModules: Module[] = fileTags.map(tag => this._tagsDefinitionFile.getTagModule(tag));

            const fileInfo: FileInfo = {
                file: fileData.newPath,
                tags: fileTags,
                modules: fileModules,
                linesAdded: fileData.linesAdded,
                linesRemoved: fileData.linesRemoved,
                usedIn: this._getFileReferences(fileData.newPath),
            };

            fileInfoArray.push(fileInfo);
        }
        return fileInfoArray;
    }

    private _getAffectedModules(fileInfoArray: Array<FileInfo>): Array<Module> {
        const modules: Array<Module> = [];

        for (const fileInfo of fileInfoArray) {
            fileInfo.modules.forEach(module => {
                if (!modules.includes(module)) {
                    modules.push(module);
                };
            });
        }
        return modules;
    }

    private _getFileReferences(file: string): Array<FileReference> {
        const references: Array<FileReference> = [];

        this._referenceFinders.forEach(referenceFinder => {
            if (!referenceFinder.getSupportedFilesExtension().includes(getExtension(file))) {
                return;
            }
            const foundReferences = referenceFinder.findReferences(file);

            foundReferences.forEach(reference => {

                const referenceTagsNames = this._fileTagsDatabase.getTagNamesForFile(reference);

                const referenceTags = this._tagsDefinitionFile.getTagsByNames(referenceTagsNames);
                const referenceTagsModules = referenceTags.map(tag => this._tagsDefinitionFile.getTagModule(tag));
                const fileReference: FileReference = {
                    file: reference,
                    modules: referenceTagsModules,
                    tags: referenceTags,
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
                "Date": report.date.toLocaleDateString(),
                "Build": report.buildId,
                "Used in": this._nicePrintUsedIn(moduleReport)
            }
            return entry;
        });
        console.table(tableEntries);
    }

    private _nicePrintTags(moduleReport: ModuleReport): string {
        let output = "";

        const allTags: Array<Tag> = [];

        moduleReport.files.forEach(file => {
            file.tags.forEach(tag => {
                if (!allTags.includes(tag)) {
                    allTags.push(tag);
                }
            })
        })

        allTags.forEach(tag => {
            const filesMatchingTag = moduleReport.files.filter(file => file.tags.includes(tag));
            output += `${tag.name} (${filesMatchingTag.map(file => getFileBaseName(file.file)).join(', ')})`;
        })

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

        const allReferencedModules: Array<Module> = [];

        moduleReport.files.forEach(file => {
            file.usedIn.forEach(ref => {
                ref.modules.forEach(module => {
                    if (module.name !== moduleReport.module && !allReferencedModules.includes(module)) {
                        allReferencedModules.push(module);
                    }
                })
            })
        })

        console.log("all referenced modules:");
        console.log(allReferencedModules.map(module => module.name));

        allReferencedModules.forEach((referencedModule, i) => {
            output += `${referencedModule.name} - `;

            const matchingTags: Array<Tag> = [];

            moduleReport.files.forEach(file => {
                file.usedIn.forEach(ref => {
                    ref.tags.forEach(tag => {
                        if (referencedModule.tags.includes(tag) && !matchingTags.includes(tag)) {
                            matchingTags.push(tag);
                        }
                    })
                })
            });

            output += `(${matchingTags.map(tag => tag.name).join(', ')})`;

            if (i !== allReferencedModules.length - 1) {
                output += ", ";
            }
        })

        return output;
    };
}