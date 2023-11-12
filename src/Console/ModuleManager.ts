const { Select, Form, Confirm } = require('enquirer')
import { Module, TagsDefinitionFile } from "../Scope/TagsDefinitionFile";
import { Menu } from "./Menu";

type OptionAsModule = { name: Module["name"], value: Module };

export class ModuleManager {

    private _tags: TagsDefinitionFile;
    private _menu: Menu;

    private _modulesWereModified = false;

    constructor(tags: TagsDefinitionFile, menu: Menu) {
        this._tags = tags;
        this._menu = menu;
    }

    public async start(fromModule?: Module) {
        const modulesToDisplay = fromModule
            ? this._tags.getModulesByNames(fromModule.children) : this._tags.getRootModules();

        const choices = this._mapModulesToOptions(modulesToDisplay)

        const prompt = new Select({
            name: 'Module manager',
            message: this._getHeaderFromModule(fromModule),
            choices: [
                ...choices,
                { name: 'New module', value: this._addModule },
                { name: 'Add tag', value: this._addTagToModule },
                fromModule ? {
                    name: "Back to " + fromModule.name, value: this._goBack
                } : {
                    name: "Main menu", value: this._exit
                }
            ],
            result(value: any) {
                const mapped = this.map(value);
                return mapped[value];
            },
        });

        const answer = await prompt.run();

        if (modulesToDisplay.includes(answer)) { // answer type === Module
            await this.start.call(this, answer);
        } else {
            await answer.call(this, fromModule);
        }
    }

    private async _addModule(fromModule?: Module) {

        const defaultModuleName = "Module";
        const defaultModuleDescription = "A module containing functionalities";

        const moduleInfoPrompt = new Form({
            name: 'user',
            message: 'Fill in details about the new module:',
            choices: [
                { name: 'name', message: 'Name', initial: defaultModuleName },
                { name: 'description', message: 'Description', initial: defaultModuleDescription },
            ],
            validate: (answer: any) => {
                if (!answer.name.length
                    || !answer.description.length
                    || answer.name === defaultModuleName
                    || answer.description === defaultModuleDescription
                ) {
                    return "Both name and description are required";
                } else {
                    return true;
                }
            },
        });

        const isExclusivePrompt = await new Confirm({
            name: "exclusive",
            message: 'Should the module be exclusive?\n(Meaning: only one tag per file can be added from this module)',
            question: '2 Should the module be exclusive?\n(Meaning: only one tag per file can be added from this module)',
        }).run();


        try {
            const moduleInfoAnswer = await moduleInfoPrompt.run();
            const isExclusive = await isExclusivePrompt.run();

            const newModule: Module = {
                name: moduleInfoAnswer.name,
                exclusive: isExclusive,
                tags: [],
                parent: fromModule?.name || null,
                children: [],
                description: moduleInfoAnswer.description
            };

            this._tags.addModule(newModule);
            console.log("Successfuly added module: " + newModule.name);
        } catch (e) {
            console.log("Cannot add module, reason: " + e);
        }

        this._modulesWereModified = true;
        await this.start.call(this, fromModule);
    }

    private async _goBack(fromModule?: Module) {
        if (!fromModule) {
            throw new Error("Can't go back to undefind module");
        }

        const parentModule = this._tags.getModuleByName(fromModule.parent);
        await this.start.call(this, parentModule);
    }

    private async _exit() {
        if (this._modulesWereModified) {
            this._tags.save();
            console.log("Modules saved ✅");
        }
        await this._menu.start();
    }

    private _mapModulesToOptions(modules: Array<Module>): Array<OptionAsModule> {
        return modules.map(module => ({ name: module.name, value: module }));
    }

    private _getHeaderFromModule(module: Module): string {
        if (!module.parent) {
            return `${module.name}`;
        }
        let header = "";
        const moduleParents = this._tags.getModuleParents(module);
        moduleParents.forEach(module => header += `${module.name} > `);
        header += module.name;
        return header;
    }
}