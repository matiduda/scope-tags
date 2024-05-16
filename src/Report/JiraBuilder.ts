import { formatDate } from "./TimeUtils";
import { expand, table, doc, tableRow, tableHeader, p, strong, text, link, nestedExpand } from "./AdfUtils";
import { getScriptVersion } from "../scope";
import { ReferencedFileInfo } from "../References/IReferenceFinder";
import { TagIdentifier } from "../Scope/FileTagsDatabase";
import { FileInfo } from "./ReportGenerator";
import { Relevancy } from "../Relevancy/Relevancy";

export type TagInfo = {
    tag: string,
    modules: Array<string>
}

export type ModuleInfo = {
    module: string,
    tags: Array<string>
}

export type LinesInfo = {
    added: number,
    removed: number
}

export type ReportTableRow = {
    affectedTags: Array<TagIdentifier>,
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
    ): string {
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

        const jsonReply = JSON.stringify(expandTable)

        return `{adf:display=block}${jsonReply}{adf}`;
    }

    private _getHeaderRow(): any {
        const headers = [
            { name: "Affected tags", width: 50 },
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
            tableHeader({})(p(entry.affectedTags.map(tag => `${tag.module} / ${tag.tag}`).join('\n'))),
            tableHeader({})(p(this._formatLinesAddedRemoved(entry.lines))),
            tableHeader({})(
                ...this._referencedModulesAsNestedExpands(entry.uniqueModules),
                ...this._untaggedReferencesAsNextedExpand(entry.untaggedReferences)
            ),
            tableHeader({})(...this._referencedTagsAsNestedExpands(entry.referencedTags, entry.unusedReferences)),
        ]);
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

        // TODO: [ ] It is tested
        // TODO: [ ] Add the same for
        // - Tags
        // - Modules
        // - [ ] Add similar to table entries themserves for Relevancy.LOW


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
            return [];
        }

        return uniqueModules.map(uniqueModule => {
            const tags: string = uniqueModule.tags.length > 0
                ? uniqueModule.tags.join("\n")
                : "No tags";

            // Careful, nestedExpand cannot be empty inside
            return nestedExpand({ title: uniqueModule.module })(
                p(tags)
            );
        });
    }

    private _referencedTagsAsNestedExpands(
        referencedTags: { tag: string; modules: string[]; }[],
        unusedReferences: Array<ReferencedFileInfo>
    ): any[] {
        if (!referencedTags.length && !unusedReferences.length) {
            return [p("-")];
        }

        return referencedTags.map(referenced => {
            const modules: string = referenced.tag.length > 0
                ? referenced.modules.join("\n")
                : "No modules";

            // Careful, nestedExpand cannot be empty inside
            return nestedExpand({ title: referenced.tag })(
                p(modules)
            );
        });
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

        https://developer.atlassian.com/cloud/jira/platform/apis/document/viewer/
        `);
    }
}