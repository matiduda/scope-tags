import path from "path";
import fs from "fs";
import { JSONFile } from "../FileSystem/JSONFile";
import { IJSONFileDatabase } from "./IJSONFileDatabase";
import { Tag } from "./TagsDefinitionFile";
import { FileData } from "../Git/Types";

type FileMetadata = {
    tags: Array<Tag["name"]>;
};

type FileArray = {
    [file: string]: FileMetadata
}

export enum FileStatusInDatabase {
    NOT_IN_DATABASE = "NOT_IN_DATABASE",
    UNTAGGED = "UNTAGGED",
    TAGGED = "TAGGED",
    IGNORED = "IGNORED",
}

interface FileTagsDatabaseType {
    files: FileArray,
    ignoredFiles: Array<string>,
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
            files: {},
            ignoredFiles: [],
        };

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
            throw new Error(`File not found: ${filePath}`);
        }
        if (!tags.length) {
            throw new Error("Tags array is empty");
        }

        const tagNames = [...tags].map(tag => tag.name);
        const fileMetadata = this._fileTagsDatabaseData.files[filePath];

        if (!fileMetadata) {
            this._fileTagsDatabaseData.files[filePath] = { tags: tagNames };
            return;
        }

        const currentTags = this._fileTagsDatabaseData.files[filePath]?.tags || [];
        const newTags = currentTags.concat(tagNames.filter(tagName => !currentTags.includes(tagName)));

        this._fileTagsDatabaseData.files[filePath] = { tags: newTags };
    }

    private _isDirectory(path: string) {
        return fs.lstatSync(path).isDirectory();
    }

    public addSingleTagToAllFilesInDirectory(tag: Tag, directoryPath: string, recursive: boolean = false) {
        if (!this._isDirectory(directoryPath)) {
            throw new Error(`File '${directoryPath}' is not a directory`);
        }

        fs.readdir(directoryPath, (err, files) => {
            if (files.some(file => this._isDirectory(file)) && !recursive) {
                console.log(`Cannot tag directory '${directoryPath}', as it consists of directory is not a directory`);

            }

            files.forEach(file => {
                console.log(file);
            });
        });
    }

    public getTagNamesForFile(path: string): Array<Tag["name"]> {
        const fileMetadata = this._fileTagsDatabaseData.files[path];
        if (!fileMetadata) {
            throw new Error("No tags found for: " + path);
        }
        return fileMetadata.tags;
    }

    public filterAlreadyTaggedFiles(fileData: Array<FileData>) {
        const allFiles = Object.keys(this._fileTagsDatabaseData.files);
        return fileData.filter(data => {
            if (this._fileTagsDatabaseData.ignoredFiles.includes(data.newPath)) {
                return false;
            } else if (allFiles.includes(data.newPath)) {
                return false
            }
            return true;
        });
    }

    public checkMultipleFileStatusInDatabase(fileData: Array<FileData>): Map<FileData, FileStatusInDatabase> {
        const filesStatusesInDatabase = new Map<FileData, FileStatusInDatabase>();

        fileData.forEach((data: FileData) => {
            filesStatusesInDatabase.set(data, this._checkFileStatus(data.newPath));
        });
        return filesStatusesInDatabase;
    }

    private _checkFileStatus(filePath: string): FileStatusInDatabase {
        const fileDataReference = this._fileTagsDatabaseData.files[filePath];
        if (!fileDataReference) {
            return FileStatusInDatabase.NOT_IN_DATABASE;
        }
        if (fileDataReference && !fileDataReference.tags.length) {
            return FileStatusInDatabase.UNTAGGED;
        }
        return FileStatusInDatabase.TAGGED;
        // TODO: Add ignored files statuses
    }

    public getFileStatusInDatabaseDescription(status: FileStatusInDatabase | undefined): string {
        // Unused - maybe delete?
        if (!status) {
            return `No description for status ${status}`;
        }
        const FileStatusInDatabaseReasons = new Map<FileStatusInDatabase, string>([
            [FileStatusInDatabase.NOT_IN_DATABASE, "File is not present in database"],
            [FileStatusInDatabase.UNTAGGED, "File is present in database but without any tags"],
            [FileStatusInDatabase.TAGGED, `File is correctly tagged with`],
            [FileStatusInDatabase.IGNORED, "File is ignored by scope tags"],
        ]);

        return FileStatusInDatabaseReasons.get(status) || `No description for status ${status}`;
    }

    public addIgnoredFile(file: string): void {
        if (this._fileTagsDatabaseData.ignoredFiles.includes(file)) {
            throw new Error(`Cannot ignore file ${file} as it is already ignored`);
        }
        this._fileTagsDatabaseData.ignoredFiles.push(file);
    }

    public isIgnored(file: string): boolean {
        return this._fileTagsDatabaseData.ignoredFiles.includes(file);
    }
}