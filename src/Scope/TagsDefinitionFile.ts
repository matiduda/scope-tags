import path from "path";
import { JSONFile } from "../FileSystem/JSONFile";
import { IJSONFileDatabase } from "./IJSONFileDatabase";

export type Tag = {
    name: string,
    description: string,
    module: Module["name"]
};

export type Module = {
    name: string;
    description: string,
    exclusive: boolean;
    tags: Array<Tag>
    parent: Module["name"] | null,
    children: Array<Module["name"]>,
};

type TagsDatabaseType = {
    modules: Array<Module>;
}

export class TagsDefinitionFile implements IJSONFileDatabase<TagsDefinitionFile> {

    private static PATH = ".scope/tags.json";

    private _root: string;
    private _tagsDatabaseData: TagsDatabaseType;

    private _allTags = new Set<Tag>();

    constructor(root: string) {
        this._root = root;
    }

    private _getPath(): string {
        return path.join(this._root, TagsDefinitionFile.PATH);
    }

    public initDefault() {
        const defaultTag: Tag = TagsDefinitionFile.getDefaultTag();
        const defaultModule: Module = TagsDefinitionFile.getDefaultModule();

        defaultModule.tags.push(defaultTag);

        const defaultDatabase: TagsDatabaseType = {
            modules: [defaultModule]
        }

        JSONFile.niceWrite<TagsDatabaseType>(this._getPath(), defaultDatabase);
    }

    public load(): TagsDefinitionFile {
        this._tagsDatabaseData = JSONFile.loadFrom<TagsDatabaseType>(this._getPath());
        // this._addTagsFromModules(this._tagsDatabaseData.modules);
        return this;
    }

    public save(): string {
        const savedFilePath = this._getPath();
        JSONFile.niceWrite<TagsDatabaseType>(savedFilePath, this._tagsDatabaseData);
        return savedFilePath;
    }

    private _addTagsFromModules(modules: Array<Module>) {
        modules.forEach(module => module.tags.forEach(tag => this._allTags.add(tag)));
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


    public getTags(): Set<Tag> {
        return this._allTags;
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

    public getModuleParents(module: Module) {
        const parents = [];
        while (!module.parent) {
            parents.push(module);
            module = this.getModuleByName(module.parent) || {} as Module;
        }
        return parents;
    }


    public static getDefaultTag(): Tag {
        const defaultTag: Tag = {
            name: "Tag",
            description: "Default tag added on initialization",
            module: TagsDefinitionFile.getDefaultModule().name,
        };

        return defaultTag;
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