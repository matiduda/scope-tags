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