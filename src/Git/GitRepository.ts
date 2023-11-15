import { Commit, Note, Repository } from "nodegit";
import { FileData } from "./Types";

export class GitRepository {

    private _repository: Repository;
    private _root: string;

    constructor(root: string) {
        this._root = root;
    }

    private async _getRepository(): Promise<Repository> {
        if (!this._repository) {
            try {
                this._repository = await Repository.open(this._root);
            } catch (e) {
                console.log(e);
            }
        }
        return this._repository;
    }

    public async getFileDataFromLastCommit(): Promise<FileData[]> {
        const mostRecentCommit = await this.getLatestCommit();
        const commitDiffs = await mostRecentCommit.getDiff();

        return new Promise<FileData[]>(async (resolve, reject) => {

            const fileDataArray: FileData[] = [];

            for (const diff of commitDiffs) {
                const diffPatches = await diff.patches();

                for (const patch of diffPatches) {
                    const fileData: FileData = {
                        oldPath: patch.oldFile().path(),
                        newPath: patch.newFile().path(),
                        change: patch.status(),
                    };
                    fileDataArray.push(fileData);
                }
            }
            resolve(fileDataArray);
        });
    }

    public async getLatestCommit(): Promise<Commit> {
        const repository = await this._getRepository();
        return repository.getHeadCommit();
    }

    public async markCommitAsDone(commit: Commit): Promise<void> {
        const repo = await this._getRepository();
        const userName = (await (await repo.config()).getEntry("user.name")).value();

        await Note.create(
            repo,
            "refs/notes/commits",
            commit.author(),
            commit.committer(),
            commit.id(),
            this._getNoteVerificationContent(userName),
            0
        );
    }

    private _getNoteVerificationContent(author: string): string {
        const date = new Date();
        return `[SCOPE TAGS] Successfully tagged by '${author}' on '${date.toLocaleString()}'`;
    }

    public async verifyCommit(commit: Commit): Promise<void> {
        // TODO: Remove this
        const repo = await this._getRepository();
        const noteContent = "Scope tags: OK1";
        const noteOID = await Note.create(repo, "refs/notes/commits", commit.author(), commit.committer(), commit.id(), noteContent, 0);
    }
}
