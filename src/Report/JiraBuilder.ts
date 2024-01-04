
import { expand, table, tableHeader, tableRow, p, doc, nestedExpand } from '@atlaskit/adf-utils/builders';
import { TableRowDefinition, NestedExpandDefinition } from '@atlaskit/adf-schema';


export type ReportTableRow = {
    affectedTags: Array<string>,
    lines: {
        added: number,
        removed: number
    },
    referencedTags: Array<{
        module: string,
        tags: Array<string>
    }>
};

export class JiraBuilder {
    public constructor() { }

    public parseReport(entries: Array<ReportTableRow>, date: Date, printToConsole = false): string {

        const expandTable = expand(
            { title: `Scope tag report | ${date.toLocaleString()}` },
        )(
            table(
                this._getHeaderRow(),
                ...entries.map(entry => this._getEntryRow(entry)),
            )
        );

        const adfDocument = doc(expandTable);

        this.debugPrintADF(adfDocument);

        const jsonReply = JSON.stringify(expandTable)

        return `{adf:display=block}${jsonReply}{adf}`;
    }

    private _getEntryRow(entry: ReportTableRow): any {
        return tableRow([
            tableHeader({})(p(entry.affectedTags.join('\n'))),
            tableHeader({})(p(`++ ${entry.lines.added}\n-- ${entry.lines.removed}`)),
            tableHeader({})(...this._referencedTagsAsNestedExpands(entry.referencedTags)),
        ]);
    }

    private _referencedTagsAsNestedExpands(referencedTags: { module: string; tags: string[]; }[]): NestedExpandDefinition[] {
        return referencedTags.map(referenced => {
            return nestedExpand({ title: referenced.module })(
                p(referenced.tags.join('\n'))
            );
        })
    }

    private _getHeaderRow(): TableRowDefinition {
        const headers = [
            "Affected tags",
            "Lines",
            "Referenced tags",
        ];
        return tableRow(headers.map(header => tableHeader()(p(header))));
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