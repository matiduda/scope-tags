import { Commit } from "nodegit";
import { GitRepository } from "../Git/GitRepository";
import { FileData } from "../Git/Types";
import { FileTagsDatabase, TagIdentifier } from "../Scope/FileTagsDatabase";
import { TagsDefinitionFile } from "../Scope/TagsDefinitionFile";
import { TagManager } from "./TagManager";
import { YesNoMenu } from "./YesNoMenu";
import { getFileDirectoryPath } from "../FileSystem/fileSystemUtils";

const { MultiSelect } = require('enquirer');

type BasicFileAsOption = { name: string, value: FileData };

type FileAsOption = BasicFileAsOption
    | { message: string, role: string }
    | { disabled: boolean, hint: string, choices: BasicFileAsOption[] };

type FileOrIgnored = { path: string, ignored: boolean };
type FileToReassignTagsAsOption = { name: string, value: FileOrIgnored }

export class FileTagger {
    constructor(
        private _tags: TagsDefinitionFile,
        private _database: FileTagsDatabase,
        private _repository: GitRepository) {
    }

    public async start(fileData: Array<FileData>, filterAlreadyTaggedFiles = true) {
        const tagManager = new TagManager(this._tags, this._database);

        const fileDataToTag = filterAlreadyTaggedFiles ? this._database.filterAlreadyTaggedFiles(fileData) : fileData;
        let untaggedFiles: Array<FileData> = [...fileDataToTag];

        const tagsMappedToFiles = new Map<FileData, Array<TagIdentifier>>();

        while (untaggedFiles.length) {
            // Select files
            const selectedFiles = await this._selectFiles(untaggedFiles);

            if (!selectedFiles.length) {
                break;
            }

            // Select tags
            const commonTagIdentifiers = this._getCommonTagIdentifiers(selectedFiles);

            try {
                const selectedTags: Array<TagIdentifier> = await tagManager.selectMultipleTagIdentifiers(commonTagIdentifiers);

                if (!selectedTags.length) {
                    // Confirmation to ignore files
                    if (await this._isUserSureToIgnoreFiles(selectedFiles)) {
                        for (const file of selectedFiles) {
                            tagsMappedToFiles.set(file, []);
                        }
                        untaggedFiles = untaggedFiles.filter(file => !selectedFiles.includes(file));
                    }
                } else {
                    for (const file of selectedFiles) {
                        tagsMappedToFiles.set(file, selectedTags);
                    }
                    untaggedFiles = untaggedFiles.filter(file => !selectedFiles.includes(file));
                }
            } catch (e) {
                // Do nothing, user just exited from tag selection
            }
        }

        const fileDataToReturn: Array<FileData> = [];

        // Save to database
        tagsMappedToFiles.forEach((tags: Array<TagIdentifier>, data: FileData) => {
            if (!tags.length) {
                console.log(`File ${data.newPath} ignored`);
                this._database.addIgnoredFile(data.newPath);
            } else {
                const addedTags = this._database.addMultipleTagsToFile(tags, data.newPath);
                console.log(`Added tags to ${data.newPath}: ${addedTags.map(id => id.tag).join(", ")}`);
                fileDataToReturn.push(data);
            }
        })

        // IMPORRTANT: Database is updated, but not yet saved, rememmber to call database.save() !
        return fileDataToReturn;
    }

    private async _isUserSureToIgnoreFiles(selectedFiles: FileData[]): Promise<boolean> {
        return await (new YesNoMenu()).ask(
            "Are you sure you want to ignore these files? (they won't be checked in the future)",
            true,
            selectedFiles.map(fileData => fileData.newPath).join('\n') + '\n',
        );
    }

    private _getCommonTagIdentifiers(selectedFiles: FileData[]): Array<TagIdentifier> {
        const uniqueTagIdentifiers: Array<TagIdentifier> = [];

        selectedFiles.map(file => {
            const fileTagIdentifers = this._database.getTagIdentifiersForFile(file.newPath);
            fileTagIdentifers.forEach(identifier => {
                if (!uniqueTagIdentifiers.some(id => id.module === identifier.module && id.tag === identifier.tag)) {
                    uniqueTagIdentifiers.push(identifier);
                }
            })
        });

        return uniqueTagIdentifiers;
    }

