import { Repository } from "nodegit";
import { TEST_DATA_FOLDER } from "../utils/globals";
import { createFolder } from "../utils/utils";
const execSync = require('child_process').execSync;

describe("nodegit is correctly initialized", () => {
  it("Does not find repository when there is none", async () => {
    const FOLDER = createFolder(TEST_DATA_FOLDER);
    await expect(Repository.open(FOLDER)).rejects.toThrow();
  });

  it("Correctly finds repository root path", async () => {
    const FOLDER = createFolder(TEST_DATA_FOLDER);
    execSync("git init", { cwd: FOLDER });
    await expect(Repository.open(FOLDER)).resolves.toBeDefined();
  });
});


