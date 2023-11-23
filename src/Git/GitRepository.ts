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
        const unpushedCommits = await this.getUnpushedCommits(maxCommitCount);
        unpushedCommits.forEach(commit => console.log(commit.message()))
        return this.getFileDataForCommits(unpushedCommits);
    }

    public async getUnpushedCommits(maxCommitCount: number = 20): Promise<Commit[]> {
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

        const commits = await walk.getCommits(maxCommitCount);
        if (commits.length === maxCommitCount) {
            console.warn(`Found ${maxCommitCount} commits, which is the limit. Some commits may have been ommited. To remove this warning set higher gitCommitCountLimit in .scope/config.json`);
        }
        return commits;
    }

    public async getFileDataFromLastCommit(): Promise<FileData[]> {
        const mostRecentCommit = await this.getLatestCommit();
        return this.getFileDataForCommit(mostRecentCommit);
    }

    public async getFileDataForCommit(commit: Commit): Promise<FileData[]> {
        // Ignore whitespaces using a combination of git diff flags
        // @see https://github.com/libgit2/libgit2/blob/d9475611fec95cacec30fbd2c334b270e5265d3b/include/git2/diff.h#L145C42-L145C42
        const commitDiffs = await commit.getDiffWithOptions({ flags: 30932992 } as any);

        return new Promise<FileData[]>(async (resolve, reject) => {

            const fileDataArray: FileData[] = [];

            for (const diff of commitDiffs) {
                const diffPatches = await diff.patches();

                for (const patch of diffPatches) {
                    const fileData: FileData = {
                        oldPath: patch.oldFile().path(),
                        newPath: patch.newFile().path(),
                        change: patch.status(),
                        linesAdded: patch.lineStats().total_additions,
                        linesRemoved: patch.lineStats().total_deletions,
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

    public async getFileDataForCommitHashes(hashes: Array<string>): Promise<FileData[]> {
        const commits: Array<Commit> = [];
        for (const hash of hashes) {
            const commit = await this.getCommitByHash(hash);
            commits.push(commit);
        }
        return this.getFileDataForCommits(commits);
    }

    public async getCommitByHash(hash: string): Promise<Commit> {
        const repository = await this._getRepository();
        return repository.getCommit(hash);
    }

    public async getCommitsByHashes(commitHashes: string[]): Promise<Commit[]> {
        const commits: Commit[] = [];
        for (const hash of commitHashes) {
            const commit = await this.getCommitByHash(hash);
            commits.push(commit);
        }
        return commits;
    }

    public async getLatestCommit(): Promise<Commit> {
        const repository = await this._getRepository();
        return repository.getHeadCommit();
    }
}
