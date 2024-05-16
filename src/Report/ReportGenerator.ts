import { Commit } from "nodegit";
import { GitRepository } from "../Git/GitRepository";
import { FileTagsDatabase, TagIdentifier } from "../Scope/FileTagsDatabase";
import { Module, Tag, TagsDefinitionFile } from "../Scope/TagsDefinitionFile";
import { FileData } from "../Git/Types";
import { IReferenceFinder, ReferencedFileInfo } from "../References/IReferenceFinder";
import { fileExists, getExtension } from "../FileSystem/fileSystemUtils";
import { JiraBuilder, ModuleInfo, ReportTableRow, TagInfo, UntaggedFilesTableRow } from "./JiraBuilder";
import { Relevancy, RelevancyMap } from "../Relevancy/Relevancy";
import { Logger } from "../Logger/Logger";
import { ConfigFile } from "../Scope/ConfigFile";

export type ModuleReport = {
    module: Module["name"],
    files: Array<FileInfo>,
}

export type FileInfo = {
    file: string,
    tagIdentifiers: Array<TagIdentifier>,
    linesAdded: number,
    linesRemoved: number,
    usedIn: Array<FileReference>,
    relevancy: Relevancy | null,
    ignored: boolean,
}

export type FileReference = {
    fileInfo: ReferencedFileInfo,
    tagIdentifiers: Array<TagIdentifier>,
    toString: () => string;
}

export type Report = {
    allModules: Array<ModuleReport>,
    date: Date,
    projectName: string,
    jobName: string,
    untaggedFilesAsModule: ModuleReport,
};

export class ReportGenerator {
    public static UNTAGGED_FILES_MODULE_NAME: Module["name"] = "__UNTAGGED_FILES_MODULE_NAME__";

    constructor(
        private _repository: GitRepository,
        private _tagsDefinitionFile: TagsDefinitionFile,
        private _fileTagsDatabase: FileTagsDatabase,
        private _configFile: ConfigFile,
        private _referenceFinders: Array<IReferenceFinder>,
    ) { }

    public async generateReportForCommit(commit: Commit, projectName: string, relevancyMap: RelevancyMap): Promise<Report> {
        return this.generateReportForCommits([commit], projectName, "-", true, relevancyMap);
    }

    public async generateReportForCommits(
        commits: Array<Commit>,
        projectName: string = "undefined",
        jobName: string = "undefined",
        printDebugInfo: boolean = false,
        relevancyMap?: RelevancyMap,
    ): Promise<Report> {
        const filesAffectedByCommits: Array<FileData> = await this._repository.getFileDataForCommits(commits);

        return new Promise<Report>(async (resolve, reject) => {

            // All modified files
            const fileInfoArray: FileInfo[] = this._getFileInfo(filesAffectedByCommits, relevancyMap);

            const affectedModules = this._getAffectedModules(fileInfoArray);

            if (printDebugInfo) {
                console.log("---- File Info ----")
                console.log(fileInfoArray);
                console.log("---- Affected Modules ----")
                console.log(affectedModules);
            }

            const report: Report = {
                allModules: [],
                date: new Date(),
                projectName: projectName,
                jobName: jobName,
                untaggedFilesAsModule: {
                    module: ReportGenerator.UNTAGGED_FILES_MODULE_NAME,
                    files: []
                },
            };

            for (const module of affectedModules) {
                const fileInfoMatchingModule = fileInfoArray
                    .filter(fileInfo => !fileInfo.ignored)
                    .filter(fileInfo => fileInfo.tagIdentifiers.some(identifier => identifier.module === module.name))

                const moduleReport: ModuleReport = {
                    module: module.name,
                    files: [...fileInfoMatchingModule],
                }

                report.allModules.push(moduleReport);
            }

            // Find files which are not tagged
            for (const fileInfo of fileInfoArray) {

                const anyModuleReportHasIt = report.allModules.some(moduleReport => moduleReport.files.some(moduleFileInfo => {
                    return moduleFileInfo.file === fileInfo.file;
                }));

                if (!anyModuleReportHasIt && !fileInfo.ignored && (fileInfo.linesAdded > 0 || fileInfo.linesRemoved > 0)) {
                    report.untaggedFilesAsModule.files.push(fileInfo);
                }
            }

            resolve(report);
        });
    }

