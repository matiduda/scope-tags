import { Commit } from "nodegit";
import { GitRepository } from "../Git/GitRepository";
import { FileTagsDatabase, TagIdentifier } from "../Scope/FileTagsDatabase";
import { Module, Tag, TagsDefinitionFile } from "../Scope/TagsDefinitionFile";
import { FileData, Relevancy } from "../Git/Types";
import { IReferenceFinder, ReferencedFileInfo } from "../References/IReferenceFinder";
import { fileExists, getExtension } from "../FileSystem/fileSystemUtils";
import { JiraBuilder, ModuleInfo, ReportTableRow, TagInfo } from "./JiraBuilder";
import { CommitMessageRelevancyInfo, RelevancyMap } from "../Console/RelevancyTagger";

export type ModuleReport = {
    module: Module["name"],
    files: Array<FileInfo>,
}

type FileInfo = {
    file: string,
    tagIdentifiers: Array<TagIdentifier>,
    linesAdded: number,
    linesRemoved: number,
    usedIn: Array<FileReference>,
    relevancy: Relevancy | null,
}

type FileReference = {
    fileInfo: ReferencedFileInfo,
    tagIdentifiers: Array<TagIdentifier>,
}

export type Report = {
    allModules: Array<ModuleReport>
    date: Date,
    projectName: string,
    jobName: string,
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

    public async generateReportForCommit(commit: Commit, projectName: string): Promise<Report> {
        return this.generateReportForCommits([commit], projectName, "-", true);
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

            const fileInfoArray: FileInfo[] = this._getFileInfo(filesAffectedByCommits, relevancyMap)
            const affectedModules = this._getAffectedModules(fileInfoArray);

            if (printDebugInfo) {
                console.log()
            }

            const report: Report = {
                allModules: [],
                date: new Date(),
                projectName: projectName,
                jobName: jobName
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

    private _getRelevancyForFileData(fileData: FileData, relevancyMap: RelevancyMap): Relevancy | null {
        if (!fileData.commitedIn) {
            throw new Error(`[ReportGenerator]: File data '${fileData.newPath}' does not have commited in value`);
        }

        console.log(relevancyMap);
        console.log(fileData);

        const commitRelevancyArray = relevancyMap.get(fileData.commitedIn);

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
            const fileInfo: FileInfo = {
                file: fileData.newPath,
                tagIdentifiers: this._fileTagsDatabase.getTagIdentifiersForFile(fileData.newPath),
                linesAdded: fileData.linesAdded,
                linesRemoved: fileData.linesRemoved,
                usedIn: this._getFileReferences(fileData.newPath),
                relevancy: relevancyMap ? this._getRelevancyForFileData(fileData, relevancyMap) : null,
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
                    fileInfo: reference,
                    tagIdentifiers: this._fileTagsDatabase.getTagIdentifiersForFile(reference.filename),
                };
                references.push(fileReference);
            });
        });

        return references;
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
            const modulesAndTagsInfo = this._getReferencedTags(moduleReport);

            return {
                affectedTags: this._getAffectedTags(moduleReport),
                lines: this._calculateLines(moduleReport),
                lastChange: report.date,
                uniqueModules: modulesAndTagsInfo.uniqueModules,
                referencedTags: modulesAndTagsInfo.tagInfo,
                unusedReferences: modulesAndTagsInfo.unusedReferences
            };
        });

        const jiraBuilder = new JiraBuilder();
        return jiraBuilder.parseReport(
            finalReportTableData,
            report.date,
            report.projectName,
            report.jobName,
            printToConsole
        );
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

    private _getReferencedTags(moduleReport: ModuleReport): {
        uniqueModules: Array<ModuleInfo>,
        tagInfo: Array<TagInfo>,
        unusedReferences: Array<ReferencedFileInfo>
    } {
        const uniqueReferencedTags: Array<Tag["name"]> = [];

        moduleReport.files.forEach(fileInfo => {
            fileInfo.usedIn.forEach(reference => {
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

            moduleReport.files.forEach(fileInfo => {
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

                            if (infoInUniqueModules) {
                                infoInUniqueModules.count++;
                            } else {
                                uniqueModules.push({
                                    module: identifier.module,
                                    count: 1,
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
            uniqueModules: uniqueModules.sort((uniqueA, uniqueB) => uniqueB.count - uniqueA.count),
            tagInfo: tagInfo.sort((tagInfoA, tagInfoB) => tagInfoB.modules.length - tagInfoA.modules.length),
            unusedReferences: unusedReferences
        }
    };
}