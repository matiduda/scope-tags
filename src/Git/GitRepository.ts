import { execSync } from "child_process";
import { Commit, Graph, Note, Oid, Repository, Revwalk, Signature } from "nodegit";
import path from "path";
import { RelevancyMap } from "../Relevancy/Relevancy";
import { RelevancyManager } from "../Relevancy/RelevancyManager";
import { ConfigFile } from "../Scope/ConfigFile";
import { FileStatusInDatabase, FileTagsDatabase } from "../Scope/FileTagsDatabase";
import { FileData, GitDeltaType, VerificationInfo } from "./Types";

export class GitRepository {

    public static SKIP_VERIFICATION_MSG = "[Scope Tags] Verification to be skipped";

    private _repository: Repository | null = null;
    private _root: string;

    constructor(root: string) {
        this._root = root;
    }

    public get root() {
        return this._root;
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
                matchingRemotes.map(remote => "- " + remote.toString()).join("\n"),
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

    /**
     * Gets file data of a specific commit
     * 
     * IMPORTANT: USE getFileDataUsingNativeGitCommand WHEN RUNNING FROM TESTS
     * OTHERWISE IT JUST DOES NOT WORK AND WILL BLOCK ALL THE TESTS
     * @public
     * @async
     * @param {Commit} commit
     * @returns {Promise<FileData[]>}
     */
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

    public getFileDataUsingNativeGitCommand(commit: Commit): FileData[] {
        /**
         * Has the following format:
         * M       src/Git/GitRepository.ts
         * R100    src/file-ignored-by-database.js src/file-ignored-by-database-2.js
         * A       test/commits/fileData.test.ts
         * M       test/commits/verification.test.ts
         * 
         * Possible statuses are: Added (A), Copied (C), Deleted (D), Modified (M), Renamed (R) (with calculated similarity index), their type (i.e. regular file, symlink, submodule, …​) changed (T), Unmerged (U), Unknown (X), Broken (B)
         * https://git-scm.com/docs/git-diff
         */

        const nameStatusOutput = execSync(`cd ${this._root} && git --no-pager diff ${commit.sha()}~ ${commit.sha()} --name-status`).toString().trim().split('\n');

        /**
         * Has the following format:
         * 1       1       .vscode/launch.json
         * 12      8       src/Git/GitRepository.ts
         * 2       0       test/_utils/globals.ts
         * 18      16      test/_utils/utils.ts
         * 69      23      test/commits/verification.test.ts
         * 9       9       test/teardown.js
         * https://git-scm.com/docs/git-diff
         */
        const numstatOutput = execSync(
            `cd ${this._root} && git update-index && git diff-tree --no-commit-id --numstat -r ${commit.sha()}`
        ).toString().trim().split('\n');

        if (nameStatusOutput.length === 0) {
            console.debug(nameStatusOutput);
            throw new Error(`Output of git-diff --name-status is empty for commit ${commit.sha()}`);
        }

        if (numstatOutput.length === 0) {
            console.debug(numstatOutput);
            throw new Error(`Output of git-diff --numstat is empty for commit ${commit.sha()}`);
        }

        const statusesToGitDeltaTypeMap = new Map<string, GitDeltaType>([
            ["A", GitDeltaType.ADDED],
            ["C", GitDeltaType.COPIED],
            ["D", GitDeltaType.DELETED],
            ["M", GitDeltaType.MODIFIED],
            ["R", GitDeltaType.RENAMED],
            ["T", GitDeltaType.TYPECHANGE],
            // ["", GitDeltaType.UNMODIFIED],
            // ["", GitDeltaType.IGNORED],
            // ["", GitDeltaType.UNTRACKED],
            // ["", GitDeltaType.UNREADABLE],
            // ["", GitDeltaType.CONFLICTED],
        ]);

        const fileDataArray: FileData[] = [];

        nameStatusOutput.forEach((nameStatusLine: string, i: number) => {
            const [changeType, relatedFilePath, optionalRenamedPath] = nameStatusLine.split('\t');

            const numStatLine = numstatOutput.find(output => output.includes(relatedFilePath));

            if (!numStatLine) {
                throw new Error(`No matching git-diff --name-status for file ${relatedFilePath}, output is ${nameStatusOutput}`);
            }

            const [linesAdded, linesRemoved, filePath] = numStatLine.split('\t');

            let ourChangeType = statusesToGitDeltaTypeMap.get(changeType[0]) || GitDeltaType.UNREADABLE;

            if (optionalRenamedPath) {
                ourChangeType = GitDeltaType.RENAMED;
            }

            fileDataArray.push({
                oldPath: filePath,
                newPath: optionalRenamedPath || filePath,
                change: ourChangeType,
                linesAdded: parseInt(linesAdded),
                linesRemoved: parseInt(linesRemoved),
                commitedIn: commit
            } as FileData);
        })

        return fileDataArray;
    }

    public async getFileDataForCommits(commits: Array<Commit>, useGitNatively = false): Promise<FileData[]> {
        const fileDataForCommits: Array<FileData> = [];

        for (const commit of commits) {
            const fileDataForCommit = useGitNatively
                ? this.getFileDataUsingNativeGitCommand(commit)
                : await this.getFileDataForCommit(commit);

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
            };
        });
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
        const author = Signature.now("Scott Chacon", "schacon@gmail.com");
        const committer = Signature.now("Scott A Chacon", "scott@github.com");

