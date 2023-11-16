const { Select, Form, AutoComplete } = require('enquirer')
import { Module, Tag, TagsDefinitionFile } from "../Scope/TagsDefinitionFile";
import { Menu } from "./Menu";

type TagAsOption = { name: Tag["name"], value: Tag["name"] };
type RawTagAsOption = { name: Tag["name"], value: Tag };

export class TagManager {

    private static MAX_VISIBLE_TAGS = 7;

    private _tags: TagsDefinitionFile;
    private _menu: Menu | undefined;

    private _tagsWereModified = false;

    constructor(tags: TagsDefinitionFile, menu?: Menu) {
        this._tags = tags;
        this._menu = menu;
    }

    public async start() {
        const tagsToDisplay = this._tags.getTags();
        const tagsMappedToOptions = this._mapTagsToOptions(tagsToDisplay)

        const prompt = new AutoComplete({
            name: 'Tag manager',
            message: "Select tag",
            footer: "(CTRL + C to cancel)",
            limit: TagManager.MAX_VISIBLE_TAGS,
            initial: 0,
            choices: [
                ...tagsMappedToOptions,
            ],
            result(value: any) {
                const mapped = this.map(value);
                return mapped[value];
            },
        })

        try {
            const answer = await prompt.run();
            const selectedTag = this._tags.getTagByName(answer);
            if (!selectedTag) {
                throw new Error(`Could not find tag: ${answer} in database`);
            }
            await this._selectTag.call(this, selectedTag);
            await this.start.call(this);
        } catch (e) {
            await this._goBack();
        }
    }

    public async selectMultipleTags(): Promise<Tag[]> {
        const tagsToDisplay = this._tags.getTags();
        const tagsMappedToOptions = this._mapRawTagsToOptions(tagsToDisplay)

        const prompt = new AutoComplete({
            name: "Tag selector",
            message: "Select appropriate tags",
            footer: "(CTRL + C to ignore)",
            limit: TagManager.MAX_VISIBLE_TAGS,
            multiple: true,
            choices: [
                ...tagsMappedToOptions,
            ],
            validate: (result: any) => {
                if (!result.length) {
                    return "You have to select at least one tag";
                }
                return true;
            },
            result(value: any) {
                return this.map(value);
            },
        });

        let selected: any;
        try {
            selected = await prompt.run();
        } catch (e) {
            return [];
        }
        return Object.values(selected);
    }

    private _mapTagsToOptions(tags: Array<Tag>): Array<TagAsOption> {
        return tags.map(tag => ({ name: tag.name, value: tag.name }));
    }

    private _mapRawTagsToOptions(tags: Array<Tag>): Array<RawTagAsOption> {
        return tags.map(tag => ({ name: tag.name, value: tag }));
    }

    private async _selectTag(tag: Tag, module?: Module) {
        const prompt = new Select({
            name: 'Tag info',
            message: "Tag info: ",
            choices: [
                { message: `Name:\t\t${tag.name}`, role: "separator" },
                { message: `Description:\t${tag.description}`, role: "separator" },
                { message: `Module:\t${tag.module}`, role: "separator" },
                { role: "separator" },
                { name: 'Edit', value: module ? this._editTagFromModule : this._editTag },
                { name: this._tagsWereModified ? 'Save' : 'Go back', value: () => Promise.resolve() },
            ],
            result(value: any) {
                const mapped = this.map(value);
                return mapped[value];
            },
        });

        const answer = await prompt.run();
        await answer.call(this, tag, module);
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
                { name: 'description', message: 'Description', initial: tag.description },
            ],
            validate: (answer: any) => {
                if (!answer.name.length
                    || !answer.description.length
                ) {
                    return "Name and description cannot be empty";
                } else {
                    return true;
                }
            },
        });

        const tagInfoAnswer = await editTagPrompt.run();

        tag.name = tagInfoAnswer.name;
        tag.description = tagInfoAnswer.description;

        this._tagsWereModified = true;
    }

    public async manageTagsFromModule(module: Module) {
        const tagsToDisplay = module.tags;
        const tagsMappedToOptions = this._mapTagsToOptions(tagsToDisplay)

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

        if (tagsToDisplay.some(tag => tag.name === answer)) { // typeof answer === Tag
            const selectedTag = this._tags.getTagByName(answer);
            if (!selectedTag) {
                throw new Error(`Could not find tag: ${answer} in database`);
            }
            await this._selectTag(selectedTag);
            await this.manageTagsFromModule.call(this, module);
        } else {
            await answer.call(this, module);
        }
    }

    private async _addTagToModule(module: Module) {
        if (!module) {
            throw new Error("Cannot add tag to undefined module");
        }

        const defaultTagName = "Tag";
        const defaultTagDescription = "A tag describing a single functionality";

        const addTagPrompt = new Form({
            name: 'user',
            message: 'Fill in details about the new module:',
            choices: [
                { name: 'name', message: 'Name', initial: defaultTagName },
                { name: 'description', message: 'Description', initial: defaultTagDescription },
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

        try {
            const moduleInfoAnswer = await addTagPrompt.run();

            const newTag: Tag = {
                name: moduleInfoAnswer.name,
                description: moduleInfoAnswer.description,
                module: module.name
            };

            this._tags.addTag(newTag);

            console.log("Successfuly added tag: " + newTag.name);
        } catch (e) {
            console.log("Cannot add tag, reason: " + e);
        }

        this._tagsWereModified = true;
        await this.manageTagsFromModule.call(this, module);
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
