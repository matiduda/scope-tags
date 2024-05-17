module.exports = async function(globalConfig, projectConfig) {
    console.debug("\n[Setup] Global test setup");

    const rimraf = require("rimraf");
    const fs = require("fs");
    const path = require("path");

    const GLOBAL_TEST_FOLDER = path.resolve("./__temporaryTestData__");
    const repositorySourceURL = "https://github.com/matiduda/scope-tags-mock-repo-for-testing-only";

    if(fs.existsSync(GLOBAL_TEST_FOLDER)) {
        console.debug(`[Setup] Removed previous instance of '${GLOBAL_TEST_FOLDER}'`);
        rimraf.sync(GLOBAL_TEST_FOLDER);
    }

    console.debug(`[Setup] Initializing temporary folder at '${GLOBAL_TEST_FOLDER}'...`);
    await fs.mkdir(GLOBAL_TEST_FOLDER, (err) => {
        if (err) {
            console.debug(err);
        }
    });
    
    // Could probably be deleted safely
    const mockRepositoryPath = path.join(GLOBAL_TEST_FOLDER, "_scopeTagsMockRepositoryForTestingOnly");
    console.debug(`[Setup] Cloning mock repository ${repositorySourceURL} to '${mockRepositoryPath}'...`);
    await cloneMockRepository(repositorySourceURL, mockRepositoryPath);

    // Make it accessible for teardown
    global.TEMP_FOLDER_FOR_TESTS = GLOBAL_TEST_FOLDER;
};

async function cloneMockRepository(sourceURL, destinationPath) {
    // From https://github.com/nodegit/nodegit/blob/master/examples/clone.js

    var nodegit = require("nodegit");

    await nodegit.Clone(
        sourceURL,
        destinationPath,
        {
            fetchOpts: {
                callbacks: {
                    certificateCheck: function() {
                        // github will fail cert check on some OSX machines
                        // this overrides that check
                        return 0;
                    }
                }
            }
        }
    );
}