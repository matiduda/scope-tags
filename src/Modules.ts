// If .scope folder is missing - create it

import { ForStatement } from "ts-morph"

// This it a one time operation, it should be as simple as possible

// From the creation of the folder data for the commits will be stored

export type ScopeTag = {
    name: string,
    files: Array<string>,
    directories: Array<string>
}

export class ScopeTagDatabase {


    ScopeTagDatabase(configPath: string) {

    }
}