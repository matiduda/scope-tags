import { Project } from "ts-morph";
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

        const sourceFile = this._project.getSourceFile(fileNameOrPath);
        if (!sourceFile) {
            throw new Error(`Could not open file ${fileNameOrPath} in project ${this._tsConfigPath}`);
        }

        for (const classDeclaration of sourceFile.getClasses()) {
            const referencedSymbols = classDeclaration.findReferences();

            for (const referencedSymbol of referencedSymbols) {
                for (const reference of referencedSymbol.getReferences()) {
                    const sourceFilePath = path.resolve(sourceFile.getFilePath());
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
}