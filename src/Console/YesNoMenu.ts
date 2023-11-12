const { Confirm } = require('enquirer')

export class YesNoMenu {
    constructor() { }

    public async ask(question: string): Promise<boolean> {
        return new Confirm({
            name: question,
        }).run();
    }
}