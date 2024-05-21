export class Utils {
    public static replaceAll(str: string, find: string, replace: string) {
        return str.replace(new RegExp(find, 'g'), replace);
    }

    public static getEnumKeyByEnumValue(enumObj: any, value: any) {
        return Object.keys(enumObj).find(x => enumObj[x] === value);
    }

    public static getScriptVersion(): string {
        return require('../package.json').version;
    }
}