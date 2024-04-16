import { Commit } from "nodegit";
import { GitRepository } from "../Git/GitRepository";
import { ConfigFile } from "../Scope/ConfigFile";
import { FileTagsDatabase } from "../Scope/FileTagsDatabase";
import { exitIfScopeTagsNotInitialized } from "../Console/ExitIfScopeTagsNotInitialized";
import { RelevancyManager } from "../Relevancy/RelevancyManager";
import { VerificationInfo } from "../Git/Types";

export enum VerificationStatus {
    VERIFIED = 0,
    NOT_VERIFIED = 1,
}

export function runVerifyUnpushedCommitsCommand(args: Array<string>, root: string): void {
    verifyUnpushedCommits(args, root).then((verificationStatus: VerificationStatus) => {
        process.exit(verificationStatus);
    }).catch((reason: any) => {
        console.log("An error occured while verifying unpushed commits, reason: ", reason);
        process.exit(VerificationStatus.NOT_VERIFIED);
    });

}

// Returns:
// 0 - if all commits are verified
// 1 - if not all commits are verified or relevancy is missing
export async function verifyUnpushedCommits(args: Array<string>, root: string): Promise<VerificationStatus> {

    exitIfScopeTagsNotInitialized(root);

    // Checks if all files from unpushed commits are present in database (or excluded)

    const repository = new GitRepository(root);
    const fileTagsDatabase = new FileTagsDatabase(root);
    const config = new ConfigFile(root);
    const relevancyManager = new RelevancyManager();

    const commitsVerificationInfo = new Map<string, VerificationInfo>();

    const unpushedCommits: Commit[] = await repository.getUnpushedCommits();

    if (!unpushedCommits.length) {
        console.log("No commits found that can be verified");
        return VerificationStatus.VERIFIED;
    }

    for (const commit of unpushedCommits) {
        console.log(`[Scope tags] Checking: '${commit.message().trim()}'`);
        const verificationInfo = await repository.verifyCommit(commit, config, fileTagsDatabase, relevancyManager);

        if (verificationInfo.isSkipped) {
            console.log(`[Scope Tags] Skipped check for '${commit.summary()}'`);
        }

        if (verificationInfo.isMergeCommit) {
            console.log(`[Scope Tags] Skipped check for '${commit.summary()}' because it's a merge commit`);
        }

        if (!verificationInfo.isVerified && !verificationInfo.isSkipped && !verificationInfo.isMergeCommit && !verificationInfo.includesOnlyIgnoredFiles) {
            console.log(`Commit '${commit.summary()}' not verified, no tags found for required files:\n`);
            verificationInfo.filesToTag.forEach(file => console.log(`- ${file.newPath}`));
            console.log("To tag files run\n\n\tnpx scope --add\n\n");
            return VerificationStatus.NOT_VERIFIED;
        }

        commitsVerificationInfo.set(commit.sha(), verificationInfo);
    }

    // All commits are skipped => return
    if ([...commitsVerificationInfo.values()].every(info => info.isSkipped || info.isMergeCommit)) {
        console.log("[Scope Tags] All commits are skipped");
        return VerificationStatus.VERIFIED;
    }

    if ([...commitsVerificationInfo.values()].some(info => !info.isSkipped && !info.isMergeCommit && !info.includesOnlyIgnoredFiles && !info.hasRelevancy)) {
        console.log("[Scope tags] All commits are verified, but found no relevancy data. To add relevancy use:\n");
        console.log("\nTo add relevancy use\n\n\tnpx scope --add\n\n");
        return VerificationStatus.NOT_VERIFIED;
    }

    return VerificationStatus.VERIFIED;
}