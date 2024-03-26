export type FilePath = string;

export type FileData = {
    oldPath: FilePath,
    newPath: FilePath,
    change: GitDeltaType,
    linesAdded: number,
    linesRemoved: number,
    /**
     * Some files can be tagged by hand, and I don't think it's a problem, since these are old files...
     * This might be a problem if we run scope --tag manually but noone will probably do that... Nevertheless we won't have
     * relevancy information for them (but they would be ommited for the report nontheless, so who cares)
     */
    commitedIn?: string
};

/**
 * @see https://github.com/libgit2/libgit2/blob/45fd9ed7ae1a9b74b957ef4f337bc3c8b3df01b5/include/git2/diff.h#L224-236
 * What type of change is described by a git_diff_delta?
 *
 * `GIT_DELTA_RENAMED` and `GIT_DELTA_COPIED` will only show up if you run
 * `git_diff_find_similar()` on the diff object.
 *
 * `GIT_DELTA_TYPECHANGE` only shows up given `GIT_DIFF_INCLUDE_TYPECHANGE`
 * in the option flags (otherwise type changes will be split into ADDED /
 * DELETED pairs).
 */
export enum GitDeltaType {
    UNMODIFIED = 0,  /**< no changes */
    ADDED = 1,	   /**< entry does not exist in old version */
    DELETED = 2,	   /**< entry does not exist in new version */
    MODIFIED = 3,    /**< entry content changed between old and new */
    RENAMED = 4,     /**< entry was renamed between old and new */
    COPIED = 5,      /**< entry was copied from another old entry */
    IGNORED = 6,     /**< entry is ignored item in workdir */
    UNTRACKED = 7,   /**< entry is untracked item in workdir */
    TYPECHANGE = 8,  /**< type of entry changed between old and new */
    UNREADABLE = 9,  /**< entry is unreadable */
    CONFLICTED = 10  /**< entry in the index is conflicted */
};

export type VerificationInfo = {
    isVerified: boolean,
    filesToTag: Array<FileData>,
    isSkipped: boolean,
    hasRelevancy: boolean,
    isMergeCommit: boolean,
}