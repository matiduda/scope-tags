import { Commit } from "nodegit";
import { GitRepository } from "../Git/GitRepository";
import { ConfigFile } from "../Scope/ConfigFile";
import { FileTagsDatabase } from "../Scope/FileTagsDatabase";
import { exitIfScopeTagsNotInitialized } from "../Console/ExitIfScopeTagsNotInitialized";
import { RelevancyManager } from "../Relevancy/RelevancyManager";
import { VerificationInfo } from "../Git/Types";

export function runVerifyUnpushedCommitsCommand(args: Array<string>, root: string) {

    exitIfScopeTagsNotInitialized(root);

    // Checks if all files from unpushed commits are present in database (or excluded)

    const repository = new GitRepository(root);
    const fileTagsDatabase = new FileTagsDatabase(root).load();
    const config = new ConfigFile(root).load();
    const relevancyManager = new RelevancyManager();

    const commitsVerificationInfo = new Map<string, VerificationInfo>();

    repository.getUnpushedCommits().then(async (commits: Commit[]) => {
        if (!commits.length) {
            console.log("No commits found that can be verified");
            process.exit(0);
        }

        for (const commit of commits) {
            console.log(`[Scope tags] Checking: '${commit.message().trim()}'`)
            const verificationInfo = await repository.verifyCommit(commit, config, fileTagsDatabase, relevancyManager);

            if (verificationInfo.isSkipped) {
                console.log(`[Scope Tags] Skipped check for '${commit.summary()}'`);
            }

            if (!verificationInfo.isVerified && !verificationInfo.isSkipped) {
                console.log(`Commit '${commit.summary()}' not verified, no tags found for required files:\n`);
                verificationInfo.filesToTag.forEach(file => console.log(`- ${file.newPath}`));
                console.log("To tag files run\n\n\tnpx scope --add\n\n");
                process.exit(1);
            }

            commitsVerificationInfo.set(commit.sha(), verificationInfo);
        }

        // All commits are skipped => return
        if ([...commitsVerificationInfo.values()].every(info => info.isSkipped)) {
            console.log("[Scope Tags] All commits are skipped");
            return;
        }

        if (![...commitsVerificationInfo.values()].some(info => info.hasRelevancy)) {
            console.log(`[Scope tags] All commits are verified, but found no relevancy data. To add relevancy use:\n`);
            console.log("\nTo add relevancy use\n\n\tnpx scope --add\n\n");
            process.exit(1);
        }
    });
}