import { GitRepository } from "../Git/GitRepository";
import { FileData } from "../Git/Types";
import { FileTagsDatabase, TagIdentifier } from "../Scope/FileTagsDatabase";
import { TagsDefinitionFile } from "../Scope/TagsDefinitionFile";
import { TagManager } from "./TagManager";

const { MultiSelect } = require('enquirer');

type FileAsOption = { name: string, value: FileData };

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

    public async start(fileData: Array<FileData>) {
        const tagManager = new TagManager(this._tags, this._database);

        const fileDataNotFoundInDatabase = this._database.filterAlreadyTaggedFiles(fileData);

        const tagsMappedToFiles = new Map<FileData, Array<TagIdentifier>>();
        let untaggedFiles: Array<FileData> = [...fileDataNotFoundInDatabase];

        while (untaggedFiles.length) {
            // Select files
            const selectedFiles = await this._selectFiles(untaggedFiles);

            if (!selectedFiles.length) {
                throw new Error("Canceled");
            }

            untaggedFiles = untaggedFiles.filter(file => !selectedFiles.includes(file));

            // Select tags
            const selectedTags: Array<TagIdentifier> = await tagManager.selectMultipleTagIdentifiers();

            for (const file of selectedFiles) {
                tagsMappedToFiles.set(file, selectedTags);
            }
        }

        // Save to database
        tagsMappedToFiles.forEach((tags: Array<TagIdentifier>, data: FileData) => {
            if (!tags.length) {
                this._database.addIgnoredFile(data.newPath);
            } else {
                this._database.addMultipleTagsToFile(tags, data.newPath);
            }
        })
        this._database.save();
    }

    private _mapFilesToReassignedOption(fileNames: Array<string>, ignored: boolean): Array<FileToReassignTagsAsOption> {
        return fileNames.map(fileName => {
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
            return option;
        });
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
                { message: "── Ignored files ──", role: "separator" },
                ...ignoredFilesAsAnswers,
                { role: "separator" },
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
            message: 'Select files to tag',
            limit: 7,
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

    private _mapFileDataToOptions(fileData: Array<FileData>): Array<FileAsOption> {
        return fileData.map(file => ({ name: file.oldPath, value: file })); // TODO: What about oldPath?
    }
}