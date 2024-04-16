const { Invisible, Select } = require("enquirer");
import { CommandType } from "../Commands/CommandType";
import { FileTagsDatabase } from "../Scope/FileTagsDatabase";
import { TagsDefinitionFile } from "../Scope/TagsDefinitionFile";
import { Menu } from "./Menu";

type CommandAsOption = { name: string, value: CommandType };



export class CommandManager {

    private static readonly GO_BACK = "__back__";

    private _tags: TagsDefinitionFile;
    private _database: FileTagsDatabase;

    private _menu: Menu;

    constructor(tags: TagsDefinitionFile, database: FileTagsDatabase, menu: Menu) {
        this._tags = tags;
        this._database = database;
        this._menu = menu;
    }

    public async start(): Promise<void> {

        const testCommand: CommandType = {
            name: "Test command",
            runOption: "--test",
            description: "Description of a command",
            execute: () => console.log("RUNNING TEST COMMAND!!!!"),
        };

        const backToMenuOption = { name: "Back to menu", value: CommandManager.GO_BACK };

        const commandsMappedToOptions = this._mapCommandsToOptions([testCommand]);

        const prompt = new Select({
            name: "Select command",
            message: "Command manager",
            choices: [
                ...commandsMappedToOptions,
                backToMenuOption
            ],
            result(value: any) {
                const mapped = this.map(value);
                return mapped[value];
            },
        });

        const answer = await prompt.run();

        if (answer === CommandManager.GO_BACK) {
            await this._exit();
            return;
        }

        await this._selectCommand(answer);
    }

    private async _selectCommand(command: CommandType) {
        command.execute();

        const prompt = new Invisible({
            name: "invisible",
            message: `Executed ${command.name}.Press ENTER to return to command selection`
        });

        await prompt.run();
        await this.start.call(this);
    }

    private _mapCommandsToOptions(commands: CommandType[]): CommandAsOption[] {
        return commands.map(command => ({ name: `→ ${command.name} (${command.runOption})`, value: command }));
    }

    private async _exit(): Promise<void> {
        await this._menu.start();
    }
}