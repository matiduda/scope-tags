import { Relevancy } from "../Relevancy/Relevancy"

export type ReferencedFileInfo = {
    filename: string,
    relevancy: Relevancy,
    unused: boolean
}

export interface IReferenceFinder {
    findReferences(filePath: string, relevancy: Relevancy | null): Array<ReferencedFileInfo>,
    getSupportedFilesExtension(): Array<string>,
}
