import { scopeFolderExists, ensureScopeFolderExists } from "../../src/FileSystem/fileSystemUtils"
import { resolve, join } from "path";
import { mkdirSync, rmdirSync, existsSync, appendFile, readFile, unlinkSync } from "fs";
import rimraf from "rimraf";

const testFolderPath = resolve("./tmp/");
const scopeFolderPath = join(testFolderPath, ".scope");

beforeEach(() => {
  rimraf.sync(resolve('./tmp'));
  mkdirSync(testFolderPath, { recursive: true });
});

afterAll(() => {
  rimraf.sync(resolve('./tmp'));
});

const purgeScopeFolder = () => {
  rmdirSync(scopeFolderPath);
  expect(existsSync(scopeFolderPath)).toBe(false);
}

describe("Finding .scope folder", () => {
  it("Does not find .scope folder when there is none", () => {
    expect(scopeFolderExists(testFolderPath)).toBe(false);
  });

  it("Does find .scope folder where when is one", () => {
    mkdirSync(scopeFolderPath);
    expect(scopeFolderExists(testFolderPath)).toBe(true);
    purgeScopeFolder();
  });

  it("Creates .scope folder when there is none", () => {
    ensureScopeFolderExists(testFolderPath);
    expect(existsSync(scopeFolderPath)).toBe(true);
    purgeScopeFolder();
  });

  it("Does not touch .scope folder when there is one", () => {
    mkdirSync(scopeFolderPath);

    const testFile = join(scopeFolderPath, "mynewfile1.txt")

    appendFile(testFile, "Hello content!", function (err) {
      if (err) throw err;
    });

    ensureScopeFolderExists(testFolderPath);

    readFile(testFile, function (err, data) {
      if (err) {
        throw err;
      }
      expect(data.toString()).toBe("Hello content!");
    });

    expect(existsSync(scopeFolderPath)).toBe(true);
    unlinkSync(testFile);
    purgeScopeFolder();
  });
});
