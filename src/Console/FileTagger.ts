import { Commit } from "nodegit";
import { GitRepository } from "../Git/GitRepository";
import { FileData } from "../Git/Types";
import { FileTagsDatabase, TagIdentifier } from "../Scope/FileTagsDatabase";
import { TagsDefinitionFile } from "../Scope/TagsDefinitionFile";
import { TagManager } from "./TagManager";

const { MultiSelect } = require('enquirer');

type FileAsOption = { name: string, value: FileData } | { message: string, role: string };

type FileOrIgnored = { path: string, ignored: boolean };
type FileToReassignTagsAsOption = { name: string, value: FileOrIgnored }

export class FileTagger {

    private _tags: TagsDefinitionFile;
    private _database: FileTagsDatabase;
    private _repository: GitRepository;

    constructor(tags: TagsDefinitionFile, database: FileTagsDatabase, repository: GitRepository) {
        this._tags = tags;
        this._database = database;
        this._repository = repository;
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
                for (const file of selectedFiles) {
                    tagsMappedToFiles.set(file, selectedTags);
                }
                untaggedFiles = untaggedFiles.filter(file => !selectedFiles.includes(file));
            } catch (e) { }
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
            message: 'Select files to apply the same tags (or CTRL+C for next step)',
            limit: 7,
            choices: [
                ...this._mapFileDataToOptions(fileData),
                { role: "separator" },
            ],
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

    private _createSeparatorMessageFromCommit(commit: Commit | undefined) {
        return {
            message: `── ${commit?.summary() || "Unknown commit"} ──`,
            role: "separator"
        };
    }

    private _mapFileDataToOptions(fileData: Array<FileData>): FileAsOption[] {
        if (fileData.length === 0) {
            throw new Error("[FileTagger] Cannot have empty list of files to tag.");
        }

        let currentCommit = fileData[0].commitedIn;

        const fileAsOptionArray: FileAsOption[] = [this._createSeparatorMessageFromCommit(currentCommit)];

        fileData.forEach(file => {
            if (file.commitedIn !== currentCommit) {
                currentCommit = file.commitedIn;
                fileAsOptionArray.push(this._createSeparatorMessageFromCommit(currentCommit));
            }

            fileAsOptionArray.push({
                name: file.oldPath,  // TODO: What about newPath?
                value: file
            })
        });

        return fileAsOptionArray;
    }
}