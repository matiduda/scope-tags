import fs from "fs";
import path from "path";

export function scopeFolderExists(root: string): boolean {
	const scopeFolderPath = path.join(root, ".scope");
	return fs.existsSync(scopeFolderPath);
}

export function ensureScopeFolderExists(root: string): string {
	const scopeFolderPath = path.join(root, ".scope");

	if (!fs.existsSync(scopeFolderPath)) {
		fs.mkdirSync(scopeFolderPath);
	}
	return scopeFolderPath;
}

export function findTsConfigRecursively(): string { // Unused
	let currentDir = __dirname;

	while (!fs.existsSync(path.join(currentDir, "tsconfig.json"))) {
		currentDir = path.join(currentDir, "..");

		if (path.resolve(currentDir) === "/") {
			throw new Error("Could not locate tsconfig.json");
		}
	}
	return currentDir;
}