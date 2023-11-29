import { GitRepository } from "../Git/GitRepository";
import { FileData } from "../Git/Types";
import { FileTagsDatabase, TagIdentifier } from "../Scope/FileTagsDatabase";
import { TagsDefinitionFile } from "../Scope/TagsDefinitionFile";
import { TagManager } from "./TagManager";

const { MultiSelect } = require('enquirer');

type FileAsOption = { name: string, value: FileData };

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
        const tagManager = new TagManager(this._tags);

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

    public async selectFilesToAppend(fileNames: Array<string>): Promise<Array<string>> {
        const fileNamesAsAnswers = fileNames.map(fileName => {
            return { name: fileName, value: fileName }
        });

        const prompt = new MultiSelect({
            name: 'value',
            message: 'Found these files in database, select files to override',
            limit: 7,
            choices: fileNamesAsAnswers,
            result(value: any) {
                return this.map(value);
            },
        });

        try {
            const selectedFileNames = await prompt.run();
            console.log(selectedFileNames);
            return Object.values(selectedFileNames);
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

    private async _exit() {
        return Promise.resolve();
    }
}