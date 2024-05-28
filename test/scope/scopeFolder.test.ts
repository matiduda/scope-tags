import { TEST_DATA_FOLDER } from "../utils/globals";
import { createFolder } from "../utils/utils";
import { ensureScopeFolderExists, scopeFolderExists } from "../../src/FileSystem/fileSystemUtils";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

describe("Finding .scope folder", () => {
  it("Does not find .scope folder when there is none", () => {
    const SCOPE_FOLDER_PATH = createFolder(TEST_DATA_FOLDER);
    expect(scopeFolderExists(SCOPE_FOLDER_PATH)).toBe(false);
  });

  it("Does find .scope folder where when is one", () => {
    const SCOPE_FOLDER_PATH = createFolder(TEST_DATA_FOLDER);

    const scopeFolderPath = join(SCOPE_FOLDER_PATH, ".scope");

    mkdirSync(scopeFolderPath);

    expect(scopeFolderExists(SCOPE_FOLDER_PATH)).toBe(true);
  });

  it("Creates .scope folder when there is none", () => {
    const SCOPE_FOLDER_PATH = createFolder(TEST_DATA_FOLDER);

    const expectedScopeFolderPath = join(SCOPE_FOLDER_PATH, ".scope");

    expect(scopeFolderExists(expectedScopeFolderPath)).toBe(false);

    ensureScopeFolderExists(SCOPE_FOLDER_PATH);

    expect(scopeFolderExists(SCOPE_FOLDER_PATH)).toBe(true);
    expect(existsSync(expectedScopeFolderPath)).toBe(true);
  });
});
