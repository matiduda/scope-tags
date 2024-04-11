import { scopeFolderExists, ensureScopeFolderExists } from "../../src/FileSystem/fileSystemUtils";
import { resolve, join } from "path";
import { mkdirSync, rmdirSync, existsSync } from "fs";
import rimraf from "rimraf";
import { TEMP_TEST_FOLDER } from "../_utils/globals";

const SCOPE_FOLDER_PATH = join(TEMP_TEST_FOLDER, ".scope");

afterAll(() => {
  rimraf.sync(resolve(SCOPE_FOLDER_PATH));
});

const purgeScopeFolder = () => {
  rmdirSync(SCOPE_FOLDER_PATH);
  expect(existsSync(SCOPE_FOLDER_PATH)).toBe(false);
}

describe("Finding .scope folder", () => {
  it("Does not find .scope folder when there is none", () => {
    expect(scopeFolderExists(TEMP_TEST_FOLDER)).toBe(false);
  });

  it("Does find .scope folder where when is one", () => {
    mkdirSync(SCOPE_FOLDER_PATH);
    expect(scopeFolderExists(TEMP_TEST_FOLDER)).toBe(true);
    purgeScopeFolder();
  });

  it("Creates .scope folder when there is none", () => {
    ensureScopeFolderExists(TEMP_TEST_FOLDER);
    expect(existsSync(SCOPE_FOLDER_PATH)).toBe(true);
    purgeScopeFolder();
  });
});
