import { cloneMockRepositoryToFolder, commitModitication, makeUniqueFolderForTest } from "../utils/utils";
import { GitRepository } from "../../src/Git/GitRepository";
import { ConfigFile } from "../../src/Scope/ConfigFile";
import { FileTagsDatabase } from "../../src/Scope/FileTagsDatabase";
import { TagsDefinitionFile } from "../../src/Scope/TagsDefinitionFile";
import { TSReferenceFinder } from "../../src/References/TSReferenceFinder";
import { ReportGenerator } from "../../src/Report/ReportGenerator";
import { RelevancyManager } from "../../src/Relevancy/RelevancyManager";
import { Relevancy } from "../../src/Relevancy/Relevancy";

// Testing only ReportGenerator class, which is responsible for gathering data for each commit

const PRINT_DEBUG_INFO = false;

const initReportGenerator = (root: string) => {

    const repository = new GitRepository(root);
    const config = new ConfigFile(root);
    const database = new FileTagsDatabase(root);
    const tags = new TagsDefinitionFile(root);
    const tsReferenceFinder = new TSReferenceFinder(root, "/tsconfig.json");

    config.load();
    database.load();
    tags.load();

    return new ReportGenerator(repository, tags, database, config, [tsReferenceFinder], PRINT_DEBUG_INFO);
}


