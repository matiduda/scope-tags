import { Project, ReferencedSymbol, SourceFile, SyntaxKind } from "ts-morph";
import path from "path";
import { IReferenceFinder, ReferencedFileInfo } from "./IReferenceFinder";

export class TSReferenceFinder implements IReferenceFinder {

    private _root: string;
    private _tsConfigPath: string;

    private _project: Project
    private _supportedFileExtensions: Array<string>

    constructor(root: string, tsConfigPath: string) {
        this._root = root;
        this._tsConfigPath = tsConfigPath;

        this._project = new Project({
            tsConfigFilePath: path.join(root, this._tsConfigPath),
        });

        this._supportedFileExtensions = [".ts", ".tsx"];
    }

    public getSupportedFilesExtension(): Array<string> {
        return this._supportedFileExtensions;
    }

    public findReferences(fileNameOrPath: string): Array<ReferencedFileInfo> {
        const referenceList: Array<ReferencedFileInfo> = [];
        const languageService = this._project.getLanguageService();

        const sourceFile = this._project.getSourceFile(fileNameOrPath);

        if (!sourceFile) {
            throw new Error(`Could not open file ${fileNameOrPath} in project ${this._tsConfigPath}`);
        }

        const exportedDeclarations = sourceFile.getExportedDeclarations();

        console.log(exportedDeclarations);

        for (const declaration of exportedDeclarations.values()) {
            let referencedSymbols: Array<ReferencedSymbol> = [];

            declaration.forEach(node => {
                const references = languageService.findReferences(node);
                referencedSymbols = referencedSymbols.concat(references);
            });

            for (const referencedSymbol of referencedSymbols) {
                for (const reference of referencedSymbol.getReferences()) {
                    const sourceFilePath = path.resolve(sourceFile.getFilePath());

                    const referenceSourceFile = reference.getSourceFile();

                    const referenceImports = this._getUsedImports(referenceSourceFile);

                    const referencedNodeName = referencedSymbol.getDefinition().getNode().getText();

                    const referencedNodeFilePath = referencedSymbol.getDefinition().getSourceFile().getFilePath();

                    let isUnused = false;

                    const isSourceFile = sourceFile.getFilePath() === referencedNodeFilePath;

                    if (!referenceImports.includes(referencedNodeName) && !isSourceFile) {
                        // Import is unused - we can still include it in report with this info
                        const nicePath = path.relative(this._root, referenceSourceFile.getFilePath());
                        console.log(`Found unused reference to ${referencedNodeName} in file ${nicePath}`);
                        isUnused = true;
                    }

                    const referenceFilePath = path.resolve(reference.getSourceFile().getFilePath());

                    console.log(referenceFilePath);

                    const referencedFileInfo: ReferencedFileInfo = {
                        filename: referenceFilePath,
                        unused: isUnused
                    }

                    if (referenceFilePath !== sourceFilePath
                        && !referenceList.some(fileInfo => fileInfo.filename === referencedFileInfo.filename)
                    ) {
                        referenceList.push(referencedFileInfo);
                    }
                }
            }
        }

        // Convert all filepaths to POSIX
        referenceList.forEach(reference => {
            const relativePath = path.relative(this._root, reference.filename);
            const definitelyPosix = relativePath.split(path.sep).join(path.posix.sep);
            reference.filename = definitelyPosix;
        });

        return referenceList;
    }

    /**
     * Checks if an import is used
     * @see https://github.com/dsherret/ts-morph/issues/1206
     * @param importDeclaration
     */
    private _getUsedImports(sourceFile: SourceFile): string[] {
        const importDeclarationtEnd = sourceFile
            .getLastChildByKind(SyntaxKind.ImportDeclaration)?.getEnd() ?? 0; // get the end position of the last import

        const idsInFile = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier);

        /**
        * Filtering based on valueDeclarations and endPosition after the 
        *  end of imports.
        * Import identifiers have valueDeclarations of 'undefined'
        */
        return (idsInFile ?? [])
            .map((id) => ({
                text: id.getText(),
                valueDeclaration: id.getSymbol()?.getValueDeclaration(),
                posEnd: id.getEnd(),
            }))
            .filter((v) => v.posEnd > importDeclarationtEnd && typeof v.valueDeclaration === 'undefined')
            .map((v) => v.text); // and after the end of imports
    }
}