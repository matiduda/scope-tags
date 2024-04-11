module.exports = async function(globalConfig, projectConfig) {
    const rimraf = require("rimraf");
    const fs = require("fs");
    const path = require("path");

    global.TEMP_FOLDER_FOR_TESTS = path.resolve("./TEST_TMP/");

    console.debug(`\n[SCOPE TAGS] Global test setup - initializing temporary folder at ${global.TEMP_FOLDER_FOR_TESTS}`);
    rimraf.sync(global.TEMP_FOLDER_FOR_TESTS);
    fs.mkdirSync(global.TEMP_FOLDER_FOR_TESTS);
};