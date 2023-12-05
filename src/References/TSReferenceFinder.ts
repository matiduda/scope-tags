import { Project, ReferencedSymbol, SourceFile, SyntaxKind } from "ts-morph";
import path from "path";
import { IReferenceFinder } from "./IReferenceFinder";

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

    public findReferences(fileNameOrPath: string): Array<string> {
        const referenceList: Array<string> = [];
        const languageService = this._project.getLanguageService();

        const sourceFile = this._project.getSourceFile(fileNameOrPath);

        if (!sourceFile) {
            throw new Error(`Could not open file ${fileNameOrPath} in project ${this._tsConfigPath}`);
        }

        const exportedDeclarations = sourceFile.getExportedDeclarations();

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

                    if (!referenceImports.includes(referencedNodeName)) {
                        // Import is unused
                        console.log("UNUSED!");
                        console.log(referencedNodeName);
                        continue;
                    }

                    const referenceFilePath = path.resolve(reference.getSourceFile().getFilePath());

                    if (referenceFilePath !== sourceFilePath
                        && !referenceList.includes(referenceFilePath)) {
                        referenceList.push(referenceFilePath);
                    }
                }
            }
        }

        return referenceList.map(reference => {
            const relativePath = path.relative(this._root, reference);
            const definitelyPosix = relativePath.split(path.sep).join(path.posix.sep);
            return definitelyPosix;
        });
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

    private _arrayDiff<T>(a: Array<T>, b: Array<T>) {
        return a.filter((x: T) => b.includes(x));
    }
}