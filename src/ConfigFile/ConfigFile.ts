import fs from "fs";
import path from "path";

export type ProjectConfig = {
    name: string
    location: string,
    ignore?: Array<string>
};

export type ScopeTagsConfig = {
    projects: Array<ProjectConfig> // tsconfig.json path relative to git project root
};

export class ConfigFile {
    private static PATH = ".scope/config.json";

    private _config: ScopeTagsConfig;

    constructor(root: string) {
        const configFilePath = this._getConfigFilePath(root);

        if (!fs.existsSync(configFilePath)) {
            this._initDefaultConfig(configFilePath, root);
            console.log(`Created empty configuration file at: ${configFilePath}`);
            return;
        }

        this._config = this._loadConfigFromFile(configFilePath);
    }

    private _loadConfigFromFile(path: string): ScopeTagsConfig {
        try {
            return JSON.parse(fs.readFileSync(path, { encoding: "utf8" }));
        } catch (e) {
            throw new Error(`Error while reading configuration file, reason: ${e}`)
        }
    }

    private _initDefaultConfig(path: string, root: string): string {
        const defaultConfig: ScopeTagsConfig = {
            projects: [
                {
                    name: "Project",
                    location: "tsconfig.json"
                }
            ]
        };

        this._ensureScopeFolderExists(root);
        fs.writeFileSync(path, JSON.stringify(defaultConfig, null, 4), { encoding: "utf8", flag: "wx" });
        return path;
    }

    private _getConfigFilePath(root: string) {
        return path.join(root, ConfigFile.PATH);
    }

    private _ensureScopeFolderExists(root: string) {
        const scopeFolderPath = path.join(root, ".scope");

        if (!fs.existsSync(scopeFolderPath)) {
            fs.mkdirSync(scopeFolderPath);
        }
    }
}