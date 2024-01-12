import { fileExists } from "../FileSystem/fileSystemUtils";
import path from "path";

export function exitIfScopeTagsNotInitialized(root: string) {

    const scopeFolderPath = path.join(root, ".scope");

    if (fileExists(scopeFolderPath)) {
        return;
    }
    console.log(`Scope tags have not been initialized for this reporitory (.scope folder not found at '${root}')
    
    -> run 'npx scope' to initialize default configuration
`);
    process.exit(0);
}