const { Invisible, Select } = require("enquirer");
import { CommandType } from "../Commands/CommandType";
import { FileTagsDatabase } from "../Scope/FileTagsDatabase";
import { TagsDefinitionFile } from "../Scope/TagsDefinitionFile";
import { Menu } from "./Menu";

type CommandAsOption = { name: string, value: CommandType };

export class CommandManager {

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

        const commandsMappedToOptions = this._mapCommandsToOptions([testCommand]);

        const prompt = new Select({
            name: "Select command",
            message: "Command manager",
            choices: commandsMappedToOptions,
            result(value: any) {
                const mapped = this.map(value);
                return mapped[value];
            },
        });

        const answer = await prompt.run();

        console.log(answer);

        await this._selectCommand(answer);
    }

    private async _selectCommand(command: CommandType) {
        command.execute();

        const prompt = new Invisible({
            name: "invisible",
            message: "Press ENTER to return to command selection"
        });

        await prompt.run();
        await this.start.call(this);
    }

    private _mapCommandsToOptions(commands: CommandType[]): CommandAsOption[] {
        return commands.map(command => ({ name: `→ ${command.name}`, value: command }));
    }
}