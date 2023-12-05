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

export function getExtension(filePath: string): string {
	return path.extname(filePath);
}

export function getFileBaseName(filePath: string): string {
	return path.basename(filePath);
}

export function fileExists(filePath: string): boolean {
	return fs.existsSync(filePath);
}

export function isDirectory(filePath: string): boolean {
	if (!fileExists(filePath)) {
		throw new Error(`File '${filePath}' does not exist`);
	}
	return fs.lstatSync(filePath).isDirectory()
}

export function normalizePath(filePath: string, relative?: string) {
	if (relative) {
		filePath = path.relative(relative, filePath);
	}
	const definitelyPosix = filePath.split(path.sep).join(path.posix.sep);
	return definitelyPosix;
}

export function getAllFilesFromDirectory(directoryPath: string): Array<string> {
	if (!isDirectory(directoryPath)) {
		throw new Error(`Directory '${directoryPath} is a file'`);
	}

	return fs.readdirSync(directoryPath)
		.map(file => normalizePath(path.join(directoryPath, file)))
		.filter(file => !isDirectory(file));
}