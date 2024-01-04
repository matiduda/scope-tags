import { TSReferenceFinder } from "../References/TSReferenceFinder";

export function runFindReferencesCommand(args: Array<string>, root: string) {
    const filePath = args[1];
    if (!filePath) {
        console.log("--report-for-commit-list requires a path to build metadata, use: --report-for-commit-list <file>");
        process.exit(1);
    }

    const tsReferenceFinder = new TSReferenceFinder(root, "tsconfig.json");
    tsReferenceFinder.findReferences(filePath);
}