import fs from "fs";

export class JSONFile {
    public static loadFrom<T>(path: string): T {
        if (!fs.existsSync(path)) {
            throw new Error("File not found at: " + path);
        }

        try {
            return JSON.parse(fs.readFileSync(path, { encoding: "utf8" }));
        } catch (e) {
            throw new Error(`Error while reading file, reason: ${e}`)
        }

        // TODO: Add typecheck?
    }

    public static niceWrite<T>(path: string, value: T, replacer?: (json: string) => string) {
        const stringifiedValue = replacer
            ? replacer(JSON.stringify(value, null, 4))
            : JSON.stringify(value, null, 4);

        fs.writeFileSync(
            path,
            stringifiedValue,
            { encoding: "utf8", flag: "w" }
        );
    }
}