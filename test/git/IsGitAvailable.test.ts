import { Clone, Repository } from "nodegit";
import { resolve } from "path";
import rimraf from "rimraf";

beforeAll(() => {
    rimraf.sync(resolve('test/tmp/'));
});

afterAll(() => {
    rimraf.sync(resolve('test/tmp/'));
});

describe("Git integration", () => {
    jest.setTimeout(60000);

    it("downloads and reads a Git repository", async () => {
        const repoPath = resolve('test/tmp/nodegit');

        await Clone.clone("https://github.com/nodegit/nodegit", repoPath);
        const message = (await (await Repository.open(repoPath)).getCommit("59b20b8d5c6ff8d09518454d4dd8b7b30f095ab5")).message();
        expect(message).toMatch("Updated gitignore and raw-commit test");
    });
});


