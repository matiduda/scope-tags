export interface IReferenceFinder {
    findReferences(filePath: string): Array<string>,
    getSupportedFilesExtension(): Array<string>,
}