describe("Report generation works as expected", async () => {
    it("After making a change in a tagged file, the change is correctly described by generated report", async () => {
        const FOLDER_PATH = makeUniqueFolderForTest();
        const REPO_PATH = cloneMockRepositoryToFolder(FOLDER_PATH);

        const testFile = "src/tagged-file.js";

        const repository = await commitModitication([testFile], REPO_PATH);

        const unpushedCommits = await repository.getUnpushedCommits();
        expect(unpushedCommits.length).toBe(1);

        const commit = unpushedCommits[0];

        const generator = initReportGenerator(REPO_PATH);

        const relevancy = new RelevancyManager();
        const relevancyMap = relevancy.loadRelevancyMapFromCommits([commit]);

        const report = await generator.generateReportForCommit(commit, "Project", relevancyMap, true);

        expect(report).toBeDefined();

        // src/tagged-file.js has 1 tag -> Default module / Tag

        expect(report.allModules.length).toBe(1);
        expect(report.untaggedFilesAsModule.files.length).toBe(0);

        const foundModule = report.allModules[0];

        expect(foundModule.module).toBe("Default module");
        expect(foundModule.files.length).toBe(1);

        const fileInfo = foundModule.files[0];

        expect(fileInfo.file).toBe(testFile);
        expect(fileInfo.tagIdentifiers.length).toBe(1);
        expect(fileInfo.tagIdentifiers[0].module).toBe("Default module");
        expect(fileInfo.tagIdentifiers[0].tag).toBe("Tag");
    });

    it("After making a change with only ignored files, the report does not contain any data", async () => {
        const FOLDER_PATH = makeUniqueFolderForTest();
        const REPO_PATH = cloneMockRepositoryToFolder(FOLDER_PATH);

        const ignoredFiles = [
            "src/file-ignored-by-database.js",
            "assets/image.jpg",
            "assets/newimage.jpg",
        ];


        const repository = await commitModitication(ignoredFiles, REPO_PATH);

        const unpushedCommits = await repository.getUnpushedCommits();
        expect(unpushedCommits.length).toBe(1);

        const commit = unpushedCommits[0];

        const generator = initReportGenerator(REPO_PATH);

        const relevancy = new RelevancyManager();
        const relevancyMap = relevancy.loadRelevancyMapFromCommits([commit]);

        const report = await generator.generateReportForCommit(commit, "Project", relevancyMap, true);

        expect(report).toBeDefined();
        expect(report.allModules.length).toBe(0);
        expect(report.untaggedFilesAsModule.files.length).toBe(0);
    });

    it("After making a change in an untagged file, the change is visible in untagged module", async () => {
        const FOLDER_PATH = makeUniqueFolderForTest();
        const REPO_PATH = cloneMockRepositoryToFolder(FOLDER_PATH);

        const testFileCount = 20;
        const testFiles: string[] = [];

        for (let i = 0; i < testFileCount; i++) {
            testFiles.push(`src/test-file-${i}`);
        }

        const repository = await commitModitication(testFiles, REPO_PATH);

        const unpushedCommits = await repository.getUnpushedCommits();
        expect(unpushedCommits.length).toBe(1);

        const commit = unpushedCommits[0];

        const generator = initReportGenerator(REPO_PATH);

        const relevancy = new RelevancyManager();
        const relevancyMap = relevancy.loadRelevancyMapFromCommits([commit]);

        const report = await generator.generateReportForCommit(commit, "Project", relevancyMap, true);

        expect(report).toBeDefined();

        expect(report.allModules.length).toBe(0);

        expect(report.untaggedFilesAsModule.files.length).toBe(testFileCount);

        testFiles.forEach(file => {
            expect(report.untaggedFilesAsModule.files.some(moduleFile => moduleFile.file === file)).toBe(true);
        });
    });

    it("Correctly separates tagged and untagged files in the report", async () => {
        const FOLDER_PATH = makeUniqueFolderForTest();
        const REPO_PATH = cloneMockRepositoryToFolder(FOLDER_PATH);

        const files = ["src/tagged-file.js", "src/untagged-file.js"];
        const repository = await commitModitication(files, REPO_PATH);

        const unpushedCommits = await repository.getUnpushedCommits();
        expect(unpushedCommits.length).toBe(1);

        const commit = unpushedCommits[0];

        const generator = initReportGenerator(REPO_PATH);

        const relevancy = new RelevancyManager();
        const relevancyMap = relevancy.loadRelevancyMapFromCommits([commit]);

        const report = await generator.generateReportForCommit(commit, "Project", relevancyMap, true);

        expect(report).toBeDefined();
        expect(report.allModules.length).toBe(1);

        const taggedModule = report.allModules[0];
        expect(taggedModule.files.length).toBe(1);
        expect(taggedModule.files[0].file).toBe("src/tagged-file.js");

        expect(report.untaggedFilesAsModule.files.length).toBe(1);
        expect(report.untaggedFilesAsModule.files[0].file).toBe("src/untagged-file.js");
    });

    it("After making a change in tagged and untagged, their references are correctly reported", async () => {
        const FOLDER_PATH = makeUniqueFolderForTest();
        const REPO_PATH = cloneMockRepositoryToFolder(FOLDER_PATH);

        /**
         * File structure description
         *  
         * src/
         * ├─ ts/
         * │  ├─ controllers/
         * │  │  ├─ Controller.ts   3 dependencies: View.ts and Model.ts,       1 tag: Controllers / AController
         * │  ├─ models/
         * │  │  ├─ Model.ts        1 dependency: View.ts,                      1 tag: Models / AModel
         * │  ├─ views/
         * │  │  ├─ View.ts         1 dependency: ModalWindow.ts,               1 tag: Views / AView
         * │  │  ├─ ModalWindow.ts  No dependencies,                            no tags
         */

        const filesToModify = [
            "src/ts/controllers/Controller.ts",
            "src/ts/models/Model.ts",
            "src/ts/views/View.ts",
            "src/ts/views/ModalWindow.ts",
        ];

        const repository = await commitModitication(filesToModify, REPO_PATH);

        const unpushedCommits = await repository.getUnpushedCommits();
        expect(unpushedCommits.length).toBe(1);

        const commit = unpushedCommits[0];

        const generator = initReportGenerator(REPO_PATH);

        const relevancy = new RelevancyManager();
        const relevancyMap = relevancy.loadRelevancyMapFromCommits([commit]);

        const report = await generator.generateReportForCommit(commit, "Project", relevancyMap, true);

        expect(report).toBeDefined();

        expect(report.allModules.length).toBe(3);

        const controllerModule = report.allModules.find(reportModule => reportModule.module === "Controllers");
        const viewsModule = report.allModules.find(reportModule => reportModule.module === "Views");
        const modelsModule = report.allModules.find(reportModule => reportModule.module === "Models");

        expect(controllerModule).toBeDefined();
        expect(viewsModule).toBeDefined();
        expect(modelsModule).toBeDefined();

        if (!controllerModule || !viewsModule || !modelsModule) {
            return;
        }

        expect(controllerModule.files.length).toBe(1);
        expect(viewsModule.files.length).toBe(1);
        expect(modelsModule.files.length).toBe(1);

        // Controller.ts checks
        const controllerFileInfo = controllerModule.files[0];

        expect(controllerFileInfo.file).toBe("src/ts/controllers/Controller.ts");
        expect(controllerFileInfo.ignored).toBe(false);
        expect(controllerFileInfo.tagIdentifiers.length).toBeGreaterThan(0);
        expect(controllerFileInfo.tagIdentifiers.some(identifier => identifier.module === "Controllers" && identifier.tag === "AController")).toBe(true);
        expect(controllerFileInfo.usedIn.length).toBe(0);

        // Model.ts checks
        const modelsFileInfo = modelsModule.files[0];

        expect(modelsFileInfo.file).toBe("src/ts/models/Model.ts");
        expect(modelsFileInfo.ignored).toBe(false);
        expect(modelsFileInfo.tagIdentifiers.length).toBeGreaterThan(0);
        expect(modelsFileInfo.tagIdentifiers.some(identifier => identifier.module === "Models" && identifier.tag === "AModel")).toBe(true);

        expect(modelsFileInfo.usedIn.length).toBe(1);
        expect(modelsFileInfo.usedIn[0].fileInfo.filename).toBe("src/ts/controllers/Controller.ts");
        expect(modelsFileInfo.usedIn[0].fileInfo.unused).toBe(false);

        // View.ts checks
        const viewFileInfo = viewsModule.files[0];

        expect(viewFileInfo.file).toBe("src/ts/views/View.ts");
        expect(viewFileInfo.ignored).toBe(false);
        expect(viewFileInfo.tagIdentifiers.length).toBeGreaterThan(0);
        expect(viewFileInfo.tagIdentifiers.some(identifier => identifier.module === "Views" && identifier.tag === "AView")).toBe(true);

        expect(viewFileInfo.usedIn.length).toBe(2);

        const controllerDependency = viewFileInfo.usedIn.find(file => file.fileInfo.filename === "src/ts/controllers/Controller.ts");
        const modelDependency = viewFileInfo.usedIn.find(file => file.fileInfo.filename === "src/ts/models/Model.ts");

        expect(controllerDependency).toBeDefined();
        expect(modelDependency).toBeDefined();

        if (!controllerDependency || !modelDependency) {
            return;
        }

        expect(controllerDependency.fileInfo.filename).toBe("src/ts/controllers/Controller.ts");
        expect(controllerDependency.fileInfo.unused).toBe(false);

        expect(modelDependency.fileInfo.filename).toBe("src/ts/models/Model.ts");
        expect(modelDependency.fileInfo.unused).toBe(false);

        // Check if ModalWindow is marked as untagged
        expect(report.untaggedFilesAsModule.files.length).toBe(1);
        expect(report.untaggedFilesAsModule.files[0].file).toBe("src/ts/views/ModalWindow.ts");
        expect(report.untaggedFilesAsModule.files[0].ignored).toBe(false);
        expect(report.untaggedFilesAsModule.files[0].tagIdentifiers.length).toBe(0);

        expect(report.untaggedFilesAsModule.files[0].usedIn.length).toBe(1);

        const viewDependency = report.untaggedFilesAsModule.files[0].usedIn[0];

        expect(viewDependency.fileInfo.filename).toBe("src/ts/views/View.ts");
        expect(viewDependency.fileInfo.unused).toBe(false);
        expect(viewDependency.tagIdentifiers.some(identifier => identifier.module === "Views" && identifier.tag === "AView")).toBe(true);
    });

    it("Circular dependencies are reported correctly", async () => {
        const FOLDER_PATH = makeUniqueFolderForTest();
        const REPO_PATH = cloneMockRepositoryToFolder(FOLDER_PATH);

        /**
         * File structure description
         *  
         * src/
         * ├─ ts/
         * │  ├─ circularDependency/
         * │  │  ├─ ModuleA.ts   1 dependency: ModuleB.ts,       1 tag: Circular Dependency Test (Module A) / Module A
         * │  │  ├─ ModuleB.ts   1 dependency: ModuleA.ts,       1 tag: Circular Dependency Test (Module B) / Module B
         */

        const filesToModify = [
            "src/ts/circularDependency/ModuleA.ts",
            "src/ts/circularDependency/ModuleB.ts",
        ];

        const repository = await commitModitication(filesToModify, REPO_PATH);

        const unpushedCommits = await repository.getUnpushedCommits();
        expect(unpushedCommits.length).toBe(1);

        const commit = unpushedCommits[0];

        const generator = initReportGenerator(REPO_PATH);

        const relevancy = new RelevancyManager();
        const relevancyMap = relevancy.loadRelevancyMapFromCommits([commit]);

        const report = await generator.generateReportForCommit(commit, "Project", relevancyMap, true);

        expect(report).toBeDefined();

        expect(report.allModules.length).toBe(2);

        const circularTestModuleA = report.allModules.find(reportModule => reportModule.module === "Circular Dependency Test (Module A)");
        const circularTestModuleB = report.allModules.find(reportModule => reportModule.module === "Circular Dependency Test (Module B)");

        expect(circularTestModuleA).toBeDefined();
        expect(circularTestModuleB).toBeDefined();

        if (!circularTestModuleA || !circularTestModuleB) {
            return;
        }

        expect(circularTestModuleA.files.length).toBe(1);
        expect(circularTestModuleA.files[0].file).toBe("src/ts/circularDependency/ModuleA.ts");
        expect(circularTestModuleA.files[0].ignored).toBe(false);
        expect(circularTestModuleA.files[0].tagIdentifiers.length).toBe(1);
        expect(circularTestModuleA.files[0].tagIdentifiers.some(identifier => identifier.tag === "Module A" && identifier.module === "Circular Dependency Test (Module A)")).toBe(true);
        expect(circularTestModuleA.files[0].usedIn.length).toBe(1);
        expect(circularTestModuleA.files[0].usedIn[0].fileInfo.filename).toBe("src/ts/circularDependency/ModuleB.ts");
        expect(circularTestModuleA.files[0].usedIn[0].fileInfo.unused).toBe(false);

        expect(circularTestModuleB.files.length).toBe(1);
        expect(circularTestModuleB.files[0].file).toBe("src/ts/circularDependency/ModuleB.ts");
        expect(circularTestModuleB.files[0].ignored).toBe(false);
        expect(circularTestModuleB.files[0].tagIdentifiers.length).toBe(1);
        expect(circularTestModuleB.files[0].tagIdentifiers.some(identifier => identifier.tag === "Module B" && identifier.module === "Circular Dependency Test (Module B)")).toBe(true);
        expect(circularTestModuleB.files[0].usedIn.length).toBe(1);
        expect(circularTestModuleB.files[0].usedIn[0].fileInfo.filename).toBe("src/ts/circularDependency/ModuleA.ts");
        expect(circularTestModuleB.files[0].usedIn[0].fileInfo.unused).toBe(false);

        // Same for module B
    });

    it("Correctly reports files with multiple tags", async () => {

        const FOLDER_PATH = makeUniqueFolderForTest();
        const REPO_PATH = cloneMockRepositoryToFolder(FOLDER_PATH);

        /**
            Has following tags:
            - Default module / Second
            - Default module / Tag
            - Default module 2 / Tag of default module 2
         */

        const fileToModify = "src/tagged-file-with-multiple-modules.js";

        const repository = await commitModitication([fileToModify], REPO_PATH);

        const unpushedCommits = await repository.getUnpushedCommits();
        expect(unpushedCommits.length).toBe(1);

        const commit = unpushedCommits[0];

        const generator = initReportGenerator(REPO_PATH);

        const relevancy = new RelevancyManager();
        const relevancyMap = relevancy.loadRelevancyMapFromCommits([commit]);

        const report = await generator.generateReportForCommit(commit, "Project", relevancyMap, true);

        expect(report).toBeDefined();
        expect(report.allModules.length).toBe(2);
        expect(report.untaggedFilesAsModule.files.length).toBe(0);

        const defaultModule = report.allModules.find(reportModule => reportModule.module === "Default module");
        const defaultModule2 = report.allModules.find(reportModule => reportModule.module === "Default module 2");

        expect(defaultModule).toBeDefined();
        expect(defaultModule2).toBeDefined();

        if (!defaultModule || !defaultModule2) {
            return;
        }

        expect(defaultModule.files.length).toBe(1);
        expect(defaultModule.files[0].file).toBe("src/tagged-file-with-multiple-modules.js");
        expect(defaultModule.files[0].ignored).toBe(false);
        expect(defaultModule.files[0].usedIn.length).toBe(0);
        // 3, because same FileInfo is shared between modules
        expect(defaultModule.files[0].tagIdentifiers.length).toBe(3);
        expect(defaultModule.files[0].tagIdentifiers.some(identifier => identifier.tag === "Tag" && identifier.module === "Default module")).toBe(true);
        expect(defaultModule.files[0].tagIdentifiers.some(identifier => identifier.tag === "Second" && identifier.module === "Default module")).toBe(true);

        expect(defaultModule2.files.length).toBe(1);
        expect(defaultModule2.files[0].file).toBe("src/tagged-file-with-multiple-modules.js");
        expect(defaultModule2.files[0].ignored).toBe(false);
        expect(defaultModule2.files[0].usedIn.length).toBe(0);
        // 3, because same FileInfo is shared between modules
        expect(defaultModule2.files[0].tagIdentifiers.length).toBe(3);
        expect(defaultModule2.files[0].tagIdentifiers.some(identifier => identifier.tag === "Tag of default module 2" && identifier.module === "Default module 2")).toBe(true);
    });

    it("After making a change with defined relevancy, the relevancy is present in generated report", async () => {
        const FOLDER_PATH = makeUniqueFolderForTest();
        const REPO_PATH = cloneMockRepositoryToFolder(FOLDER_PATH);

        const repository = await commitModitication(
            [
                "src/tagged-file.js",
                "src/untagged-file.js"
            ],
            REPO_PATH,
            `Automatic commit

    __relevancy__[{"path":"src/tagged-file.js","relevancy":"HIGH","commit":"__current__"},{"path":"src/untagged-file.js","relevancy":"LOW","commit":"__current__"}]__relevancy__
    `);

        const unpushedCommits = await repository.getUnpushedCommits();
        expect(unpushedCommits.length).toBe(1);

        const commit = unpushedCommits[0];

        const generator = initReportGenerator(REPO_PATH);

        const relevancy = new RelevancyManager();
        const relevancyMap = relevancy.loadRelevancyMapFromCommits([commit]);

        const report = await generator.generateReportForCommit(commit, "Project", relevancyMap, true);

        expect(report).toBeDefined();
        expect(report.allModules.length).toBe(1);

        const taggedModule = report.allModules[0];
        expect(taggedModule.files.length).toBe(1);
        expect(taggedModule.files[0].file).toBe("src/tagged-file.js");
        expect(taggedModule.files[0].relevancy).toBe(Relevancy.HIGH);

        expect(report.untaggedFilesAsModule.files.length).toBe(1);
        expect(report.untaggedFilesAsModule.files[0].file).toBe("src/untagged-file.js");
        expect(report.untaggedFilesAsModule.files[0].relevancy).toBe(Relevancy.LOW);
    });

});

