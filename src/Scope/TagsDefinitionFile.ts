import path from "path";
import { JSONFile } from "../FileSystem/JSONFile";
import { IJSONFileDatabase } from "./IJSONFileDatabase";

export type Tag = {
    name: string,
};

export type Module = {
    name: string;
    description: string,
    exclusive: boolean;
    tags: Array<Tag["name"]>
    parent: Module["name"] | null,
    children: Array<Module["name"]>,
};

type TagsDatabaseType = {
    modules: Array<Module>;
    tags: Array<Tag>;
}

export class TagsDefinitionFile implements IJSONFileDatabase<TagsDefinitionFile> {
    private static PATH = ".scope/tags.json";

    private _root: string;
    private _tagsDatabaseData: TagsDatabaseType;

    _loaded: boolean = false;

    constructor(root: string) {
        this._root = root;
    }

    private _getPath(): string {
        return path.join(this._root, TagsDefinitionFile.PATH);
    }

    public initDefault() {
        const defaultTag: Tag = TagsDefinitionFile.getDefaultTag();
        const defaultModule: Module = TagsDefinitionFile.getDefaultModule();

        defaultModule.tags.push(defaultTag.name);

        const defaultDatabase: TagsDatabaseType = {
            modules: [defaultModule],
            tags: [defaultTag]
        }

        JSONFile.niceWrite<TagsDatabaseType>(this._getPath(), defaultDatabase);
    }

    public load(): TagsDefinitionFile {
        const loadedDatabase = JSONFile.loadFrom<TagsDatabaseType>(this._getPath());
        this._validateDatabase(loadedDatabase);
        this._tagsDatabaseData = loadedDatabase;
        this._loaded = true;
        return this;
    }

    private _validateDatabase(loadedDatabase: TagsDatabaseType) {
        loadedDatabase.modules.forEach(module => {
            // Check if any modules are duplicated
            const moduleWithSameName = loadedDatabase.modules.filter(m => m.name === module.name);
            if (moduleWithSameName.length > 1) {
                throw new Error(`Cannot have more than one module named ${module.name}, every module needs unique name`);
            }

            // Check if all tags are defined in 'tags' array
            module.tags.forEach(tag => {
                if (!loadedDatabase.tags.some(definedTag => definedTag.name === tag)) {
                    throw new Error(`Module ${module.name} has tag ${tag}, which is not defined in 'tags' array`);
                }
            });
        });

        // Check if any tags are duplicated
        loadedDatabase.tags.forEach(tag => {
            const tagsWithSameName = loadedDatabase.tags.filter(m => m.name === tag.name);
            if (tagsWithSameName.length > 1) {
                throw new Error(`Cannot have more than one module named ${tag.name}, every module needs unique name`);
            }
        });
    }

    public save(): string {
        const savedFilePath = this._getPath();
        JSONFile.niceWrite<TagsDatabaseType>(savedFilePath, this._tagsDatabaseData, this._replacer);
        return savedFilePath;
    }

    public addModule(newModule: Module) {
        if (this._tagsDatabaseData.modules.some(module => module.name === newModule.name)) {
            throw new Error("Cannot have 2 modules with the same name.");
        }

        if (newModule.parent) {
            const parentModule = this.getModuleByName(newModule.parent);
            if (!parentModule) {
                throw new Error(`
                    Could not find parent '${newModule.parent}' while adding new module '${newModule.name}'
                `);
            }
            parentModule.children.push(newModule.name);
        }
        this._tagsDatabaseData.modules.push(newModule);
    }

    public deleteModule(moduleToDelete: Module) {
        if (!moduleToDelete) {
            throw new Error("Can't remove undefined module");
        }
        if (moduleToDelete.children.length) {
            const children = moduleToDelete.children.join(", ");
            throw new Error(`
                Can't remove module ${moduleToDelete.name} with child modules: ${children}`
            );
        }
        const moduleToDeleteIndex = this._tagsDatabaseData.modules.indexOf(moduleToDelete);
        if (moduleToDeleteIndex === -1) {
            throw new Error(`Module ${moduleToDelete.name} not found in database`);
        }

        const parentModule = this.getModuleByName(moduleToDelete.parent);
        if (parentModule) {
            parentModule.children.splice(parentModule.children.indexOf(moduleToDelete.name), 1);
        }
        this._tagsDatabaseData.modules.splice(moduleToDeleteIndex, 1);
    }

    public assignTagToModule(tag: Tag, module: Module) {
        if (!module) {
            throw new Error(`[TagManager] Can't add tag to undefined module`);
        }

        if (module.tags.some(moduleTag => moduleTag === tag.name)) {
            throw new Error(`[TagManager] Can't add tag to module ${module.name}, as it already contains tag ${tag.name}`);
        }

        module.tags.push(tag.name);
    }