    private _mapFilesToReassignedOption(fileNames: Array<string>, ignored: boolean): FileToReassignTagsAsOption[] {
        const fileNamesMappedToOptions: FileToReassignTagsAsOption[] = [];

        fileNames.forEach(fileName => {
            const tagsForFile = this._database.getTagIdentifiersForFile(fileName);
            const mappedIdentifiers = !tagsForFile.length
                ? ""
                : "\t→ " + tagsForFile.map(tagIdentifier => `${tagIdentifier.tag}`).join(", ");
            const option: FileToReassignTagsAsOption = {
                name: fileName + mappedIdentifiers,
                value: {
                    path: fileName,
                    ignored: ignored
                }
            };
            fileNamesMappedToOptions.push(option);
        });

        return fileNamesMappedToOptions;
    }

    public async selectFilesToAppend(fileNames: Array<string>, ignoredFileName: Array<string>): Promise<Array<FileOrIgnored>> {
        const fileNamesAsAnswers = this._mapFilesToReassignedOption(fileNames, false);
        const ignoredFilesAsAnswers = this._mapFilesToReassignedOption(ignoredFileName, true);

        const prompt = new MultiSelect({
            name: 'value',
            message: 'Found these files in database, select files to override',
            limit: 7,
            choices: [
                ...fileNamesAsAnswers,
                ...(ignoredFileName.length ? [
                    { message: "── Ignored files ──", role: "separator" },
                    ...ignoredFilesAsAnswers,
                    { role: "separator" },
                ] : []),
            ],
            result(value: any) {
                return this.map(value);
            },
        });

        try {
            const option = await prompt.run();
            return Object.values(option);
        } catch (e) {
            return [];
        }
    }

    private async _selectFiles(fileData: Array<FileData>): Promise<FileData[]> {
        const prompt = new MultiSelect({
            name: 'value',
            message: 'Select files to apply the same tags and use ENTER to confirm',
            footer: 'CTRL+C to go to next step, G to select whole group',
            limit: 10,
            choices: this._mapFileDataToOptions(fileData),
            result(value: any) {
                return this.map(value);
            },
            validate: (result: any) => {
                if (!result.length) {
                    return "You have to select at least one file";
                }
                return true;
            },
        });

        try {
            const selected = await prompt.run();
            return Object.values(selected);
        } catch (e) {
            return [];
        }
    }

    private _createSeparatorMessage(commit?: Commit) {
        return {
            message: `── ${commit?.summary() || "Unknown commit"} ──`,
            role: "separator"
        };
    }

    private _createGroupedOption(fileData: FileData[], groupName: string) {
        return {
            choices: this._createOptions(fileData),
            hint: groupName + '/',
            disabled: true
        };
    }

    private _createOptions(fileData: FileData[]) {
        return fileData.map(data => ({ name: data.newPath, value: data }));
    }

    private _mapFileDataToOptions(fileData: Array<FileData>): FileAsOption[] {
        if (fileData.length === 0) {
            throw new Error("[FileTagger] Cannot have empty list of files to tag.");
        }

        const fileAsOptionArray: FileAsOption[] = [];

        const commitToFileDataMap: Map<Commit, FileData[]> = new Map();

        const uniqueCommits: Commit[] = [];
        fileData.forEach(file => {
            if (file.commitedIn && !uniqueCommits.includes(file.commitedIn)) {
                uniqueCommits.push(file.commitedIn);
            }
        });

        uniqueCommits.forEach(uniqueCommit => {
            commitToFileDataMap.set(uniqueCommit, fileData.filter(data => data.commitedIn === uniqueCommit));
        });

        // Group files based on the same directory
        commitToFileDataMap.forEach((matchingFileData: FileData[], commit: Commit, map: Map<Commit, FileData[]>) => {
            fileAsOptionArray.push(this._createSeparatorMessage(commit));

            // Group files with a common source directory
            const processedFileData: FileData[] = [];

            matchingFileData.forEach(dataA => {
                const currentDirectoryPath = getFileDirectoryPath(dataA.newPath);

                const groupedFiles = matchingFileData.filter(dataB => !processedFileData.includes(dataB)
                    && getFileDirectoryPath(dataB.newPath) === currentDirectoryPath);

                if (groupedFiles.length > 1) {
                    // Add as group
                    const option = this._createGroupedOption(groupedFiles, currentDirectoryPath);
                    fileAsOptionArray.push(option);
                    processedFileData.push(...groupedFiles);
                }
            });

            const ungroupedFileData = matchingFileData.filter(data => !processedFileData.includes(data));
            fileAsOptionArray.push(...this._createOptions(ungroupedFileData));
        });

        // Append files with unknown source commit
        const fileDataWithUnknownSourceCommit = fileData.filter(data => !data.commitedIn);

        if (fileDataWithUnknownSourceCommit.length) {
            fileAsOptionArray.push(this._createSeparatorMessage());
            fileAsOptionArray.push(...this._createOptions(fileDataWithUnknownSourceCommit));
        }

        return fileAsOptionArray;
    }
}