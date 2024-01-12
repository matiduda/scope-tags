import { expand, table, doc, tableRow, tableHeader, nestedExpand, p, strong } from "./AdfUtils";

export type TagInfo = {
    tag: string,
    modules: Array<string>
}

export type ModuleInfo = {
    module: string,
    count: number
}

export type LinesInfo = {
    added: number,
    removed: number
}

export type ReportTableRow = {
    affectedTags: Array<string>,
    lines: LinesInfo
    uniqueModules: Array<ModuleInfo>,
    referencedTags: Array<TagInfo>
};

export class JiraBuilder {
    public constructor() { }

    public parseReport(
        entries: Array<ReportTableRow>,
        date: Date,
        projectName: string,
        buildTag: string,
        printToConsole = false
    ): string {
        let tableTitle = `Scope tags '${projectName}' | ${date.toLocaleString()}`;
        tableTitle += buildTag ? ` | ${buildTag}` : "";

        let reportTable = {
            ...table(
                this._getHeaderRow(),
                ...entries.map(entry => this._getEntryRow(entry)),
            ),
            ...{ attrs: { layout: "full-width" } }
        };

        const expandTable = expand(
            { title: tableTitle },
        )(reportTable);

        const adfDocument = doc(expandTable);

        this.debugPrintADF(adfDocument);

        const jsonReply = JSON.stringify(expandTable)

        return `{adf:display=block}${jsonReply}{adf}`;
    }

    private _getHeaderRow(): any {
        const headers = [
            { name: "Affected tags", width: 50 },
            { name: "Lines", width: 20 },
            { name: "Referenced modules (+ count)" },
            { name: "Referenced tags (+ modules)" },
        ];
        return tableRow(headers.map(header => {
            return header.width
                ? tableHeader({ colwidth: [header.width] })(p(strong(header.name)))
                : tableHeader()(p(strong(header.name)))
        }));
    }

    private _getEntryRow(entry: ReportTableRow): any {
        return tableRow([
            tableHeader({})(p(entry.affectedTags.join('\n'))),
            tableHeader({})(p(`++ ${entry.lines.added}\n-- ${entry.lines.removed}`)),
            tableHeader({})(this._parseUniqueModules(entry.uniqueModules)),
            tableHeader({})(...this._referencedTagsAsNestedExpands(entry.referencedTags)),
        ]);
    }

    private _parseUniqueModules(uniqueModules: ModuleInfo[]) {
        return p(uniqueModules.map(unique => `(${unique.count}) ${unique.module}`).join('\n'));
    }

    private _referencedTagsAsNestedExpands(referencedTags: { tag: string; modules: string[]; }[]): any[] {
        return referencedTags.map(referenced => {
            return nestedExpand({ title: referenced.tag })(
                p(referenced.modules.join('\n'))
            );
        })
    }

    // Enables to paste the generated ADF to the online viewer
    public debugPrintADF(document: any) {
        console.log(`
        ${JSON.stringify(document)}
        ―――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――
        To see the generated output paste the code above line to the online viewer:

        https://developer.atlassian.com/cloud/jira/platform/apis/document/viewer/
        `);
    }
}