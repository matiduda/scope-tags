import { Repository } from "nodegit";
import { FileData } from "./Types";

export class GitRepository {

    private _repository: Repository;
    private _root: string;

    constructor(root: string) {
        this._root = root;
    }

    private async _getRepository(): Promise<Repository> {
        if (!this._repository) {
            this._repository = await Repository.open(this._root);
        }

        return this._repository;
    }

    public async getFileDataFromLastCommit(): Promise<FileData[]> {
        const repository = await this._getRepository();
        const mostRecentCommit = await repository.getHeadCommit();

        const commitDiffs = await mostRecentCommit.getDiff();

        return new Promise<FileData[]>(async (resolve, reject) => {

            const fileDataArray: FileData[] = [];

            for (const diff of commitDiffs) {
                const diffPatches = await diff.patches();

                for (const patch of diffPatches) {
                    const fileData: FileData = {
                        oldPath: patch.oldFile().path(),
                        newPath: patch.newFile().path(),
                        change: patch.status(),
                    };
                    fileDataArray.push(fileData);
                }
            }
            resolve(fileDataArray);
        });
    }
}
