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
    gitCommitCountLimit: number,        // Maximum commits to search for when doing rev walk on git push - used just on te user side
    updateIssueURL?: string,
    ignoredExtensions?: Array<string>,
    viewIssueURL?: string, // Used only for linking to issues in HTML logs
    logsURL?: string,
    repositoryURL?: string, // Used only in HTML logs to link to the files directly, expandable with file paths
    seeCommitURL?: string, // Used only in HTML logs to link to the commits directly, expandable with commit SHA
};

export class ConfigFile implements IJSONFileDatabase<ConfigFile> {
    private static PATH = ".scope/config.json";
    private static LOGURL_BUILD_REPLACE_TAG = "__BUILD__";

    private _root: string;
    private _config: ConfigFileType;

    _loaded: boolean = false;

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
            gitCommitCountLimit: 100,
        };
        JSONFile.niceWrite(this._getPath(), defaultConfig);
    }

    private _getPath(): string {
        return path.join(this._root, ConfigFile.PATH);
    }

    public load(): ConfigFile {
        this._config = JSONFile.loadFrom<ConfigFileType>(this._getPath());
        this._loaded = true;
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

    public getIgnoredFileExtenstions(): string[] {
        return this._config.ignoredExtensions || [];
    }

    public getViewIssueUrl(): string | undefined {
        return this._config.viewIssueURL;
    }

    public getRepositoryURL(): string | undefined {
        return this._config.repositoryURL;
    }

    public getSeeCommitURL(): string | undefined {
        return this._config.seeCommitURL;
    }

    public getLogsURL(buildTag: string): string | undefined {
        if (!buildTag) {
            console.log("[ConfigFile] Could not create logs URL because of empty buildTag");
            return;
        } else if (!this._config.logsURL?.includes(ConfigFile.LOGURL_BUILD_REPLACE_TAG)) {
            console.log(`[ConfigFile] Could not create logs URL because logsURL does not include required tag '${ConfigFile.LOGURL_BUILD_REPLACE_TAG}'`);
            return;
        }
        return this._config.logsURL?.replace(ConfigFile.LOGURL_BUILD_REPLACE_TAG, buildTag);
    }
}
