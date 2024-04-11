#!/usr/bin/env node

// Used by github actions to determine if the package version was bumped
// - Returns 1 if package changed
// - Returns 0 otherwise
// Should be executed in root of repository

const child_process = require("child_process");
const fs = require("fs");

if (!fs.existsSync("./package.json")) {
    console.log("package.json not found, please execute in root");
    process.exit(0);
}

const currentPackageVersion = require("../package.json").version;

child_process.exec('npm view scope-tags@latest version', (err, stdout) => {
    if (err) {
        console.log(err);
        process.exit(0);
    } else {
        const remotePackageVersion = stdout.toString().trim();
        if(currentPackageVersion === remotePackageVersion) {
            console.log(0);
        } else {
            console.log(1);
        }
        process.exit(0);
    }
});
