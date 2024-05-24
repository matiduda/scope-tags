import { formatDate } from "./TimeUtils";
import { expand, table, doc, tableRow, tableHeader, p, strong, text, link, nestedExpand } from "./AdfUtils";
import { ReferencedFileInfo } from "../References/IReferenceFinder";
import { TagIdentifier } from "../Scope/FileTagsDatabase";
import { FileInfo } from "./ReportGenerator";
import { Relevancy } from "../Relevancy/Relevancy";
import { getScriptVersion } from "../scope";

export type TagIdentifierWithRelevancy = TagIdentifier & {
    relevancy: Relevancy;
}

export type TagInfo = {
    tag: string,
    modules: Array<string>,
    relevancy: Relevancy,
}

export type ModuleInfo = {
    module: string,
    tags: Array<string>,
    relevancy: Relevancy,
}

export type LinesInfo = {
    added: number,
    removed: number
}

export type ReportTableRow = {
    affectedTags: Array<TagIdentifierWithRelevancy>,
    lines: LinesInfo
    uniqueModules: Array<ModuleInfo>,
    referencedTags: Array<TagInfo>,
    untaggedReferences: Array<ReferencedFileInfo>,
    unusedReferences: Array<ReferencedFileInfo>,
};

export type UntaggedFilesTableRow = {
    affectedFiles: Array<FileInfo>,
    lines: LinesInfo
    uniqueModules: Array<ModuleInfo>,
    referencedTags: Array<TagInfo>,
    untaggedReferences: Array<ReferencedFileInfo>,
    unusedReferences: Array<ReferencedFileInfo>,
}

export class JiraBuilder {
    public constructor() { }

    public parseReport(
        entries: Array<ReportTableRow>,
        untaggedFilesRow: UntaggedFilesTableRow,
        date: Date,
        projectName: string,
        buildTag: string,
        printToConsole = false,
        logURL?: string,
    ): {
        adfDocument: string,
        comment: string
    } {
        let tableTitle = `'${projectName}' scope tags v${getScriptVersion()} │ ${formatDate(date, "Europe/Warsaw")}`;
        tableTitle += buildTag ? ` │ ${buildTag}` : "";

        let reportTable = {
            ...table(
                this._getHeaderRow(),
                ...entries.map(entry => this._getEntryRow(entry)),
                ...this._getUntaggedFilesRow(untaggedFilesRow),
            ),
            ...{ attrs: { layout: "full-width" } }
        };

        const expandContent = logURL ? [reportTable, this._createLink(logURL, "Go to build logs")] : [reportTable];

        const expandTable = expand(
            { title: tableTitle },
        )(
            ...expandContent
        );

        const adfDocument = doc(expandTable);

        if (printToConsole) {
            this.debugPrintADF(adfDocument);
        }

        return {
            adfDocument: JSON.stringify(adfDocument),
            comment: JSON.stringify(expandTable)
        }
    }

    private _getHeaderRow(): any {
        const headers = [
            { name: "Affected tags" },
            { name: "Lines", width: 20 },
            { name: "Used by module" },
            { name: "Used by tags" },
        ];
        return tableRow(headers.map(header => {
            return header.width
                ? tableHeader({ colwidth: [header.width] })(p(strong(header.name)))
                : tableHeader()(p(strong(header.name)))
        }));
    }

    private _getEntryRow(entry: ReportTableRow): any {
        return tableRow([
            tableHeader({})(p(this._formatAffectedTags(entry.affectedTags))),
            tableHeader({})(p(this._formatLinesAddedRemoved(entry.lines))),
            tableHeader({})(
                ...this._referencedModulesAsNestedExpands(entry.uniqueModules),
                ...this._untaggedReferencesAsNextedExpand(entry.untaggedReferences)
            ),
            tableHeader({})(...this._referencedTagsAsNestedExpands(entry.referencedTags, entry.unusedReferences)),
        ]);
    }

    private _formatAffectedTags(affectedTags: TagIdentifierWithRelevancy[]): any {
        return affectedTags.map(tag => `${tag.module} / ${tag.tag}`).join('\n');
    }

    private _formatLinesAddedRemoved(lines: LinesInfo): string {
        if (lines.added === 0 && lines.removed) {
            return "-"
        } else if (lines.removed === 0) {
            return `++ ${lines.added}`;
        } else if (lines.added === 0) {
            return `-- ${lines.removed}`;
        }
        return `++ ${lines.added}\n-- ${lines.removed}`;
    }

