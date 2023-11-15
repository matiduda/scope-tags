import { Repository } from "nodegit";
import { resolve } from "path";
import { mkdirSync } from "fs";
import rimraf from "rimraf";
const execSync = require('child_process').execSync;

const testRepositoryPath = resolve("./tmp/testRepository");

beforeEach(() => {
  rimraf.sync(resolve('./tmp'));
  mkdirSync(testRepositoryPath, { recursive: true });
});

afterAll(() => {
  rimraf.sync(resolve('./tmp'));
});

describe("Finding Git repository", () => {
  it("Does not find repository when there is none", async () => {
    await expect(Repository.open(testRepositoryPath)).rejects.toThrow();
  });

  it("Correctly finds repository root path", async () => {
    execSync("git init", { cwd: testRepositoryPath });
    await expect(Repository.open(testRepositoryPath)).resolves.toBeDefined();
  });
});


