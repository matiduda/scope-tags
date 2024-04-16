import { TagManager } from "./TagManager";
import { Module, TagsDefinitionFile } from "../Scope/TagsDefinitionFile";
import { ModuleManager } from "./ModuleManager";
import { FileTagsDatabase } from "../Scope/FileTagsDatabase";
import { CommandManager } from "./CommandManager";

const { Select } = require("enquirer");

export class Menu {

    private _tags: TagsDefinitionFile;
    private _database: FileTagsDatabase;

    constructor(tags: TagsDefinitionFile, database: FileTagsDatabase) {
        this._tags = tags;
        this._database = database;
    }

    public async start() {
        const prompt = new Select({
            name: "Menu",
            message: "Scope Tags",
            choices: [
                { name: "Manage tags", value: this._manageTags },
                { name: "Manage modules", value: this._manageModules },
                { name: "Commands (WIP)", value: this._executeCommands },
                { name: "Exit", value: this._exit },
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
        const tagManager = new TagManager(this._tags, this._database, this);
        await tagManager.start();
    }

    public async manageTagsFromModule(module: Module) {
        const tagManager = new TagManager(this._tags, this._database, this);
        await tagManager.manageTagsFromModule(module);
    }

    private async _manageModules() {
        const moduleManager = new ModuleManager(this._tags, this._database, this);
        await moduleManager.start();
    }

    private async _executeCommands() {
        const moduleManager = new CommandManager(this._tags, this._database, this);
        await moduleManager.start();
    }

    private async _exit() {
        return Promise.resolve();
    }
}