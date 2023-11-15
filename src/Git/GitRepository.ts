import { Commit, Repository, Revwalk } from "nodegit";
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

    public async getFileDataForUnpushedCommits(maxCommitCount: number = 20): Promise<FileData[]> {
        const repository = await this._getRepository();
        const currentBranch = await repository.getCurrentBranch();
        const currentBranchName = currentBranch.shorthand();
        const refs = await repository.getReferences();
        const remoteRefs = refs.filter(ref => ref.isRemote() === 1);
        const currentRemote = remoteRefs.find(ref => ref.shorthand() === `origin/${currentBranchName}`);
        const walk = Revwalk.create(repository);

        // When remote branch is not yet pushed, we can't directly compare
        // which commits are fresh, so we safely compare to origin/HEAD

        walk.pushRange(currentRemote ? `${currentRemote}..HEAD` : `origin/HEAD..${currentBranchName}`);

        const unpushedCommits = await walk.getCommits(maxCommitCount);
        if (unpushedCommits.length === maxCommitCount) {
            console.warn(`Found ${maxCommitCount} commits, which is the limit. Some commits may have been ommited. To remove this warning set higher gitCommitCountLimit in .scope/config.json`);
        }
        unpushedCommits.forEach(commit => console.log(commit.message()))
        return this.getFileDataForCommits(unpushedCommits);
    }

    public async getFileDataFromLastCommit(): Promise<FileData[]> {
        const mostRecentCommit = await this.getLatestCommit();
        return this.getFileDataForCommit(mostRecentCommit);
    }

    public async getFileDataForCommit(commit: Commit): Promise<FileData[]> {
        const commitDiffs = await commit.getDiff();

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

    public async getFileDataForCommits(commits: Array<Commit>): Promise<FileData[]> {
        const fileDataForCommits: Array<FileData> = [];

        for (const commit of commits) {
            const fileDataForCommit = await this.getFileDataForCommit(commit);
            fileDataForCommit.forEach(fileData => fileDataForCommits.push(fileData));
        }

        return fileDataForCommits;
    }

    public async getCommitByHash(hash: string): Promise<Commit> {
        const repository = await this._getRepository();
        return repository.getCommit(hash);
    }

    public async getLatestCommit(): Promise<Commit> {
        const repository = await this._getRepository();
        return repository.getHeadCommit();
    }
}
