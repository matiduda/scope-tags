import { TagManager } from "./TagManager";

const { Select, Toggle } = require('enquirer')

export class Menu {

    constructor() { }

    public async start() {
        const prompt = new Select({
            name: 'Menu',
            message: 'What do you want to do?',
            choices: [
                { name: 'Start', value: this.start },
                { name: 'Manage tags', value: this._manageTags },
                { name: 'Manage files', value: this._manageFiles },
                { name: 'Exit', value: this._exit },
            ],
            result(value: any) { // This is ugly, but we need it to retrieve the value
                const mapped = this.map(value);
                return mapped[value];
            },
        });

        const answer = await prompt.run();
        console.log(answer);

        await answer.call(this);
    }

    private async _manageTags() {
        const tagManager = new TagManager();
        await tagManager.start();
        await this.start();
    }

    private async _manageFiles() {
        const prompt = new Toggle({
            message: 'Manage files',
            enabled: 'Yep',
            disabled: 'Nope'
        });

        const answer = await prompt.run();
        console.log(answer);
    }

    private async _exit() {
        // Close files and do cleanup stuff
        console.log("cleanup");
        return Promise.resolve();
    }
}