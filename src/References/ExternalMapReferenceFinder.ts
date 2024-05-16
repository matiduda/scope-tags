import { JSONFile } from "../FileSystem/JSONFile";
import { fileExists } from "../FileSystem/fileSystemUtils";
import { DEFAULT_RELEVANCY, Relevancy } from "../Relevancy/Relevancy";
import { IReferenceFinder, ReferencedFileInfo } from "./IReferenceFinder";

type FileImport = { file: string, imports: Array<string> };
type ImportMapFile = Array<FileImport>;

export class ExternalMapReferenceFinder implements IReferenceFinder {

    private _importMap: ImportMapFile;
    private _supportedFileExtensions: Array<string>;

    private _chunks: number = 0;

    constructor(importMapFilePath: string, supportedFileExtensions: Array<string>) {
        this._importMap = this._loadImportMap(importMapFilePath);
        this._supportedFileExtensions = supportedFileExtensions;
    }

    private _loadImportMap(path: string): ImportMapFile {
        if (!path.includes("{x}")) {
            return JSONFile.loadFrom<ImportMapFile>(path);
        } else {
            let loadedImportMap: ImportMapFile = [];

            while (true) {
                const currentChunkFilePath = path.replace("{x}", this._chunks.toString());

                if (!fileExists(currentChunkFilePath)) {
                    return loadedImportMap;
                }

                const loadedChunk = JSONFile.loadFrom<ImportMapFile>(path);
                loadedImportMap = loadedImportMap.concat(loadedChunk);

                this._chunks++;
            }
        }
    }

    public getImportMapChunkCount(): number {
        return this._chunks;
    }

    public getSupportedFilesExtension(): string[] {
        return this._supportedFileExtensions;
    }

    public findReferences(fileNameOrPath: string, relevancy: Relevancy | null): Array<ReferencedFileInfo> {
        const referenceList: Array<ReferencedFileInfo> = [];

        this._importMap.forEach(importData => {
            if (importData.imports.includes(fileNameOrPath)) {
                referenceList.push({
                    filename: importData.file,
                    unused: false,
                    relevancy: relevancy || DEFAULT_RELEVANCY
                });
            }
        });

        return referenceList;
    }
}
