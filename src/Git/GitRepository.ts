import { Commit, Note, Repository, Revwalk } from "nodegit";
import { FileData, GitDeltaType } from "./Types";
import path from "path";
import { ConfigFile } from "../Scope/ConfigFile";
import { FileTagsDatabase, FileStatusInDatabase } from "../Scope/FileTagsDatabase";

export class GitRepository {

    public static SKIP_VERIFICATION_MSG = "[Scope Tags] Verification to be skipped";

    private _repository: Repository;
    private _root: string;

    constructor(root: string) {
        this._root = root;
    }

    public async getFileDataForUnpushedCommits(maxCommitCount: number = 20): Promise<FileData[]> {
        const unpushedCommits = await this.getUnpushedCommits(maxCommitCount);
        unpushedCommits.forEach(commit => console.log(`Checking commit: ${commit.summary()}`));
        return this.getFileDataForCommits(unpushedCommits);
    }

    public async getUnpushedCommits(maxCommitCount: number = 20): Promise<Commit[]> {
        const repository = await this._getRepository();
        const currentBranch = await repository.getCurrentBranch();
        console.log("🚀 ~ GitRepository ~ getUnpushedCommits ~ currentBranch:", currentBranch.shorthand())
        const currentBranchName = currentBranch.shorthand();
        const refs = await repository.getReferences();
        const remoteRefs = refs.filter(ref => ref.isRemote() === 1);
        const walk = Revwalk.create(repository);

        const matchingRemotes = remoteRefs.filter(remoteRef => remoteRef.shorthand().includes(currentBranch.shorthand()));

        if (matchingRemotes.length > 1) {
            console.log(
                "[GitRepository::getUnpushedCommits] Found more than one matching remotes:",
                matchingRemotes,
                `[GitRepository::getUnpushedCommits] Selecting '${matchingRemotes[0]}' because it's the first one`
            );
        }

        const currentRemote = matchingRemotes[0];

        // When remote branch is not yet pushed, we can't directly compare
        // which commits are fresh, so we safely compare to origin/HEAD
        console.log(currentRemote);

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
                        commitedIn: commit.sha(),
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

    public async amendMostRecentCommit(file: string, commitMessageAttitionalData: string) {

        const repository = await this._getRepository();
        const index = await repository.refreshIndex();

        const commit = await repository.getHeadCommit();

        await index.addByPath(file);

        const oid = await index.writeTree();

        await commit.amend(
            "HEAD",
            commit.author(),
            commit.committer(),
            "UTF-8",
            commit.message() + commitMessageAttitionalData,
            oid,
        );

        await index.write();
    }

    public async verifyCommit(commit: Commit, config: ConfigFile, database: FileTagsDatabase) {
        // Check if commit should be skipped
        const skipVerificationCheck = await this._skipVerificationCheckForCommit(commit);
        if (skipVerificationCheck) {
            console.log(`[Scope Tags] Skipped check for '${commit.summary()}'`);
            await this._removeNoteFromCommit(commit);
            return;
        }

        const fileDataArray = await this.getFileDataForCommit(commit);
        const statusMap = database.checkMultipleFileStatusInDatabase(fileDataArray);

        const filesNotPresentInDatabase = fileDataArray.filter(fileData => {
            return statusMap.get(fileData) === FileStatusInDatabase.NOT_IN_DATABASE;
        });

        const filesWithIgnoredExtensions = filesNotPresentInDatabase.filter(file => !config.isFileExtensionIgnored(file.newPath));

        if (filesWithIgnoredExtensions.length) {
            console.log(`Commit '${commit.summary()}' not verified, no tags found for required files:\n`);
            filesWithIgnoredExtensions.forEach(file => console.log(`- ${file.newPath}`));
            console.log("\nPlease run\n\n\tnpx scope --add\n\nto tag them");
            process.exit(1);
        }
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
