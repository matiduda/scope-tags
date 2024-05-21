export function runHelpCommand(args: Array<string>) {
    console.log(`
    npx scope\t\t\tStarts command line interface, which enables you to add and remove tags and modules, and assign tags between modules

Definitions:

    "tag"
    
        Represents the most basic unit of functionality from user perspective. Typically cannot be divided into smaller parts. eg. "Start button"
    
    "module"
    
        Represents a collection of tags, which can corelate to a behaviour, single view or an action from user perspective. eg. "Main menu"
    
Options:
        
    --tag\t\t\tEnables to tag specific files or directories, usage: npx scope --tag <path>
    --untag\t\t\tRemoves tags for files (single or directory) in database, also removes 'ignored' status, usage: npx scope --untag <path>
    
    --see\t\t\tPrints the tags assigned to file or directory, usage: npx scope --see <path>
\t\t\t\tIf path is ommited, lists the commits which are currently "observed" by the script, usage: npx scope --see
    
    --find-refs\t\t\tUses ts-morph to find .ts file references, usage: npx scope --find-references <path>
    --logcommit\t\t\tLogs files associated with a commit, usage: npx scope --logcommit <commit hash, long format>

    --add\t\t\tLists files which were modified in commits, which are not yet pushed to remote, and tags them
    --commit\t\t\tLists files which were modified by a specific commit and tags them, usage: npx scope --commit <commit hash, long format>
    
    --verify\t\t\tReturns 0 if all files modified by a commit were tagged or ignored and 1 otherwise, usage: npx scope --verify <commit hash, long format>
    --verify-unpushed-commits\tWorks similar to --verify, but checks for commits no yet pushed to remote, returns 0 or 1 analogous to --verify
    
    --report-for-commit\t\tGenerates human readable report with statistics for files modified in a commit, usage: --report-for-commit <commit hash, long format>
    --report-for-commit-list\tSimilar to --report-for-commit, but enables Jira issue norification - see README.md for configuration details.
    `);
}