const execSync = require('child_process').execSync;
import fs from "fs";

export function getGitProjectRoot() {
    const repoPath = execSync("git rev-parse --show-toplevel").toString().trim();

    if (!fs.existsSync(repoPath)) {
        throw new Error("Could not find a Git repository.");
    }
    return repoPath;
};