#!/usr/bin/env node
import enquirer from 'enquirer';

const [, , ...args] = process.argv;

console.log("scope tags v0.0.3 " + args);
console.log("----------");

enquirer.prompt({
    type: 'input',
    name: 'username',
    message: 'What is your username?'
}).then((response) => console.log(response)); // { username: 'jonschlinkert' }

// ts morph test
import { Project } from 'ts-morph';

const project = new Project({
    tsConfigFilePath: "./tsconfig.json"
});

console.log(project);

project.getSourceFiles().forEach((sourceFile) => {
    console.log(sourceFile);
});

//