    private _getUntaggedFilesRow(entry: UntaggedFilesTableRow): any[] {
        if (!entry.affectedFiles.length) {
            return [];
        }

        return [tableRow([
            tableHeader({})(this._getFileListAsNestedExpand(entry.affectedFiles)),
            tableHeader({})(p(`++ ${entry.lines.added}\n-- ${entry.lines.removed}`)),
            tableHeader({})(
                ...this._referencedModulesAsNestedExpands(entry.uniqueModules),
                ...this._untaggedReferencesAsNextedExpand(entry.untaggedReferences)
            ),
            tableHeader({})(...this._referencedTagsAsNestedExpands(entry.referencedTags, entry.unusedReferences)),
        ])];
    }

    private _untaggedReferencesAsNextedExpand(untaggedReferences: ReferencedFileInfo[]): any[] {
        if (!untaggedReferences.length) {
            return [];
        }

        const referencesWithHighRelevancy = untaggedReferences.filter(reference => reference.relevancy === Relevancy.HIGH);
        const referencesWithOtherThanHighRelevancy = untaggedReferences.filter(reference => reference.relevancy !== Relevancy.HIGH);

        let title = `${untaggedReferences.length} untagged file`;

        if (untaggedReferences.length > 1) {
            title += "s";
        }

        let content: string = referencesWithHighRelevancy
            .map(reference => reference.unused ? `${reference.filename} (unused)` : reference.filename)
            .join("\n");

        if (referencesWithOtherThanHighRelevancy.length) {
            content += `\n${referencesWithOtherThanHighRelevancy.length} references hidden by low relevancy`;
        }

        // Careful, nestedExpand cannot be empty inside
        return [nestedExpand({ title: title })(
            p(content)
        )];
    }

    // Practically the same as above
    private _getFileListAsNestedExpand(files: FileInfo[]) {
        if (!files.length) {
            return [];
        }

        let title = `${files.length} untagged file`;

        if (files.length > 1) {
            title += "s";
        }

        // Careful, nestedExpand cannot be empty inside
        return nestedExpand({ title: title })(
            p(files
                .map(file => file.file)
                .join("\n")
            )
        );
    }

    private _referencedModulesAsNestedExpands(
        uniqueModules: ModuleInfo[],
    ): any[] {
        if (!uniqueModules.length) {
            return [p("-")];
        }

        // Check for Relevancy
        const referencesWithHighRelevancy = uniqueModules.filter(uniqueModule => uniqueModule.relevancy === Relevancy.HIGH);
        const referencesWithOtherThanHighRelevancy = uniqueModules.filter(uniqueModule => uniqueModule.relevancy !== Relevancy.HIGH);

        const cellContent: any[] = [];

        referencesWithHighRelevancy.forEach(uniqueModule => {
            const content: string = uniqueModule.tags.length > 0
                ? uniqueModule.tags.join("\n")
                : "No tags";

            // Careful, nestedExpand cannot be empty inside
            cellContent.push(
                nestedExpand({ title: uniqueModule.module })(
                    p(content)
                )
            );
        });

        if (referencesWithOtherThanHighRelevancy.length > 0) {
            cellContent.push(
                p(`${referencesWithOtherThanHighRelevancy.length} modules hidden by low relevancy`)
            );
        }

        return cellContent;
    }

    private _referencedTagsAsNestedExpands(
        referencedTags: TagInfo[],
        unusedReferences: Array<ReferencedFileInfo>
    ): any[] {
        if (!referencedTags.length && !unusedReferences.length) {
            return [p("-")];
        }

        // Check for Relevancy
        const referencesWithHighRelevancy = referencedTags.filter(referencedTag => referencedTag.relevancy === Relevancy.HIGH);
        const referencesWithOtherThanHighRelevancy = referencedTags.filter(referencedTag => referencedTag.relevancy !== Relevancy.HIGH);

        const cellContent: any[] = [];

        referencesWithHighRelevancy.forEach(uniqueTag => {
            const content: string = uniqueTag.modules.length > 0
                ? uniqueTag.modules.join("\n")
                : "No modules";

            // Careful, nestedExpand cannot be empty inside
            cellContent.push(
                nestedExpand({ title: uniqueTag.tag })(
                    p(content)
                )
            );
        });

        if (referencesWithOtherThanHighRelevancy.length > 0) {
            cellContent.push(
                p(`${referencesWithOtherThanHighRelevancy.length} tags hidden by low relevancy`)
            );
        }

        return cellContent;
    }

    private _createLink(url: string, description: string) {
        const adfText = text(description);

        const adfLink = link({
            href: url,
            title: description
        })(adfText);

        return p(adfLink);
    }

    // Enables to paste the generated ADF to the online viewer
    public debugPrintADF(document: any) {
        console.log(`
        ${JSON.stringify(document)}
        ―――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――
        To see the generated output paste the code above line to the online viewer:

        https://atlaskit.atlassian.com/examples.html?groupId=editor&packageId=renderer&exampleId=dac-viewer
        `);
    }
}