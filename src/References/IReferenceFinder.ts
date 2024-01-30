
export type ReferencedFileInfo = {
    filename: string,
    unused: boolean
}

export interface IReferenceFinder {
    findReferences(filePath: string): Array<ReferencedFileInfo>,
    getSupportedFilesExtension(): Array<string>,
}