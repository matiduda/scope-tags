module.exports = async function(globalConfig, projectConfig) {
    console.debug("\n[SCOPE TAGS] Global test setup");

    const rimraf = require("rimraf");
    const fs = require("fs");
    const path = require("path");

    global.TEMP_FOLDER_FOR_TESTS = path.resolve("./__testModulesData__");

    if (!fs.existsSync(global.TEMP_FOLDER_FOR_TESTS)) {
        console.debug(`[SCOPE TAGS] Initializing temporary folder at '${global.TEMP_FOLDER_FOR_TESTS}'...`);
        fs.mkdirSync(global.TEMP_FOLDER_FOR_TESTS);
    }
};