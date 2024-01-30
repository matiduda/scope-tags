import { JSONFile } from "../FileSystem/JSONFile";
import { IReferenceFinder, ReferencedFileInfo } from "./IReferenceFinder";

type FileImport = { file: string, imports: Array<string> };
type ImportMapFile = Array<FileImport>;

export class ExternalMapReferenceFinder implements IReferenceFinder {

    private _importMap: ImportMapFile;
    private _supportedFileExtensions: Array<string>;

    constructor(importMapFilePath: string, supportedFileExtensions: Array<string>) {
        this._importMap = this._loadImportMap(importMapFilePath);
        this._supportedFileExtensions = supportedFileExtensions;
    }

    private _loadImportMap(path: string): ImportMapFile {
        return JSONFile.loadFrom<ImportMapFile>(path);
    }

    public getSupportedFilesExtension(): string[] {
        return this._supportedFileExtensions;
    }

    public findReferences(fileNameOrPath: string): Array<ReferencedFileInfo> {
        const referenceList: Array<ReferencedFileInfo> = [];

        this._importMap.forEach(importData => {
            if (importData.imports.includes(fileNameOrPath)) {
                referenceList.push({
                    filename: importData.file,
                    unused: false
                });
            }
        })

        return referenceList;
    }
}