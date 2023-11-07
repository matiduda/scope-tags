import fs from "fs";
import path from "path";
import { hash } from "../utils";
import { Tag } from "./Tag";

type FileMetadata = {
    path: string,
    tags: Array<Tag>
}

type HashedFilepath = number;

export class ScopeTagDatabase {
    private static PATH = ".scope/tags.json";

    private _scopeTagDatabaseData: Map<HashedFilepath, FileMetadata>;

    constructor(root: string) {
        this._scopeTagDatabaseData = this._loadDatabaseFromFile(this._getDatabaseFilePath(root));
    }

    private _loadDatabaseFromFile(path: string): Map<number, FileMetadata> {
        if (!fs.existsSync(path)) {
            throw new Error("Scope tag database not found at: " + path);
        }

        try {
            return JSON.parse(fs.readFileSync(path, { encoding: "utf8" }));
        } catch (e) {
            throw new Error(`Error while reading database file, reason: ${e}`)
        }
    }

    private _getDatabaseFilePath(root: string) {
        return path.join(root, ScopeTagDatabase.PATH);
    }

    private _hashFilepath(path: string): number {
        return hash(path);
    }

    public getTagsForFile(path: string) {
        const fileMetadata = this._scopeTagDatabaseData.get(this._hashFilepath(path));
        if (!fileMetadata) {
            throw new Error("No tags found for: " + path);
        }
        return fileMetadata.tags;
    }
}