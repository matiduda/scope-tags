import fs from "fs";
import path from "path";

export function findProjectRootRecursively(): string {
	let currentDir = __dirname;
	
	while (!fs.existsSync(path.join(currentDir, "tsconfig.json"))) {
		currentDir = path.join(currentDir, "..");
		
		if(path.resolve(currentDir) === "/") {
			console.error("Could not locate project root.");
			return "";
		}
	}
	
	return currentDir;
}