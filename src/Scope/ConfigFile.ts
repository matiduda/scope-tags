import path from "path";
import { JSONFile } from "../FileSystem/JSONFile";
import { IJSONFileDatabase } from "./IJSONFileDatabase";

export type ProjectConfig = {
    name: string
    location: string,
    useExternalImportMap?: string,
    supportedFiles?: Array<string>,
};

export type ConfigFileType = {
    projects: Array<ProjectConfig> // tsconfig.json path relative to git project root
    gitCommitCountLimit: number,
    updateIssueURL?: string,
    ignoredExtensions?: Array<string>,
};

export class ConfigFile implements IJSONFileDatabase<ConfigFile> {
    private static PATH = ".scope/config.json";

    private _root: string;
    private _config: ConfigFileType;

    constructor(root: string) {
        this._root = root;
    }

    public initDefault() {
        const defaultConfig: ConfigFileType = {
            projects: [
                {
                    name: "Project",
                    location: "tsconfig.json",
                }
            ],
            gitCommitCountLimit: 20
        };
        JSONFile.niceWrite(this._getPath(), defaultConfig);
    }

    private _getPath(): string {
        return path.join(this._root, ConfigFile.PATH);
    }

    public load(): ConfigFile {
        this._config = JSONFile.loadFrom<ConfigFileType>(this._getPath());
        return this;
    }

    public save(): string {
        const savedFilePath = this._getPath();
        JSONFile.niceWrite(savedFilePath, this._config);
        return savedFilePath;
    }

    public getProjects(): Array<ProjectConfig> {
        return this._config.projects;
    }

    public getUpdateIssueURL(): string | undefined {
        return this._config.updateIssueURL;
    }

    public isFileExtensionIgnored(file: string): boolean {
        if (this._config.ignoredExtensions) {
            return this._config.ignoredExtensions.includes(path.extname(file));
        }
        return false;
    }
}
