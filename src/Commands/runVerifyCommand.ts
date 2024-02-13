import { Commit } from "nodegit";
import { GitRepository } from "../Git/GitRepository";
import { ConfigFile } from "../Scope/ConfigFile";
import { FileTagsDatabase } from "../Scope/FileTagsDatabase";
import { RelevancyManager } from "../Relevancy/RelevancyManager";

export function runVerifyCommand(args: Array<string>, root: string) {
    // Checks if all files from the commit are present in database (or excluded)
    const commitHash = args[1];
    if (!commitHash) {
        console.log("--verify requires commit hash, use: scope --verify <hash>");
        process.exit(1);
    }

    const repository = new GitRepository(root);
    const fileTagsDatabase = new FileTagsDatabase(root).load();
    const config = new ConfigFile(root).load();
    const relevancyManager = new RelevancyManager();

    repository.getCommitByHash(commitHash).then(async (commit: Commit) => {
        console.log(`Checking commit '${commit.summary()}'`);

        const commitInfo = await repository.verifyCommit(commit, config, fileTagsDatabase, relevancyManager);

        console.log(commitInfo);
    });
    console.log("Scope tags: All commits verified");
}
