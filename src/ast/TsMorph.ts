import { Project } from "ts-morph";
import { root } from "../scope";

const tsConfigPath = root + "tsconfig.json";

const project = new Project({ tsConfigFilePath: tsConfigPath });

project.getSourceFiles().forEach((sourceFile) => {
	console.log(sourceFile);

	// project.file
});
//