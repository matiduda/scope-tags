const { Select, Form, AutoComplete, Input, Confirm } = require('enquirer')
import { FileTagsDatabase, TagIdentifier } from "../Scope/FileTagsDatabase";
import { Module, Tag, TagsDefinitionFile } from "../Scope/TagsDefinitionFile";
import { Menu } from "./Menu";

type TagAsOption = { name: string, value: Tag };
type TagIdentifierAsOption = { name: string, value: TagIdentifier, disabled: boolean };

export class TagManager {

    private static MAX_VISIBLE_TAGS = 7;

    private _tags: TagsDefinitionFile;
    private _database: FileTagsDatabase;

    private _menu: Menu | undefined;

    private _tagsWereModified = false;

    constructor(tags: TagsDefinitionFile, database: FileTagsDatabase, menu?: Menu) {
        this._tags = tags;
        this._database = database;
        this._menu = menu;
    }

    public async start() {
        try {
            const answer = await this._selectSingleTag(undefined, true);
            await this._selectTag.call(this, answer);
            await this.start.call(this);
        } catch (e) {
            await this._goBack();
        }
    }

    public async selectMultipleTagIdentifiers(disabledTagIdentifieres: TagIdentifier[]): Promise<TagIdentifier[]> {
        const allModules = this._tags.getModules();
        const tagsMappedToOptions = this._mapTagsToIdentifiers(allModules, disabledTagIdentifieres);

        const prompt = new AutoComplete({
            name: "Tag selector",
            message: `Select tags for files (or none to ignore)`,
            footer: "(CTRL + C to go back)",
            limit: TagManager.MAX_VISIBLE_TAGS,
            multiple: true,
            choices: [
                ...tagsMappedToOptions,
            ],
            result(value: any) {
                return this.map(value);
            },
        });

        let selected: any;
        try {
            selected = await prompt.run();
            return Object.values(selected);
        } catch (e) {
            throw e;
        }
    }

    private _mapTagsToOptions(tags: Array<Tag>): Array<TagAsOption> {
        return tags.map(tag => ({ name: tag.name, value: tag }));
    }

    private _mapTagsToIdentifiers(allModules: Array<Module>, disabledTagIdentifieres: TagIdentifier[]): Array<TagIdentifierAsOption> {
        const allTagsAsIdentifiers: Array<TagIdentifierAsOption> = [];

        allModules.forEach(module => {
            module.tags.forEach(tagName => {
                const option: TagIdentifierAsOption = {
                    name: this._getTagAbsolutePath(tagName, module),
                    value: {
                        tag: tagName,
                        module: module.name
                    },
                    disabled: disabledTagIdentifieres.some(id => id.module === module.name && id.tag === tagName),
                };
                allTagsAsIdentifiers.push(option);
            });
        });

        return allTagsAsIdentifiers;
    }

    private _getTagAbsolutePath(tagName: string, module: Module): any {
        let path = "";

        const parentList = this._tags.getModuleParentNames(module);

        parentList.push(module.name);
        parentList.forEach(parent => path += `${parent} > `);

        return path + `${tagName}`;
    }

    private async _selectTag(tag: Tag, module?: Module) {
        const tagModulesNames = this._tags.getTagModules(tag).map(m => m.name).join(', ');
        const filesWithTagCount = this._database.countFilesWithTag(tag, module);

        const prompt = new Select({
            name: 'Tag info',
            message: `Tag info: `,
            choices: [
                { message: `Name:\t\t${module ? "\t" : ""}${tag.name}`, role: "separator" },
                { message: `Modules:\t${module ? "\t" : ""}${tagModulesNames.length ? tagModulesNames : "-"}`, role: "separator" },
                { message: `Files ${module ? `(${module.name})` : ""}:\t${filesWithTagCount}`, role: "separator" },
                { role: "separator" },
                { name: 'Edit', value: module ? this._editTagFromModule : this._editTag },
                { name: module ? 'Unassign from module' : 'Delete tag', value: module ? this._deleteTagFromModule : this._deleteTag },
                ...(filesWithTagCount ? [
                    { name: 'List files', value: this._listFilesForTag },
                ] : []),
                { name: this._tagsWereModified ? 'Save' : 'Go back', value: () => Promise.resolve() },
            ],
            result(value: any) {
                const mapped = this.map(value);
                return mapped[value];
            },
        });

        try {
            const answer = await prompt.run();
            await answer.call(this, tag, module);
        } catch (e) {
            if (e instanceof Error) {
                console.log(e.message);
            }
        }
    }

    private async _editTagFromModule(tag: Tag, module: Module) {
        if (!module) {
            throw new Error("Cannot get back to undefined module");
        }
        if (!tag) {
            throw new Error("Cannot edit tag which is undefined");
        }

        await this._editTag(tag);
        await this.manageTagsFromModule.call(this, module);
    }

    private async _editTag(tag: Tag) {
        const editTagPrompt = new Form({
            name: 'Edit tag',
            message: 'Enter new tag values:',
            choices: [
                { name: 'name', message: 'Name', initial: tag.name },
            ],
            validate: (answer: any) => {
                if (!answer.name.length) {
                    return "Name and description cannot be empty";
                } else {
                    return true;
                }
            },
        });

        const answer = await editTagPrompt.run();

        this._tags.editTag(tag, answer.name);

        this._tagsWereModified = true;
    }

