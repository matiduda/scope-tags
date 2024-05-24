import { TSReferenceFinder } from "../References/TSReferenceFinder";
import { Relevancy } from "../Relevancy/Relevancy";

export function runFindReferencesCommand(args: Array<string>, root: string) {
    const filePath = args[1];
    if (!filePath) {
        console.log("--find-refs requires a path to a file, use: --find-refs <file path>");
        process.exit(1);
    }

    const tsReferenceFinder = new TSReferenceFinder(root, "tsconfig.json");

    const references = tsReferenceFinder.findReferences(filePath, Relevancy.HIGH);

    if (!references.length) {
        console.log("No references found");
    } else {
        console.log(`Found ${references.length} references`);
    }

    references
        .sort((entryA, entryB) => {
            const pathA = entryA.filename.toUpperCase(); // ignore upper and lowercase
            const pathB = entryB.filename.toUpperCase(); // ignore upper and lowercase
            if (pathA < pathB) {
                return -1;
            }
            if (pathA > pathB) {
                return 1;
            }
            return 0;
        })
        .forEach(reference => {
            let info = `- ${reference.filename}`;

            if (reference.unused) {
                info += " (unused)";
            }
            console.log(info);
        })
}
