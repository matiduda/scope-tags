module.exports = async function(globalConfig, projectConfig) {
    console.debug(`[SCOPE TAGS] Global test teardown - initializing temporary folder at ${global.TEMP_FOLDER_FOR_TESTS}`);

    console.debug(global.asdf);

    const rimraf = require("rimraf");
    rimraf.sync(global.TEMP_FOLDER_FOR_TESTS);
};