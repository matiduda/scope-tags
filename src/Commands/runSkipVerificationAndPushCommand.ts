import { Commit } from "nodegit";
import { GitRepository } from "../Git/GitRepository";
const { exec } = require('child_process');

export function runSkipVerificationForCommits(args: Array<string>, root: string) {

    // Skip commit verification and run 'git push' command

    const repository = new GitRepository(root);

    repository.getUnpushedCommits().then(async (commits: Commit[]) => {
        if (!commits.length) {
            console.log("[Scope tags]: No commits found that can be verified");
            process.exit(0);
        }

        for (const commit of commits) {
            await repository.addSkipVerificationNoteToCommit(commit);
        }

        console.log("[Scope tags]: Pushing to remote...");

        exec('git push', (err: any, stdout: any, stderr: any) => {
            if (err) {
                console.log("[Scope tags]: Could not push to remote, reason:");
                console.error(err)
            } else {
                // the *entire* stdout and stderr (buffered)
                stdout && console.log(`${stdout}`);
                stderr && console.log(`${stderr}`);
            }
        });
    });

}