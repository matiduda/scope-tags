#!/usr/bin/env node
import { Repository } from "nodegit";
import { getGitProjectRoot } from "./Git/Git";
export { getGitProjectRoot } from "./Git/Git";

// import enquirer from 'enquirer';

// const [, , ...args] = process.argv;

// console.log("scope tags v0.0.243 " + args);
// console.log("----------");

// enquirer.prompt({
//     type: 'input',
//     name: 'username',
//     message: 'What is your username?'
// }).then((response) => console.log(response)); // { username: 'jonschlinkert' }

export const root = getGitProjectRoot();

Repository.open(root).then(function (repo) {
    console.log(repo);
    // Inside of this function we have an open repo
});

// if(!fs.existsSync(root + 