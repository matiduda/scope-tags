import path from "path";
import fs from "fs";
import { JSONFile } from "../FileSystem/JSONFile";
import { Module, Tag } from "./TagsDefinitionFile";
import { FileData, GitDeltaType } from "../Git/Types";
import { IJSONFileDatabase } from "./IJSONFileDatabase";
import { ConfigFile } from "./ConfigFile";

export type TagIdentifier = {
    tag: Tag["name"];
    module: Module["name"];
}

export enum FileStatusInDatabase {
    NOT_IN_DATABASE = "NOT_IN_DATABASE",
    UNTAGGED = "UNTAGGED",
    TAGGED = "TAGGED",
    IGNORED = "IGNORED",
}

type FilePath = string;

type FileInDatabaseType = {
    [key: string]: Array<TagIdentifier>,
};

type LoadedDatabaseType = {
    files: FileInDatabaseType,
    ignoredFiles: Array<string>
}

type SavedDatabaseType = {
    files: Array<{ path: FilePath, tags: Array<TagIdentifier> }>;
    ignoredFiles: Array<string>,
}

export class FileTagsDatabase implements IJSONFileDatabase<LoadedDatabaseType> {

    private static PATH = ".scope/database.json";

    private _root: string;
    private _fileTagsDatabaseData: LoadedDatabaseType;

    constructor(root: string) {
        this._root = root;
        this._fileTagsDatabaseData = this.load();
    }

    public load(): LoadedDatabaseType {
        const savedDatabase = JSONFile.loadFrom<SavedDatabaseType>(this._getPath());

        const loadedDatabase: LoadedDatabaseType = {
            files: {},
            ignoredFiles: savedDatabase.ignoredFiles,
        };

        savedDatabase.files.forEach(file => {
            const fileTags = loadedDatabase.files[file.path];
            if (fileTags) {
                // Append tags
                loadedDatabase.files[file.path] = fileTags.concat(file.tags);
            } else {
                loadedDatabase.files[file.path] = file.tags;
            }
        });

        // Remove duplicate tags
        const allEntries = Object.entries(loadedDatabase.files);
        if (allEntries) {
            allEntries.forEach(entry => {
                loadedDatabase.files[entry[0]] = entry[1].filter((tag: TagIdentifier, index: number, array: TagIdentifier[]) => {
                    return array.findIndex((t: TagIdentifier) => t.tag === tag.tag && t.module === tag.module) === index;
                });
            });
        }

        return loadedDatabase;
    }

    public initDefault() {
        const defaultFileTagsDatabase: SavedDatabaseType = {
            files: [],
            ignoredFiles: [],
        };
        JSONFile.niceWrite(this._getPath(), defaultFileTagsDatabase);
    }

    private _getPath(): string {
        return path.join(this._root, FileTagsDatabase.PATH);
    }

    public isFileInDatabase(file: string): boolean {
        return !!this._fileTagsDatabaseData.files[file];
    }

    public save(): string {
        const savedFilePath = this._getPath();

        // We sort it to reduce possible conflicts when two users modify the database at the same place

        const databaseToSave: SavedDatabaseType = {
            files: Object.entries(this._fileTagsDatabaseData.files)
                .sort((entryA, entryB) => {
                    const pathA = entryA[0].toUpperCase(); // ignore upper and lowercase
                    const pathB = entryB[0].toUpperCase(); // ignore upper and lowercase
                    if (pathA < pathB) {
                        return -1;
                    }
                    if (pathA > pathB) {
                        return 1;
                    }

                    // paths must be equal
                    return 0;
                })
                .map(entry => ({
                    path: entry[0],
                    tags: entry[1]
                })),
            ignoredFiles: this._fileTagsDatabaseData.ignoredFiles.sort()
        };

        JSONFile.niceWrite<SavedDatabaseType>(savedFilePath, databaseToSave, this._replacer);
        return savedFilePath;
    }

    public addSingleTagToFile(tagIdentifier: TagIdentifier, filePath: string) {
        this.addMultipleTagsToFile([tagIdentifier], filePath);
    }