    private async _deleteTagFromModule(tag: Tag, module: Module) {
        if (!module) {
            throw new Error("Cannot delete tag of undefined module");
        }
        if (!tag) {
            throw new Error("Cannot delete tag which is undefined");
        }

        const prompt = new Confirm({
            message: `Are you sure you want to unassign tag '${tag.name}' from module ${module.name}?`,
        });


        const answer = await prompt.run();
        if (answer) {
            this._tags.removeTagFromModule(tag, module);
            console.log("Tag unassigned.");
        }
    }

    private async _listFilesForTag(tag: Tag, module: Module) {
        const matchingFiles = this._database.getFilesWithTag(tag, module);
        matchingFiles.forEach(entry => {
            console.log(`${entry[0]} -> ${entry[1].map(id => `${id.module}/${id.tag}`).join(', ')}`);
        })
        await this._selectTag.call(this, tag, module);
    }

    private async _deleteTag(tag: Tag) {
        if (!tag) {
            throw new Error("Cannot delete tag which is undefined");
        }
        const modulesWithTag = this._tags.getTagModules(tag);
        if (modulesWithTag.length) {
            throw new Error(`Cannot delete tag which is used by modules ${modulesWithTag.map(m => m.name).join(", ")}`);
        }
        const prompt = new Input({
            message: `Please enter '${tag.name}' to delete the tag (CTRL+C to abort)`,
            initial: '',
            validate: (answer: any) => {
                console.log(answer);
                if (answer !== tag.name) {
                    return `Value '${answer}' does not match '${tag.name}'`;
                } else {
                    return true;
                }
            },
        });

        try {
            await prompt.run();
            console.log(`Deleted tag '${tag.name}'`);
            this._tags.removeTag(tag);
        } catch (e) {
            console.log("Aborted.")
        }
    }

    public async manageTagsFromModule(module: Module) {
        const tagsToDisplay = this._tags.getModuleTags(module);
        const tagsMappedToOptions = this._mapTagsToOptions(tagsToDisplay);

        const prompt = new Select({
            name: 'Tag manager started from module',
            message: `Manage tags of ${module.name}`,
            initial: 0,
            choices: [
                ...tagsMappedToOptions,
                { role: "separator" },
                { name: 'Add tag', value: this._addTagToModule },
                {
                    name: this._tagsWereModified ? 'Save and return to module' : `Return to module`, value: () => {
                        this._saveChanges();
                        Promise.resolve()
                    }
                },
            ],
            result(value: any) {
                const mapped = this.map(value);
                return mapped[value];
            },
        })

        const answer = await prompt.run();

        if (tagsToDisplay.includes(answer)) { // typeof answer === Tag
            await this._selectTag(answer, module);
            await this.manageTagsFromModule.call(this, module);
        } else {
            await answer.call(this, module);
        }
    }

    private async _addTagToModule(module: Module) {
        if (!module) {
            throw new Error("Cannot add tag to undefined module");
        }

        const prompt = new Select({
            name: 'Select tag adding method',
            message: "Select tag adding method: ",
            choices: [
                { name: 'Add new', value: this._createNewTag },
                { name: 'Search from available tags', value: this._selectSingleTag },
            ],
            result(value: any) {
                const mapped = this.map(value);
                return mapped[value];
            },
        });

        const answer = await prompt.run();

        try {
            const tagToAdd = await answer.call(this, module);
            if (answer.value === this._selectSingleTag) {
                this._tags.addTag(tagToAdd);
            }
            this._tags.assignTagToModule(tagToAdd, module);
        } catch (e) { }

        this._tagsWereModified = true;

        await this.manageTagsFromModule.call(this, module);
    }

    private async _selectSingleTag(module?: Module, displayFooter: boolean = false): Promise<Tag> {
        const tagsToDisplay = this._tags.getTags();
        const tagsMappedToOptions = this._mapTagsToOptions(tagsToDisplay)

        const prompt = new AutoComplete({
            name: 'Tag manager',
            message: "Select tag (CTRL+C to cancel)",
            limit: TagManager.MAX_VISIBLE_TAGS,
            initial: 0,
            footer: displayFooter ? `(CTRL+C to ${this._tagsWereModified ? "save" : "exit"})` : undefined,
            choices: [
                ...tagsMappedToOptions,
            ],
            result(value: any) {
                const mapped = this.map(value);
                return mapped[value];
            },
            validate: (answer: any) => {
                if (module && module.tags.some(tag => tag === answer.name)) {
                    return `Module ${module.name} already contains tag ${answer.name}`;
                } else {
                    return true;
                }
            },
        })

        return prompt.run();
    }

    private async _createNewTag(module: Module): Promise<Tag> {
        const defaultTagName = "Tag";

        const addTagPrompt = new Form({
            name: 'user',
            message: 'Fill in details about the new module (CTRL+C to exit)',
            choices: [
                { name: 'name', message: 'Name', initial: defaultTagName },
            ],
            validate: (answer: any) => {
                if (!answer.name.length
                ) {
                    return "Tag name is required";
                } else {
                    return true;
                }
            },
        });

        let tagInfoAnswer;

        try {
            tagInfoAnswer = await addTagPrompt.run();
        } catch (e) {
            if (e) {
                console.log("Cannot add tag, reason: " + e);
            }
        }

        const newTag: Tag = {
            name: tagInfoAnswer.name,
        };

        console.log("Successfuly added tag: " + newTag.name);

        this._tags.addTag(newTag);

        return newTag;
    }

    private _saveChanges() {
        if (this._tagsWereModified) {
            this._tags.save();
            console.log("Tags saved ✅");
        }
    }

    private async _goBack() {
        this._saveChanges();

        if (this._menu) {
            return this._menu.start();
        } else {
            Promise.resolve();
        }
    }
}
