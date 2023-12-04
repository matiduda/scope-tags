const { Select, Form, Confirm } = require('enquirer')
import { FileTagsDatabase } from "../Scope/FileTagsDatabase";
import { Module, TagsDefinitionFile } from "../Scope/TagsDefinitionFile";
import { Menu } from "./Menu";

type ModuleAsOption = { name: Module["name"], value: Module };

export class ModuleManager {

    private _tags: TagsDefinitionFile;
    private _database: FileTagsDatabase;
    private _menu: Menu;

    private _modulesWereModified: boolean;

    constructor(tags: TagsDefinitionFile, database: FileTagsDatabase, menu: Menu) {
        this._tags = tags;
        this._database = database;
        this._menu = menu;
    }

    public async start(fromModule?: Module) {
        const modulesToDisplay = fromModule
            ? this._tags.getModulesByNames(fromModule.children) : this._tags.getRootModules();

        const modulesMappedToOptions = this._mapModulesToOptions(modulesToDisplay);
        const filesWithModuleCount = fromModule ? this._database.countFilesWithModule(fromModule) : 0;
        const tagNames = fromModule ? this._tags.getModuleTagNames(fromModule) : [];

        const prompt = new Select({
            name: 'Module manager',
            message: this._getModulePathAsHeader(fromModule),
            choices: [
                ...(fromModule ? [
                    { message: `Name:\t\t${fromModule.name}`, role: "separator" },
                    { message: `Description:\t${fromModule.description}`, role: "separator" },
                    { message: `Files:\t${filesWithModuleCount}`, role: "separator" },
                    { message: `Max 1 tag:\t${fromModule.exclusive}`, role: "separator" },
                    { message: `Tags:\t\t${tagNames.length ? tagNames.join(", ") : "-"}`, role: "separator" },
                    ...(modulesMappedToOptions.length ?
                        [{ message: `─────`, role: "separator" },
                        ...modulesMappedToOptions,
                        ] : []),
                    { role: "separator" },
                    { name: 'Add new module here', value: this._addModule },
                    { name: 'Manage tags of: ' + fromModule.name, value: this._manageTagsFromModule },
                    ...(filesWithModuleCount ? [
                        { name: 'List files', value: this._listFilesForModule },
                    ] : []),
                    { name: 'Delete this module', value: this._deleteModule },
                    { name: "Back to: " + (fromModule.parent || "root"), value: this._goBack },
                ] : [
                    ...modulesMappedToOptions,
                    { role: 'separator' },
                    { name: 'Add new module here', value: this._addModule },
                    { name: this._modulesWereModified ? "Save and return to menu" : "Return to menu", value: this._exit },
                ]),
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
        const defaultModuleDescription = "A module containing multiple functionalities";

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
                ) {
                    return "Both name and description are required";
                } else {
                    return true;
                }
            },
        });

        const isExclusivePrompt = new Confirm({
            name: "exclusive",
            message: 'Should the module be exclusive?\n(Meaning: only one tag per file can be added from this module)',
            question: '2 Should the module be exclusive?\n(Meaning: only one tag per file can be added from this module)',
        });


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

    private async _deleteModule(fromModule: Module) {
        let returnModule: string = fromModule.name;

        try {
            this._tags.deleteModule(fromModule);
            this._modulesWereModified = true;
            returnModule = fromModule.parent || "";
            console.log(`Deleted module ${fromModule.name}`);
        } catch (e) {
            console.log((e as Error).message);
        }
        await this.start(this._tags.getModuleByName(returnModule));
    }

    private async _manageTagsFromModule(module?: Module) {
        if (!module) {
            console.log("Cannot manage tags of undefined module");
            return;
        }

        await this._menu.manageTagsFromModule(module);
        await this.start(module);
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

    private async _listFilesForModule(module: Module) {
        const matchingFiles = this._database.getFilesWithModule(module);
        matchingFiles.forEach(entry => {
            console.log(`${entry[0]} -> ${entry[1].tags.map(id => `${id.module}/${id.tag}`).join(', ')}`);
        })
        await this.start.call(this, module);
    }

    private _mapModulesToOptions(modules: Array<Module>): Array<ModuleAsOption> {
        return modules.map(module => ({ name: `→ ${module.name}`, value: module }));
    }

    private _getModulePathAsHeader(module?: Module): string {
        let header = "Root >";

        if (!module) {
            return header;
        }

        const parentList = this._tags.getModuleParentNames(module);

        parentList.push(module.name);
        parentList.forEach(parent => header += ` ${parent} >`);

        return header;
    }
}