    private _getRelevancyForFileData(fileData: FileData, relevancyMap: RelevancyMap): Relevancy | null {
        if (!fileData.commitedIn) {
            throw new Error(`[ReportGenerator]: File data '${fileData.newPath}' does not have commited in value`);
        }

        const commitRelevancyArray = relevancyMap.get(fileData.commitedIn.sha());

        if (!commitRelevancyArray) {
            console.log(`[ReportGenerator]: No relevancy data for commit '${fileData.commitedIn}'`);
            return null;
        }

        const fileRelevancy = commitRelevancyArray.find(entry => entry.path === fileData.newPath);

        if (!fileRelevancy) {
            console.log(`[ReportGenerator]: No relevancy found for file '${fileData.newPath}'`);
            return null;
        }

        return fileRelevancy.relevancy;
    }

    private _getFileInfo(fileDataArray: FileData[], relevancyMap?: RelevancyMap): FileInfo[] {

        const fileInfoArray: Array<FileInfo> = [];

        for (const fileData of fileDataArray) {
            const relevancy = relevancyMap ? this._getRelevancyForFileData(fileData, relevancyMap) : null;

            const fileInfo: FileInfo = {
                file: fileData.newPath,
                tagIdentifiers: this._fileTagsDatabase.getTagIdentifiersForFile(fileData.newPath),
                linesAdded: fileData.linesAdded,
                linesRemoved: fileData.linesRemoved,
                usedIn: this._getUsedIn(fileData, relevancy),
                relevancy: relevancy,
                ignored: this._configFile.isFileExtensionIgnored(fileData.newPath),
            };

            Logger.pushFileInfo(fileData, fileInfo);

            fileInfoArray.push(fileInfo);
        }
        return fileInfoArray;
    }
    private _getUsedIn(fileData: FileData, relevancy: Relevancy | null) {
        return this._getFileReferences(fileData.newPath, relevancy);
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

    private _getFileReferences(file: string, relevancy: Relevancy | null): Array<FileReference> {
        const references: Array<FileReference> = [];

        if (!fileExists(file)) {
            return references;
        }

        this._referenceFinders.forEach(referenceFinder => {
            if (!referenceFinder.getSupportedFilesExtension().includes(getExtension(file))) {
                return;
            }
            const foundReferences = referenceFinder.findReferences(file, relevancy);

            foundReferences.forEach(reference => {
                const fileReference: FileReference = {
                    fileInfo: reference,
                    tagIdentifiers: this._fileTagsDatabase.getTagIdentifiersForFile(reference.filename),
                    toString: function() {
                        return this.tagIdentifiers.length > 0
                            ? this.tagIdentifiers.map(tagIdentifier => `${tagIdentifier.module} / ${tagIdentifier.tag}`).join(', ')
                            : this.fileInfo.filename
                    }
                };

                console.log(fileReference.toString());

                references.push(fileReference);
            });
        });

        return references;
    }

    private _calculateLines(fileInfoArray: FileInfo[]): { added: number, removed: number } {
        let combinedLinesAdded = 0;
        let combinedLinesRemoved = 0;
        let output = "";

        fileInfoArray
            .filter(fileInfo => !fileInfo.ignored && !(fileInfo.linesAdded === 0 && fileInfo.linesRemoved === 0))
            .forEach(file => {
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

    private _getAffectedTags(moduleReport: ModuleReport): Array<TagIdentifier> {
        const allTags: Array<TagIdentifier> = [];
        const currentModule = this._tagsDefinitionFile.getModuleByName(moduleReport.module);

        moduleReport.files.forEach(file => {
            file.tagIdentifiers.forEach(tagIdentifier => {
                if (tagIdentifier.module === currentModule?.name
                    && !allTags.some(tag => tag.module === tagIdentifier.module && tag.tag === tagIdentifier.tag)) {
                    allTags.push(tagIdentifier);
                }
            })
        })

        return allTags.map(tag => tag);
    }

    private _getReferencedTags(moduleReport: ModuleReport): {
        uniqueModules: Array<ModuleInfo>,
        tagInfo: Array<TagInfo>,
        untaggedReferences: Array<ReferencedFileInfo>
        unusedReferences: Array<ReferencedFileInfo>
    } {
        const uniqueReferencedTags: Array<Tag["name"]> = [];
        const untaggedReferences: Array<ReferencedFileInfo> = [];

        moduleReport.files
            .filter(fileInfo => !fileInfo.ignored && !(fileInfo.linesAdded === 0 && fileInfo.linesRemoved === 0))
            .forEach(fileInfo => {
                fileInfo.usedIn.forEach(reference => {
                    if (!reference.tagIdentifiers.length) {
                        untaggedReferences.push(reference.fileInfo);
                    }

                    reference.tagIdentifiers.forEach(identifier => {
                        if (!uniqueReferencedTags.includes(identifier.tag)) {
                            uniqueReferencedTags.push(identifier.tag);
                        }
                    })
                })
            });

        const uniqueModules: Array<ModuleInfo> = [];
        const unusedReferences: Array<ReferencedFileInfo> = [];

        const tagInfo = uniqueReferencedTags.map((referencedTag, index) => {

            const referencedModulesMatchingTag: Array<Module["name"]> = [];

            moduleReport.files
                .filter(fileInfo => !fileInfo.ignored && !(fileInfo.linesAdded === 0 && fileInfo.linesRemoved === 0))
                .forEach(fileInfo => {

                    fileInfo.usedIn.forEach(reference => {
                        if (reference.fileInfo.unused) {
                            unusedReferences.push(reference.fileInfo);
                        }

                        reference.tagIdentifiers.forEach(identifier => {
                            if (identifier.tag === referencedTag
                                && !referencedModulesMatchingTag.includes(identifier.module)
                            ) {
                                referencedModulesMatchingTag.push(identifier.module);

                                const infoInUniqueModules = uniqueModules.find(info => info.module === identifier.module)

                                if (infoInUniqueModules && !infoInUniqueModules.tags.includes(identifier.tag)) {
                                    infoInUniqueModules.tags.push(identifier.tag);
                                } else {
                                    uniqueModules.push({
                                        module: identifier.module,
                                        tags: [identifier.tag],
                                    });
                                }
                            }
                        })
                    })
                });
            return {
                tag: referencedTag,
                modules: referencedModulesMatchingTag,
            }
        })
        return {
            uniqueModules: uniqueModules.sort((uniqueA, uniqueB) => uniqueB.tags.length - uniqueA.tags.length),
            tagInfo: tagInfo.sort((tagInfoA, tagInfoB) => tagInfoB.modules.length - tagInfoA.modules.length),
            untaggedReferences: untaggedReferences,
            unusedReferences: unusedReferences
        }
    };

    public getReportAsJiraComment(report: Report, printToConsole = false): string {
        const finalReportTableData: Array<ReportTableRow> = report.allModules
            .map(moduleReport => {
                const modulesAndTagsInfo = this._getReferencedTags(moduleReport);

                return {
                    affectedTags: this._getAffectedTags(moduleReport),
                    lines: this._calculateLines(moduleReport.files),
                    lastChange: report.date,
                    uniqueModules: modulesAndTagsInfo.uniqueModules,
                    referencedTags: modulesAndTagsInfo.tagInfo,
                    untaggedReferences: modulesAndTagsInfo.untaggedReferences,
                    unusedReferences: modulesAndTagsInfo.unusedReferences,
                };
            })
            .filter(moduleReport => moduleReport.affectedTags.length > 0)
            .filter(moduleReport => moduleReport.lines.added > 0 || moduleReport.lines.removed > 0);

        const untaggedFilesTableRowInfo = this._getReferencedTags(report.untaggedFilesAsModule);

        const untaggedFilesTableRow: UntaggedFilesTableRow = {
            affectedFiles: report.untaggedFilesAsModule.files,
            lines: this._calculateLines(report.untaggedFilesAsModule.files),
            uniqueModules: untaggedFilesTableRowInfo.uniqueModules,
            referencedTags: untaggedFilesTableRowInfo.tagInfo,
            untaggedReferences: untaggedFilesTableRowInfo.untaggedReferences,
            unusedReferences: untaggedFilesTableRowInfo.unusedReferences,
        };

        const jiraBuilder = new JiraBuilder();
        return jiraBuilder.parseReport(
            finalReportTableData,
            untaggedFilesTableRow,
            report.date,
            report.projectName,
            report.jobName,
            printToConsole,
            this._configFile.getLogsURL(report.jobName),
        );
    }

    public isReportEmpty(report: Report): boolean {
        return report.allModules.length === 0;
    }
}