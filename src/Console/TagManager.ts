import { TagsDefinitionFile } from "../Scope/TagsDefinitionFile";
import { Menu } from "./Menu";

const { Select, Toggle } = require('enquirer')

export class TagManager {

    private _tags: TagsDefinitionFile;
    private _menu: Menu;

    private _tagsWereModified = false;

    constructor(tags: TagsDefinitionFile, menu: Menu) {
        this._tags = tags;
        this._menu = menu;
    }

    public async start() {
        const prompt = new Select({
            name: 'Tag manager',
            message: 'Manage tags',
            choices: [
                { name: 'By name', value: this._manageTagsByName },
                { name: 'By module', value: this._manageTagsByModule },
                { name: "Main menu", value: this._exit }
            ],
            result(value: any) {
                const mapped = this.map(value);
                return mapped[value];
            },
        });

        const answer = await prompt.run();
        await answer.call(this);
    }

    private async _exit() {
        if (this._tagsWereModified) {
            this._tags.save();
            console.log("Tags saved ✅");
        }
        await this._menu.start();
    }
}