        const commitId = await repository.createCommitOnHead(filePaths, author, committer, commitMessage);

        return commitId;
    }

    public async amendMostRecentCommit(files: string[], newCommitMessage: string, useGitNatively = false) {
        if(useGitNatively) {
            this._amendFilesUsingNativeGitCommand(files, newCommitMessage);
            return;
        }

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

    public async verifyCommit(
        commit: Commit,
        config: ConfigFile,
        database: FileTagsDatabase,
        relevancyManager: RelevancyManager,
        relevancyMap?: RelevancyMap,
        useGitNatively = false
    ): Promise<VerificationInfo> {
        const commitInfo: VerificationInfo = {
            isVerified: false,
            filesToTag: [],
            filesToBeRelevancyTagged: [],
            isSkipped: false,
            includesOnlyIgnoredFiles: false,
            isMergeCommit: false,
            isFromAnotherBranch: false,
            hasRelevancy: false,
            relevancy: [],
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

        const branchesContainingCommit = await this.branchesContainingCommit(commit);

        if(branchesContainingCommit.length !== 1) {
            commitInfo.isFromAnotherBranch = true;
            commitInfo.isSkipped = true;
            return commitInfo;
        }

        const allfileDataArray = useGitNatively ? this.getFileDataUsingNativeGitCommand(commit) : await this.getFileDataForCommit(commit);
        
        const fileDataArray = allfileDataArray.filter(fileData => fileData.change !== GitDeltaType.DELETED);
        
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

        commitInfo.filesToBeRelevancyTagged = fileDataArray.filter(fileData => {
            const fileStatus = statusMap.get(fileData);
            return fileStatus !== FileStatusInDatabase.IGNORED;
        }).filter(fileData => {
            if (!relevancyMap) {
                return true;
            }

            const mapHasRelevancy = [...relevancyMap.values()].some(relevancyInfo => relevancyInfo.some(info => info.path === fileData.oldPath || info.path === fileData.newPath))

            if (mapHasRelevancy) {
                return false;
            }

            return true;
        });

        if (!commitInfo.filesToTag.length) {
            commitInfo.isVerified = true;
        }

        commitInfo.hasRelevancy = relevancyManager.doesCommitMessageHaveRelevancyData(commit.message());

        if (commitInfo.hasRelevancy) {
            commitInfo.relevancy = relevancyManager.convertCommitMessageToRelevancyData(commit)
        }

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
        if (commit.parentcount() > 1) {
            return true;
        }

        const trimmedCommitMessage = commit.summary();

        // Ugly, but works
        if (trimmedCommitMessage.includes("Merge")) {
            return true;
        }

        return false;
    }

    public async branchesContainingCommit(commit: Commit): Promise<string[]> {
        const repo = await this._getRepository();
    
        // Get all references (branches)
        const references = await repo.getReferences();
    
        const branchesContainingCommit = [];
    
        for (const ref of references) {
            const branchCommit = await repo.getBranchCommit(ref);

            // Check if the commit is in the branch history
            if(branchCommit.sha() === commit.sha()) {
                branchesContainingCommit.push(ref.shorthand());
                continue;
            }

            const isDescendant = await Graph.descendantOf(repo, branchCommit.id(), commit.id());
            if (isDescendant) {
                branchesContainingCommit.push(ref.shorthand());
            }
        }

        return branchesContainingCommit;
      }

    private async _getRepository(): Promise<Repository> {
        if (this._repository === null) {
            try {
                this._repository = await Repository.open(this._root);
            } catch (e) {
                throw new Error(`Could not open Git repository in '${this._root}'`);
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
            throw new Error(`Could not remove note from commit '${commit.summary()}'. Error code: ${errorCode}`);
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

    /**
     * Used for tests only, because nodeGit's commit.amend blocks them
     */
    private _amendFilesUsingNativeGitCommand(files: string[], newCommitMessage: string) {
        const normalizedCommitMessage = newCommitMessage.replace(/(\r\n|\n|\r)/gm, "");

        files.forEach(file => {
            execSync(`cd ${this._root} && git add ${file}`);
        })
        
        execSync(`cd ${this._root} && git commit --amend -m ${JSON.stringify(normalizedCommitMessage)}`);
    }

    /**
     * Used for tests only, because deleted file can't be commited using nodegit
     */
    public commitAllUsingNativeGitCommand(commitMessage: string) {
        const normalizedCommitMessage = commitMessage.replace(/(\r\n|\n|\r)/gm, "");

        execSync(`cd ${this._root} && git add . && git commit -m ${JSON.stringify(normalizedCommitMessage)}`);
    }
}
