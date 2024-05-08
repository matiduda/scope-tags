import { Commit, Note, Oid, Repository, Revwalk, Signature } from "nodegit";
import { FileData, GitDeltaType, VerificationInfo } from "./Types";
import path from "path";
import { FileTagsDatabase, FileStatusInDatabase } from "../Scope/FileTagsDatabase";
import { RelevancyManager } from "../Relevancy/RelevancyManager";
import { ConfigFile } from "../Scope/ConfigFile";

export class GitRepository {

    public static SKIP_VERIFICATION_MSG = "[Scope Tags] Verification to be skipped";

    private _repository: Repository;
    private _root: string;

    constructor(root: string) {
        this._root = root;
    }

    public async getFileDataForUnpushedCommits(maxCommitCount: number = 20): Promise<FileData[]> {
        const unpushedCommits = await this.getUnpushedCommits(maxCommitCount);

        unpushedCommits.forEach(commit => {
            if (this.isMergeCommit(commit)) {
                console.log(`Skipping '${commit.summary()}' because it is a merge.`);
            }
        });

        return this.getFileDataForCommits(unpushedCommits.filter(commit => !this.isMergeCommit(commit)));
    }

    public async getUnpushedCommits(maxCommitCount: number = 20): Promise<Commit[]> {
        const repository = await this._getRepository();
        const currentBranch = await repository.getCurrentBranch();
        const currentBranchName = currentBranch.shorthand();
        const refs = await repository.getReferences();
        const remoteRefs = refs.filter(ref => ref.isRemote() === 1);
        const walk = Revwalk.create(repository);

        const matchingRemotes = remoteRefs.filter(remoteRef => remoteRef.shorthand().includes(currentBranch.shorthand()));

        if (matchingRemotes.length > 1) {
            console.log(
                "[GitRepository::getUnpushedCommits] Found more than one matching remotes:\n",
                matchingRemotes.map(remote => '- ' + remote.toString()).join('\n'),
                `\n[GitRepository::getUnpushedCommits] Selecting '${matchingRemotes[0]}' because it's the first one`
            );
        }

        const currentRemote = matchingRemotes[0];

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
        // @see https://github.com/libgit2/libgit2/blob/d9475611fec95cacec30fbd2c334b270e5265d3b/include/git2/diff.h#L145C42-L145C42 -- TODO: Still not quite working as expected...
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
                        commitedIn: commit,
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

    /**
     * Careful, this won't add commitedIn, to retrieve fileData its best to use getFileDataForCommit
     */
    public convertFilesToFileData(files: Array<string>): Array<FileData> {
        return files.map(file => {
            const normalizedPath = this._normalizePath(file);
            return {
                oldPath: normalizedPath,
                newPath: normalizedPath,
                change: GitDeltaType.ADDED,
                linesAdded: 0,
                linesRemoved: 0,
            }
        })
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

    public getMostRecentChangeDateFromCommitList(commits: Commit[]): Date { // Unused
        if (!commits.length) {
            throw new Error("[getMostRecentChangeDateFromCommitList] Commit list is empty");
        }

        let date = commits[0].date();

        for (let i = 1; i < commits.length; i++) {
            if (commits[i].date() > date) {
                date = commits[i].date();
            }
        }
        return date;
    }

    // Mostly from https://github.com/nodegit/nodegit/blob/master/examples/add-and-commit.js
    public async commitFiles(commitMessage: string, filePaths: string[]): Promise<Oid> {
        const repository = await this._getRepository();
        const index = await repository.refreshIndex();

        for (const filePath of filePaths) {
            await index.addByPath(filePath);
        }

        await index.write();

        const oid = await index.writeTree();

        const parent = await repository.getHeadCommit();
        const author = Signature.now("Scott Chacon", "schacon@gmail.com");
        const committer = Signature.now("Scott A Chacon", "scott@github.com");

        const commitId = await repository.createCommit("HEAD", author, committer, commitMessage, oid, [parent]);

        return commitId;
    }

    public async amendMostRecentCommit(files: string[], newCommitMessage: string) {

        const repository = await this._getRepository();
        const index = await repository.refreshIndex();

        const commit = await repository.getHeadCommit();

        for (const file of files) {
            await index.addByPath(file);
        }

        const oid = await index.writeTree();

        await commit.amend(
            "HEAD",
            commit.author(),
            commit.committer(),
            "UTF-8",
            newCommitMessage,
            oid,
        );

        await index.write();
    }

    public async verifyCommit(commit: Commit, config: ConfigFile, database: FileTagsDatabase, relevancyManager: RelevancyManager): Promise<VerificationInfo> {
        const commitInfo: VerificationInfo = {
            isVerified: false,
            filesToTag: [],
            isSkipped: false,
            includesOnlyIgnoredFiles: false,
            isMergeCommit: false,
            hasRelevancy: false,
        };

        // Check if commit should be skipped
        const skipVerificationCheck = await this._skipVerificationCheckForCommit(commit);
        if (skipVerificationCheck) {
            await this._removeNoteFromCommit(commit);
            commitInfo.isSkipped = true;
            return commitInfo;
        } else if (this.isMergeCommit(commit)) {
            commitInfo.isMergeCommit = true;
            return commitInfo;
        }

        const fileDataArray = await this.getFileDataForCommit(commit);
        const statusMap = database.checkMultipleFileStatusInDatabase(fileDataArray, config);

        const allFilesAreIgnored = fileDataArray.every(fileData => {
            return statusMap.get(fileData) === FileStatusInDatabase.IGNORED;
        });

        if (allFilesAreIgnored) {
            commitInfo.includesOnlyIgnoredFiles = true;
            return commitInfo;
        }

        const filesNotPresentInDatabase = fileDataArray.filter(fileData => {
            return statusMap.get(fileData) === FileStatusInDatabase.NOT_IN_DATABASE;
        });

        commitInfo.filesToTag = filesNotPresentInDatabase.filter(file => !config.isFileExtensionIgnored(file.newPath));

        if (!commitInfo.filesToTag.length) {
            commitInfo.isVerified = true;
        }

        // Check relevancy
        commitInfo.hasRelevancy = relevancyManager.doesCommitMessageHaveRelevancyData(commit.message());

        return commitInfo;
    }

    public async addSkipVerificationNoteToCommit(commit: Commit): Promise<void> {

        // Commits which will be automatically verified
        // should have a temporary git note attached to them

        const repository = await this._getRepository();

        const noteOid = await Note.create(
            repository,
            "refs/notes/commits",
            commit.author(),
            commit.committer(),
            commit.id(),
            GitRepository.SKIP_VERIFICATION_MSG,
            1
        );
    }

    public isMergeCommit(commit: Commit): boolean {
        return commit.parentcount() > 1;
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

    private _normalizePath(filePath: string) {
        const relativePath = path.relative(this._root, filePath);
        const definitelyPosix = relativePath.split(path.sep).join(path.posix.sep);
        return definitelyPosix;
    }

    private async _removeNoteFromCommit(commit: Commit) {
        const repository = await this._getRepository();
        const note = await Note.read(repository, "refs/notes/commits", commit.id());

        const errorCode = await Note.remove(
            repository,
            "refs/notes/commits",
            note.author(),
            note.committer(),
            commit.id(),
        );

        if (errorCode) {
            throw new Error(`Could not remove note from commit '${commit.summary()}'. Error code: ${errorCode}`)
        }
    }

    private async _skipVerificationCheckForCommit(commit: Commit): Promise<boolean> {

        // If commit has the note - verify it

        const repository = await this._getRepository();

        try {
            const note = await Note.read(repository, "refs/notes/commits", commit.id());
            return note.message() === GitRepository.SKIP_VERIFICATION_MSG;
        } catch (e) {
            return false;
        }
    }
}
