const { Confirm } = require('enquirer')

export class YesNoMenu {
    constructor() { }

    public async ask(question: string, defaultOption = false, prefix?: string): Promise<boolean> {
        return new Confirm({
            name: question,
            default: defaultOption,
            ...(prefix ? { prefix: prefix } : {})
        }).run();
    }
}