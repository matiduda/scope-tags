import { GitRepository } from "../Git/GitRepository";
import { GitDeltaType } from "../Git/Types";
import { RelevancyManager } from "../Relevancy/RelevancyManager";
import { FileTagsDatabase } from "../Scope/FileTagsDatabase";
import { Utils } from "../Scope/Utils";

export function runLogCommitCommand(args: Array<string>, root: string) {
    // Logs files associated with a commit
    const commitHash = args[1];
    if (!commitHash) {
        console.log("--logcommit option requires complete git commit hash, use: scope --logcommit <hash>");
        process.exit(1);
    }

    const repository = new GitRepository(root);
    const fileTagsDatabase = new FileTagsDatabase(root);
    const relevancyTagger = new RelevancyManager();

    repository.getCommitByHash(commitHash).then(async commit => {

        const fileData = await repository.getFileDataForCommit(commit);

        const commitHasRelevancy = relevancyTagger.doesCommitMessageHaveRelevancyData(commit.message());

        const branches = await repository.branchesContainingCommit(commit);

        console.log(`Commit summary: ${commit.summary()}`);
        console.log(`Relevancy info?: '${commitHasRelevancy ? "yes" : "no"}`);
        console.log(`Branches: ${branches.length ? branches.join(', ') : "-"}`);

        if (commitHasRelevancy) {
            const relevancyMap = relevancyTagger.loadRelevancyMapFromCommits([commit]);

            [...relevancyMap].forEach(([key, value]) => {
                printLineBreak();
                console.log(`Relevancy for commit '${key}':`);
                value.forEach(relevancyInfo => {
                    console.log(`- ${relevancyInfo.relevancy}: ${relevancyInfo.path}`);
                });
            });
        }

        console.log("Affected files:");

        for (const data of fileData) {
            printLineBreak();
            const changeType = Utils.getEnumKeyByEnumValue(GitDeltaType, data.change);
            console.log(`${changeType} ${data.oldPath}`);
            if (data.change === GitDeltaType.RENAMED) {
                console.log(`TO ${data.oldPath}`);
            }
            console.log(`Lines added / removed: ++${data.linesAdded} --${data.linesRemoved}`);

            const fileTagIdentifiers = fileTagsDatabase.getTagIdentifiersForFile(data.newPath);
            if (fileTagIdentifiers.length) {
                console.log("Tags:");
                fileTagIdentifiers.forEach(identifier => console.log(`- Tag '${identifier.tag}' from module '${identifier.module}'`));
            } else if (fileTagsDatabase.isIgnored(data.newPath)) {
                console.log("File is IGNORED by scope database.");
            }
            else {
                console.log("Not found in scope database.");
            }
        }
        printLineBreak();
    });


}

function printLineBreak() {
    console.log("─────────────────────────");
}