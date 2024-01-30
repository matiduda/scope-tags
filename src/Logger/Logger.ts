
// Stores useful information about report generation process and saves them to a HTML file

// What we need to know:
// - Commits matched a single task, for each commit
//   - A list of files which were modified (can also list ignored files)
//   - A list of tags associated which each file
// - Reports which were generated for each task

type CommitInfo = {
    files: Array<string>;
}

export class Logger {
    private static _instance: Logger;

    private constructor() { }

    private _getInstance(): Logger {
        if (!Logger._instance) {
            Logger._instance = new Logger();
        }
        return Logger._instance;
    }

    public log() {

    }
}