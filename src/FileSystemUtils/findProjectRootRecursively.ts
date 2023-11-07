import fs from "fs";
import path from "path";

export function findTsConfigRecursively(): string {
	let currentDir = __dirname;
	
	while (!fs.existsSync(path.join(currentDir, "tsconfig.json"))) {
		currentDir = path.join(currentDir, "..");
		
		if(path.resolve(currentDir) === "/") {
			throw new Error("Could not locate tsconfig.json");
		}
	}
	
	return currentDir;
}