    public addTag(tag: Tag) {
        if (this._tagsDatabaseData.tags.some(databaseTag => databaseTag.name === tag.name)) {
            throw new Error(`[TagManager] Can't add tag named '${tag.name}', because it already exists!`);
        }

        let matchingTag: Tag | undefined = this._tagsDatabaseData.tags.find(databaseTag => databaseTag.name.toLowerCase() === tag.name.toLowerCase());

        if (matchingTag) {
            throw new Error(`[TagManager] Can't add tag named '${tag.name}', because tag '${matchingTag.name}' already exists, it is better to assign '${matchingTag.name}' directly`);
        }

        this._tagsDatabaseData.tags.push(tag);
    }

    public isTagNameInDatabase(tagName: string) {
        return this._tagsDatabaseData.tags.some(tag => tag.name === tagName);
    }

    public isTagInDatabase(tag: Tag) {
        return this._tagsDatabaseData.tags.includes(tag);
    }


    public removeTagFromModule(tag: Tag, module: Module) {
        const index = module.tags.indexOf(tag.name);
        if (index === -1) {
            throw new Error(`Could not find tag ${tag.name} in module ${module.name}`);
        }
        module.tags.splice(index, 1);
    }

    public removeTag(tag: Tag) {
        const index = this._tagsDatabaseData.tags.findIndex(tagToCheck => tagToCheck.name === tag.name);
        if (index === -1) {
            throw new Error(`Could not find tag ${tag.name} in database`);
        }

        this._tagsDatabaseData.tags.splice(index, 1);

        this._tagsDatabaseData.modules.forEach(module => {
            if (module.tags.includes(tag.name)) {
                this.removeTagFromModule(tag, module);
            }
        });
    }

    public editTag(tag: Tag, newName: string) {
        if (!this.isTagInDatabase(tag)) {
            throw new Error(`[getTagByName] Tag '${tag.name}' does not exist in database`);
        }

        this._tagsDatabaseData.modules.filter(module => module.tags.includes(tag.name)).forEach(module => {
            const index = module.tags.indexOf(tag.name);
            module.tags[index] = newName;
        });

        tag.name = newName;
    }

    public getTags(): Array<Tag> {
        return this._tagsDatabaseData.tags;
    }

    public getTagsByNames(tagNames: string[]): Array<Tag> {
        const foundTags: Array<Tag> = [];

        tagNames.forEach(tagName => {
            const tag = this.getTagByName(tagName);
            if (!tag) {
                throw new Error(`Could not find tag of name '${tagName}'`);
            }
            foundTags.push(tag);
        })
        return foundTags
    }

    public getModules(): Array<Module> {
        return this._tagsDatabaseData.modules;
    }

    public getRootModules() {
        return this._tagsDatabaseData.modules.filter(module => !module.parent);
    }

    public getModuleByName(name: string | null): Module | undefined {
        if (!name) {
            return undefined;
        }
        return this._tagsDatabaseData.modules.find(module => module.name === name);
    }

    public getModulesByNames(children: string[]): Module[] {
        if (!children.length) {
            return [];
        }
        return this._tagsDatabaseData.modules.filter(module => children.includes(module.name));
    }

    public getModuleParentNames(module: Module): Array<string> {
        const parents = [];
        while (module.parent) {
            parents.push(module.parent);
            module = this.getModuleByName(module.parent) || {} as Module;
        }
        return parents;
    }

    public getModuleTagNames(module: Module): Array<Tag["name"]> {
        return module.tags;
    }

    public getModuleTags(module: Module): Array<Tag> {
        return module.tags.map(tag => this.getTagByName(tag));
    }

    public getTagByName(tagName: string): Tag {
        const found = this._tagsDatabaseData.tags.find(tag => tag.name === tagName);
        if (!found) {
            throw new Error(`[getTagByName] Tag '${tagName}' does not exist in database`);
        }
        return found;
    }

    public getTagModules(tag: Tag): Array<Module> {
        return this._tagsDatabaseData.modules.filter(module => module.tags.includes(tag.name));
    }

    public static getDefaultTag(): Tag {
        const defaultTag: Tag = {
            name: "Tag",
        };
        return defaultTag;
    }

    public getPath(): string {
        return TagsDefinitionFile.PATH;
    }

    // This is cancer
    private _replacer(stringifiedOutput: string) {
        return stringifiedOutput
            .replace(/{\n\s+"name": "(.+)"\n\s+}/g, `{ "name": "$1" }`)
            .replace(/\n(\s+)},\n\s+{/g, `\n$1}, {`)
            .replace(/"modules": \[\n\s+{/g, `"modules": [{`);
    }

    static getDefaultModule(): Module {
        const defaultModule: Module = {
            name: "Default module",
            description: "Module added automatically on script initialization",
            exclusive: false,
            tags: [],
            parent: null,
            children: [],
        }
        return defaultModule;
    }
}