    public addMultipleTagsToFile(tagsIdentifierArray: Array<TagIdentifier>, filePath: string): Array<TagIdentifier> {
        const relativePath = path.join(this._root, filePath);

        if (!fs.existsSync(relativePath)) {
            throw new Error(`File not found: ${relativePath}`);
        }
        if (!tagsIdentifierArray.length) {
            throw new Error("Tags array is empty");
        }

        const fileMetadata = this._fileTagsDatabaseData.files[filePath];

        if (!fileMetadata) {
            this._fileTagsDatabaseData.files[filePath] = tagsIdentifierArray;
            return tagsIdentifierArray;
        }

        const currentTags = this._fileTagsDatabaseData.files[filePath] || [];

        const addedTags: Array<TagIdentifier> = [];

        // Check if any of the tag is already assigned
        tagsIdentifierArray.forEach(tagIdentifier => {
            if (!currentTags.some(id => id.module === tagIdentifier.module && id.tag === tagIdentifier.tag)) {
                // If not - push the new identifier
                this._fileTagsDatabaseData.files[filePath].push(tagIdentifier);
                addedTags.push(tagIdentifier);
            }
        });

        return addedTags;
    }

    public removeTagsForFiles(selectedFiles: string[]) {
        selectedFiles.forEach(file => {
            delete this._fileTagsDatabaseData.files[file];
        });
    }

    private _isDirectory(path: string) {
        return fs.lstatSync(path).isDirectory();
    }

    // Unused - use this when adding --tag option to directory
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

    public getTagIdentifiersForFile(path: string): Array<TagIdentifier> {
        const fileMetadata = this._fileTagsDatabaseData.files[path];
        if (!fileMetadata) {
            return [];
        }
        return fileMetadata;
    }

    public countFilesWithTag(tag: Tag, module?: Module): number {
        return this.getFilesWithTag(tag, module).length;
    }

    public getFilesWithTag(tag: Tag, module?: Module) {
        return Object.entries(this._fileTagsDatabaseData.files).filter(entry => {
            if (module) {
                return entry[1].some(tagIdentifier => tagIdentifier.tag === tag.name && tagIdentifier.module === module.name);
            }
            return entry[1].some(tagIdentifier => tagIdentifier.tag === tag.name);
        });
    }

    public countFilesWithModule(module: Module): number {
        return this.getFilesWithModule(module).length;
    }

    public getFilesWithModule(module: Module) {
        return Object.entries(this._fileTagsDatabaseData.files).filter(entry => {
            return entry[1].some(tagIdentifier => tagIdentifier.module === module.name);
        });
    }

    public filterAlreadyTaggedFiles(fileData: Array<FileData>) {
        const allFiles = Object.keys(this._fileTagsDatabaseData.files);
        const fileDataNotFoundInDatabase = fileData.filter(data => {
            if (this._fileTagsDatabaseData.ignoredFiles.includes(data.newPath)) {
                return false;
            } else if (allFiles.includes(data.newPath)) {
                return false;
            }
            return true;
        });

        // Remove duplicates
        const uniquefileDataNotFoundInDatabase = fileDataNotFoundInDatabase.filter((value, index, array) => {
            return array.findIndex(data => data.newPath === array[index].newPath) === index;
        });

        return uniquefileDataNotFoundInDatabase;
    }

    public checkMultipleFileStatusInDatabase(fileData: Array<FileData>, configFile: ConfigFile): Map<FileData, FileStatusInDatabase> {
        const filesStatusesInDatabase = new Map<FileData, FileStatusInDatabase>();

        fileData.forEach((data: FileData) => {
            filesStatusesInDatabase.set(data, this.checkFileStatus(data.newPath, configFile));
        });
        return filesStatusesInDatabase;
    }

