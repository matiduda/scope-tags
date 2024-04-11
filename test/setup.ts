module.exports = async function(globalConfig, projectConfig) {
    const rimraf = require("rimraf");
    const fs = require("fs");
    const path = require("path");

    global.TEMP_FOLDER_FOR_TESTS = path.resolve("./TEST_TMP/");

    if (fs.existsSync(global.TEMP_FOLDER_FOR_TESTS)) {
        // Just remove folder content
        console.debug(`\n[SCOPE TAGS] Found existing temporary folder at '${global.TEMP_FOLDER_FOR_TESTS}', removing its contents...`);
        // rimraf.sync(path.join(global.TEMP_FOLDER_FOR_TESTS, "*"));
        return;
    }

    console.debug(`\n[SCOPE TAGS] Global test setup - initializing temporary folder at '${global.TEMP_FOLDER_FOR_TESTS}'...`);
    try {
        fs.mkdirSync(global.TEMP_FOLDER_FOR_TESTS, { recursive: true });
    } catch (e) {
        console.error(e);
    }
};