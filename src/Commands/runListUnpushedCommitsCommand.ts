import { Commit } from "nodegit";
import { GitRepository } from "../Git/GitRepository";
import { exitIfScopeTagsNotInitialized } from "../Console/ExitIfScopeTagsNotInitialized";

export function runListUnpushedCommitsCommand(args: Array<string>, root: string) {

    exitIfScopeTagsNotInitialized(root);

    // Lists the details about commits which will be automatically verified

    const repository = new GitRepository(root);

    repository.getUnpushedCommits().then(async (commits: Commit[]) => {
        if (!commits.length) {
            console.log("No commits found that can be verified");
            process.exit(0);
        }

        for (const commit of commits) {
            if (repository.isMergeCommit(commit)) {
                console.log(`[Scope tags] Files from commit: '${commit.message().trim()}' will be skipped, because it is a merge commit`);
                continue;
            }

            console.log(`[Scope tags] Files from commit: '${commit.message().trim()}':`);

            const fileDataArray = await repository.getFileDataForCommit(commit);
            for (const fileData of fileDataArray) {
                console.log(`- ${fileData.newPath}`);
            }

        }
    });
}