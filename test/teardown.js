module.exports = async function(globalConfig, projectConfig) {
    console.debug(`[SCOPE TAGS] Global test teardown - removing temporary folder '${global.TEMP_FOLDER_FOR_TESTS}'`);

    const rimraf = require("rimraf");
    rimraf.sync(global.TEMP_FOLDER_FOR_TESTS);
};