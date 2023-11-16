import { GitRepository } from "../Git/GitRepository";
import { FileData } from "../Git/Types";
import { FileTagsDatabase } from "../Scope/FileTagsDatabase";
import { Tag, TagsDefinitionFile } from "../Scope/TagsDefinitionFile";
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

        const tagsMappedToFiles = new Map<FileData, Array<Tag>>();
        let untaggedFiles: Array<FileData> = [...fileDataNotFoundInDatabase];

        while (untaggedFiles.length) {
            // Select files
            const selectedFiles = await this._selectFiles(untaggedFiles);
            untaggedFiles = untaggedFiles.filter(file => !selectedFiles.includes(file));

            // Select tags
            const selectedTags: Array<Tag> = await tagManager.selectMultipleTags();

            for (const file of selectedFiles) {
                tagsMappedToFiles.set(file, selectedTags);
            }
        }

        // Save to database
        tagsMappedToFiles.forEach((tags: Array<Tag>, data: FileData) => {
            if (!tags.length) {
                this._database.addIgnoredFile(data.newPath);
            } else {
                this._database.addMultipleTagsToFile(tags, data.newPath);
            }
        })
        this._database.save();
    }

    private async _selectFiles(fileData: Array<FileData>): Promise<FileData[]> {
        const fileDataAsOptions = this._mapFileDataToOptions(fileData);

        const prompt = new MultiSelect({
            name: 'value',
            message: 'Select files to tag',
            limit: 7,
            choices: fileDataAsOptions,
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

        const selected = await prompt.run();
        return Object.values(selected);
    }

    private _mapFileDataToOptions(fileData: Array<FileData>): Array<FileAsOption> {
        return fileData.map(file => ({ name: file.oldPath, value: file })); // TODO: What about oldPath?
    }

    private async _exit() {
        return Promise.resolve();
    }
}