    // Oh boy what a mess
    private _replacer(stringifiedOutput: string) {
        return stringifiedOutput
            .replace(/{\n\s+"tag": "(.+)",\n\s+"module": "(.+)"\n\s+}/g, "{ \"tag\": \"$1\", \"module\": \"$2\" }")
            .replace(/(\s+)]\n\s+},\n\s+{\n\s+"path"/g, "]},$1{ \"path\"")
            .replace(/"tags"/g, "  \"tags\"")
            .replace(/}\n\s+]\n\s+}\n\s+],\n(\s+)"ignoredFiles"/g, "}]}],\n$1\"ignoredFiles\"")
            .replace(/\n\s+{\s\s+"path"/g, "\n            { \"path\"")
            .replace(/ {12}/g, "        ");
    }

    public checkFileStatus(filePath: string, configFile: ConfigFile): FileStatusInDatabase {
        if (this.isIgnored(filePath, configFile.getIgnoredFileExtenstions())) {
            return FileStatusInDatabase.IGNORED;
        }

        const fileDataReference = this._fileTagsDatabaseData.files[filePath];

        if (!fileDataReference) {
            return FileStatusInDatabase.NOT_IN_DATABASE;
        }
        if (fileDataReference && !fileDataReference.length) {
            return FileStatusInDatabase.UNTAGGED;
        }
        return FileStatusInDatabase.TAGGED;
    }

    public getFileStatusInDatabaseDescription(status: FileStatusInDatabase | undefined): string {
        // Unused - maybe delete?
        if (!status) {
            return `No description for status ${status}`;
        }
        const FileStatusInDatabaseReasons = new Map<FileStatusInDatabase, string>([
            [FileStatusInDatabase.NOT_IN_DATABASE, "File is not present in database"],
            [FileStatusInDatabase.UNTAGGED, "File is present in database but without any tags"],
            [FileStatusInDatabase.TAGGED, "File is correctly tagged with"],
            [FileStatusInDatabase.IGNORED, "File is ignored by scope tags"],
        ]);

        return FileStatusInDatabaseReasons.get(status) || `No description for status ${status}`;
    }

    public addIgnoredFile(file: string): void {
        // Remove file from the database
        if (this.isFileInDatabase(file)) {
            delete this._fileTagsDatabaseData.files[file];
        }

        if (this._fileTagsDatabaseData.ignoredFiles.includes(file)) {
            throw new Error(`Cannot ignore file ${file} as it is already ignored`);
        }
        this._fileTagsDatabaseData.ignoredFiles.push(file);
    }

    public unIgnoreFile(selectedFile: string) {
        const ignoredFileIndex = this._fileTagsDatabaseData.ignoredFiles.indexOf(selectedFile);
        if (ignoredFileIndex === -1) {
            throw new Error(`Cannot remove ignored file ${selectedFile} which is not in database`);
        }
        this._fileTagsDatabaseData.ignoredFiles.splice(ignoredFileIndex, 1);
    }

    private _updateFilePath(oldPath: string, newPath: string): void {
        const entry = this._fileTagsDatabaseData.files[oldPath];
        if (!entry) {
            throw new Error(`Cannot update file ${oldPath} which is not in database`);
        }
        this._fileTagsDatabaseData.files[newPath] = { ...entry };
        delete this._fileTagsDatabaseData.files[oldPath];
    }

    public isIgnored(file: string, ignoredFileExtensions?: Array<string>): boolean {
        if (file.startsWith(".scope")) {
            return true;
        }

        const fileExtenstion = path.extname(file);
        if (ignoredFileExtensions && fileExtenstion) {
            if (ignoredFileExtensions.includes(fileExtenstion)) {
                return true;
            }
        }
        return this._fileTagsDatabaseData.ignoredFiles.includes(file);
    }

    private _updateIgnoredFilePath(oldPath: string, newPath: string): void {
        const ignoredFileIndex = this._fileTagsDatabaseData.ignoredFiles.indexOf(oldPath);
        if (ignoredFileIndex === -1) {
            throw new Error(`Cannot update ignored file ${oldPath} which is not in database`);
        }
        this._fileTagsDatabaseData.ignoredFiles[ignoredFileIndex] = newPath;
    }

    // Returns files to be tagged
    public updateDatabaseBasedOnChanges(fileDataArray: FileData[]): FileData[] {
        fileDataArray.forEach(fileData => {
            // If file renamed - update corresponding entry
            if (fileData.change === GitDeltaType.RENAMED) {
                if (this.isFileInDatabase(fileData.oldPath)) {
                    this._updateFilePath(fileData.oldPath, fileData.newPath);
                } else if (this.isIgnored(fileData.oldPath)) {
                    this._updateIgnoredFilePath(fileData.oldPath, fileData.newPath);
                }
            }
            // If file deleted - remove from database
            if (fileData.change === GitDeltaType.DELETED) {
                // TODO: Add
            }
        });
        return fileDataArray.filter(fileData => fileData.change !== GitDeltaType.DELETED);
    }

    public getPath(): string {
        return FileTagsDatabase.PATH;
    }
}
