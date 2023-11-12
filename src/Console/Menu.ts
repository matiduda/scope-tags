import { TagManager } from "./TagManager";
import { FileTagsDatabase } from "../Scope/FileTagsDatabase";
import { ConfigFile } from "../Scope/ConfigFile";
import { Module, TagsDefinitionFile } from "../Scope/TagsDefinitionFile";
import { ModuleManager } from "./ModuleManager";

const { Select } = require('enquirer')

export class Menu {

    private _config: ConfigFile;
    private _tags: TagsDefinitionFile;
    private _database: FileTagsDatabase;

    constructor(config: ConfigFile, tags: TagsDefinitionFile, database: FileTagsDatabase) {
        this._config = config;
        this._tags = tags;
        this._database = database;
    }

    public async start() {
        const prompt = new Select({
            name: 'Menu',
            message: "Scope Tags",
            choices: [
                { name: 'Start', value: this.start },
                { name: 'Manage tags', value: this._manageTags },
                { name: 'Manage modules', value: this._manageModules },
                { name: 'Exit', value: this._exit },
            ],
            result(value: any) { // This is ugly, but we need it to retrieve the value
                const mapped = this.map(value);
                return mapped[value];
            },
        });

        try {
            const answer = await prompt.run();
            await answer.call(this);
        } catch (e) {
            this._exit();
        }
    }

    public async _manageTags() {
        const tagManager = new TagManager(this._tags, this);
        await tagManager.start();
    }

    public async manageTagsFromModule(module: Module) {
        const tagManager = new TagManager(this._tags, this);
        await tagManager.manageTagsFromModule(module);
    }


    private async _manageModules() {
        const tagManager = new ModuleManager(this._tags, this);
        await tagManager.start();
    }

    private async _exit() {
        return Promise.resolve();
    }
}