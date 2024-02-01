const htmlCreator = require("html-creator");

// Docs: https://github.com/Hargne/html-creator/wiki/API

type IssueInfo = {
    key: string,
}

export class HTMLCreator {
    private _html: any; // html-creator doesn't export types :/

    public constructor() {
        this._init();
    }

    public renderHTML() {
        return this._html.renderHTML();
    }

    private _init() {
        this._html = new htmlCreator([{
            type: "main",
            content: [{ type: 'div', content: 'I am in a boilerplate!' }]
        }]).withBoilerplate();

        this._html.document.addElementToType('head', {
            type: "link",
            attributes: {
                rel: "stylesheet",
                href: "https://unpkg.com/mvp.css"
            }
        });
    }

    public appendIssueInfo(issueInfo: IssueInfo) {

    }
}