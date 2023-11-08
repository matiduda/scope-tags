#!/usr/bin/env node
import { Menu } from "./Console/Menu";
import { getGitProjectRoot } from "./Git/Project";

// Will be needed to get output from script
const [, , ...args] = process.argv;
console.log("scope tags v0.0.2 " + args);

if (args[0] === "--report") {
    // Run tag analysis
    process.exit(0);
}

// Find git repository
const root: string = getGitProjectRoot();
console.log("Found Git repository in: " + root);

// Load configuration file

// const config = new ConfigFile(root);
// const repository = new GitRepository(root);

// repository.getFileDataFromLastCommit().then(data => {
//     console.log("OK:");
//     console.log(data)
// });

const menu = new Menu().start().then(() => console.log("Exit."));

// getData.then(data => console.log(data));

// tagSelectionPrompt.run()
//     .then((answer: string) => console.log('Answer:', answer))
//     .catch(console.error);