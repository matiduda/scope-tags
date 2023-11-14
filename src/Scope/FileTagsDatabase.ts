import path from "path";
import fs from "fs";
import { JSONFile } from "../FileSystem/JSONFile";
import { IJSONFileDatabase } from "./IJSONFileDatabase";
import { Tag, TagsDefinitionFile } from "./TagsDefinitionFile";

type FileMetadata = {
    tags: Array<Tag["name"]>;
};

type FileArray = {
    [dir: string]: FileMetadata
}

type DirectoryArray = {
    [file: string]: FileMetadata
}

interface FileTagsDatabaseType {
    directories: DirectoryArray,
    files: FileArray,
};

export class FileTagsDatabase implements IJSONFileDatabase<FileTagsDatabase> {
    private static PATH = ".scope/database.json";

    private _root: string;
    private _fileTagsDatabaseData: FileTagsDatabaseType;

    constructor(root: string) {
        this._root = root;
    }

    private _getPath(): string {
        return path.join(this._root, FileTagsDatabase.PATH);
    }

    public initDefault() {
        const defaultFileTagsDatabase: FileTagsDatabaseType = {
            directories: {},
            files: {}
        };

        defaultFileTagsDatabase.directories[".scope"] = { tags: [TagsDefinitionFile.getDefaultTag().name] };
        JSONFile.niceWrite(this._getPath(), defaultFileTagsDatabase);
    }

    public load(): FileTagsDatabase {
        this._fileTagsDatabaseData = JSONFile.loadFrom<FileTagsDatabaseType>(this._getPath());
        return this;
    }

    public save(): string {
        const savedFilePath = this._getPath();
        JSONFile.niceWrite(savedFilePath, this._fileTagsDatabaseData);
        return savedFilePath;
    }

    public addSingleTagToFile(tag: Tag, filePath: string) {
        this.addMultipleTagsToFile([tag], filePath);
    }

    public addMultipleTagsToFile(tags: Array<Tag>, filePath: string) {
        if (!fs.existsSync(filePath)) {
            throw new Error("File not found: " + filePath);
        }

        const tagNames = [...tags].map(tag => tag.name);
        console.log(tags);
        const fileMetadata = this._fileTagsDatabaseData.files[filePath];

        if (!fileMetadata) {
            this._fileTagsDatabaseData.files[filePath] = { tags: tagNames };
            return;
        }

        const currentTags = this._fileTagsDatabaseData.files[filePath]?.tags || [];
        const newTags = currentTags.concat(tagNames.filter(tagName => !currentTags.includes(tagName)));

        this._fileTagsDatabaseData.files[filePath] = { tags: newTags };
    }

    public getTagNamesForFile(path: string): Array<Tag["name"]> {
        const fileMetadata = this._fileTagsDatabaseData.files[path];
        if (!fileMetadata) {
            throw new Error("No tags found for: " + path);
        }
        return fileMetadata.tags;
    }
}