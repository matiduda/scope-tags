#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const enquirer_1 = __importDefault(require("enquirer"));
const [, , ...args] = process.argv;
console.log("scope tags v0.0.3 " + args);
console.log("----------");
enquirer_1.default.prompt({
    type: 'input',
    name: 'username',
    message: 'What is your username?'
}).then((response) => console.log(response)); // { username: 'jonschlinkert' }
// ts morph test
const ts_morph_1 = require("ts-morph");
const project = new ts_morph_1.Project({
    tsConfigFilePath: "./tsconfig.json"
});
console.log(project);
project.getSourceFiles().forEach((sourceFile) => {
    console.log(sourceFile);
});
