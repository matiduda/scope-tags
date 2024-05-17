module.exports = async function(globalConfig, projectConfig) {
    const { execSync } = require('child_process');

    // console.debug(`[Teardown] Global test teardown - removing temporary folder '${global.TEMP_FOLDER_FOR_TESTS}'`);

    // try {
    //     execSync(`rm -rf ${global.TEMP_FOLDER_FOR_TESTS}`, (err, stdout, stderr) => {
    //         if (err) {
    //             console.debug(err);
    //             return;
    //         }
    //     });
    // } catch(e) { }
};
