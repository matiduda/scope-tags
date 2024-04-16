import { Commit } from "nodegit";
import { GitRepository } from "../Git/GitRepository";
import { exitIfScopeTagsNotInitialized } from "../Console/ExitIfScopeTagsNotInitialized";
import { FileStatusInDatabase, FileTagsDatabase } from "../Scope/FileTagsDatabase";
import { Utils } from "../Scope/Utils";
import { ConfigFile } from "../Scope/ConfigFile";

export function runListUnpushedCommitsCommand(args: Array<string>, root: string) {

    exitIfScopeTagsNotInitialized(root);

    // Lists the details about commits which will be automatically verified

    const repository = new GitRepository(root);
    const database = new FileTagsDatabase(root);
    const config = new ConfigFile(root);

    repository.getUnpushedCommits().then(async (commits: Commit[]) => {
        if (!commits.length) {
            console.log("No commits found that can be verified");
            process.exit(0);
        }

        for (const commit of commits) {
            if (repository.isMergeCommit(commit)) {
                console.log(`[Scope tags] Files from commit: '${commit.summary().trim()}' will be skipped, because it is a merge commit`);
                continue;
            }
            console.log(`\n[Scope tags] Files from commit: '${commit.summary().trim()}':`);

            const fileDataArray = await repository.getFileDataForCommit(commit);
            for (const fileData of fileDataArray) {
                const fileStatus = database.checkFileStatus(fileData.newPath, config);
                const description = Utils.getEnumKeyByEnumValue(FileStatusInDatabase, fileStatus) as string;
                console.log(`- ${fileData.newPath} - status: ${description.replace(/_/g, " ")}`);
            }

        }
    });
}