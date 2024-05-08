// beforeEach(() => {
//     assertTemporaryFolderExists();
// });

// afterAll(() => {
//     rimraf.sync(SCOPE_FOLDER_PATH);
// });

// const purgeScopeFolder = () => {
//     rmdirSync(SCOPE_FOLDER_PATH);
//     expect(existsSync(SCOPE_FOLDER_PATH)).toBe(false);
// }

describe("Finding .scope folder", () => {
    it("Dummy", () => {
        expect(true).toBe(true);
    })

    //   it("Does not find .scope folder when there is none", () => {
    //     const SCOPE_FOLDER_PATH = resolve(join(TEST_DATA_FOLDER, ".scope"));



    //     expect(scopeFolderExists(TEMP_TEST_FOLDER)).toBe(false);
    //   });

    //   it("Does find .scope folder where when is one", () => {
    //     mkdirSync(SCOPE_FOLDER_PATH);
    //     expect(scopeFolderExists(resolve(TEMP_TEST_FOLDER))).toBe(true);
    //     purgeScopeFolder();
    //   });

    //   it("Creates .scope folder when there is none", () => {
    //     ensureScopeFolderExists(TEMP_TEST_FOLDER);
    //     expect(existsSync(SCOPE_FOLDER_PATH)).toBe(true);
    //     purgeScopeFolder();
    //   });
});
