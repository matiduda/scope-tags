#!/usr/bin/env node
import { ConfigFile } from "./ConfigFile/ConfigFile";
import { GitRepository } from "./Git/GitRepository";
import { getGitProjectRoot } from "./Git/Project";

// Will be needed to get output from script
const [, , ...args] = process.argv;
console.log("scope tags v0.0.2 " + args);

// Find git repository
const root: string = getGitProjectRoot();
console.log("Found Git repository in: " + root);

// Load configuration file

const config = new ConfigFile(root);
const repository = new GitRepository(root);

repository.getFileDataFromLastCommit().then(data => {
    console.log("OK:");
    console.log(data)
});

// getData.then(data => console.log(data));

// tagSelectionPrompt.run()
//     .then((answer: string) => console.log('Answer:', answer))
//     .catch(console.error);