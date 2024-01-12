import { Commit } from "nodegit";
import { GitRepository } from "../Git/GitRepository";
import { ConfigFile } from "../Scope/ConfigFile";
import { FileTagsDatabase } from "../Scope/FileTagsDatabase";
import { exitIfScopeTagsNotInitialized } from "../Console/ExitIfScopeTagsNotInitialized";

export function runVerifyUnpushedCommitsCommand(args: Array<string>, root: string) {

    exitIfScopeTagsNotInitialized(root);

    // Checks if all files from unpushed commits are present in database (or excluded)

    const repository = new GitRepository(root);
    const fileTagsDatabase = new FileTagsDatabase(root).load();
    const config = new ConfigFile(root).load();

    repository.getUnpushedCommits().then(async (commits: Commit[]) => {
        if (!commits.length) {
            console.log("No commits found that can be verified");
            process.exit(0);
        }

        for (const commit of commits) {
            console.log(`[Scope tags] Checking: '${commit.message().trim()}'`)
            await repository.verifyCommit(commit, config, fileTagsDatabase);
        }
    });
}