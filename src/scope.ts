#!/usr/bin/env node
import { runAddCommand } from "./Commands/runAddCommand";
import { runCommitCommand } from "./Commands/runCommitCommand";
import { runFindReferencesCommand } from "./Commands/runFindReferencesCommand";
import { runHelpCommand } from "./Commands/runHelpCommand";
import { runLogCommitCommand } from "./Commands/runLogCommitCommand";
import { runReportForCommitCommand } from "./Commands/runReportForCommitCommand";
import { runReportForCommitListCommand } from "./Commands/runReportForCommitListCommand";
import { runSeeCommand } from "./Commands/runSeeCommand";
import { runSkipVerificationForCommits } from "./Commands/runSkipVerificationAndPushCommand";
import { runStartCommandLineInterfaceCommand } from "./Commands/runStartCommandLineInterfaceCommand";
import { runTagCommitCommand } from "./Commands/runTagCommand";
import { runUntagCommand } from "./Commands/runUntagCommand";
import { runVerifyCommand } from "./Commands/runVerifyCommand";
import { runVerifyUnpushedCommitsCommand } from "./Commands/runVerifyUnpushedCommitsCommand";
import { getGitProjectRoot } from "./Git/Project";

// Will be needed to get output from script
const [, , ...args] = process.argv;

// Find git repository
const root: string = getGitProjectRoot();
if (!root) {
    console.error("Git repository not found.");
    process.exit(1);
}

// IMPORTANT: Do not export anything from here, is breaks tests

switch (args[0]) {
    case "--version": {
        console.log(getScriptVersion());
        break;
    }
    case "--tag": {
        runTagCommitCommand(args, root);
        break;
    }
    case "--see": {
        runSeeCommand(args, root);
        break;
    }
    case "--untag": {
        runUntagCommand(args, root);
        break;
    }
    case "--commit": {
        runCommitCommand(args, root);
        break;
    }
    case "--add": {
        runAddCommand(args, root);
        break;
    }
    case "--verify": {
        runVerifyCommand(args, root);
        break;
    }
    case "--verify-unpushed-commits": {
        runVerifyUnpushedCommitsCommand(args, root);
        break;
    }
    case "--report-for-commit": {
        runReportForCommitCommand(args, root);
        break;
    }
    case "--report-for-commit-list": {
        runReportForCommitListCommand(args, root);
        break;
    }
    case "--find-refs": {
        runFindReferencesCommand(args, root);
        break;
    }
    case "--help": {
        runHelpCommand(args);
        break;
    }
    case "--skip": {
        runSkipVerificationForCommits(args, root);
        break;
    }
    case "--logcommit": {
        runLogCommitCommand(args, root);
        break;
    }
    default: {
        runStartCommandLineInterfaceCommand(args, root);
        break;
    }
}

export function getScriptVersion(): string {
    return require("../package.json").version;
}