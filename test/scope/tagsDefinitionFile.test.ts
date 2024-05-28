import { cloneMockRepositoryToFolder, makeUniqueFolderForTest } from "../utils/utils";
import { join } from "path";
import { TagsDatabaseType, TagsDefinitionFile } from "../../src/Scope/TagsDefinitionFile";
import { JSONFile } from "../../src/FileSystem/JSONFile";

describe("Tags definition file", () => {
  it("When encountered detached tags, it adds them back on the next save", () => {
    const FOLDER_PATH = makeUniqueFolderForTest();
    const REPO_PATH = cloneMockRepositoryToFolder(FOLDER_PATH);

    const tagsDatabase: TagsDefinitionFile = new TagsDefinitionFile(REPO_PATH);

    tagsDatabase.load();

    const database = (tagsDatabase as any)._tagsDatabaseData as TagsDatabaseType;

    expect(database).toBeDefined();
    expect(database.modules).toBeDefined();
    expect(database.modules[0]).toBeDefined();
    expect(database.tags).toBeDefined();

    // Add some random tag manually

    const TEST_TAG_NAME_1 = "_test_tag_name_1_";

    database.modules[0].tags.push(TEST_TAG_NAME_1);

    tagsDatabase.save();

    // Load and check if the tag is automatically re-created after save

    const tagsDatabaseAfterSave: TagsDefinitionFile = new TagsDefinitionFile(REPO_PATH);

    tagsDatabaseAfterSave.load();

    const databaseAfterSave = (tagsDatabase as any)._tagsDatabaseData as TagsDatabaseType;

    expect(databaseAfterSave).toBeDefined();
    expect(databaseAfterSave.modules).toBeDefined();
    expect(databaseAfterSave.modules[0]).toBeDefined();
    expect(databaseAfterSave.modules[0].tags.includes(TEST_TAG_NAME_1)).toBe(true);
    expect(databaseAfterSave.tags).toBeDefined();
    expect(databaseAfterSave.tags.some(tag => tag.name === TEST_TAG_NAME_1)).toBe(false);

    // Save another time

    tagsDatabaseAfterSave.save();

    // Load and check if the tag is automatically re-created after save

    const databaseAfterThirdSave: TagsDatabaseType = JSONFile.loadFrom<TagsDatabaseType>(join(REPO_PATH, TagsDefinitionFile.PATH));

    expect(databaseAfterThirdSave).toBeDefined();
    expect(databaseAfterThirdSave.modules).toBeDefined();
    expect(databaseAfterThirdSave.modules[0]).toBeDefined();
    expect(databaseAfterThirdSave.modules[0].tags.includes(TEST_TAG_NAME_1)).toBe(true);
    expect(databaseAfterThirdSave.tags).toBeDefined();
    expect(databaseAfterThirdSave.tags.some(tag => tag.name === TEST_TAG_NAME_1)).toBe(true);
  });
});
