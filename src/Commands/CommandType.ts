export type CommandType = {
    name: string,
    runOption: string,
    description: string,
    execute: () => void,
};