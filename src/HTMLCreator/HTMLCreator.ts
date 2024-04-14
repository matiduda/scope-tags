import { CommitLog, ConfigurationMap, IssueLog } from "../Logger/Logger";
import { FileReference } from "../Report/ReportGenerator";
import { TagIdentifier } from "../Scope/FileTagsDatabase";
import { CSSOverrides } from "./CSSOverrides";

const htmlCreator = require("html-creator");

// Docs: https://github.com/Hargne/html-creator/wiki/API

export class HTMLCreator {

    private _html: any; // html-creator doesn't export types :/

    public constructor(title: string) {
        this._init();
        this._html.document.setTitle(title);
    }

    public renderHTML() {
        return this._html.renderHTML();
    }

    private _init() {
        this._html = new htmlCreator([{
            type: "main",
            attributes: {
                id: "main"
            },
            content: [
                {
                    type: "h3",
                    attributes: {
                        id: "page-title",
                    },
                    content: 'Scope tags report logs'
                },
                {
                    type: "hr"
                }
            ]
        }]).withBoilerplate();

        this._html.document.addElementToType('head', {
            type: "link",
            attributes: {
                rel: "stylesheet",
                // don't use https://unpkg.com/mvp.css as cloudflare is sometimes down
                href: "https://andybrewer.github.io/mvp/mvp.css"
            },
        });

        // Add style overrides
        this._html.document.addElementToType('head', {
            type: "style",
            content: CSSOverrides,
        });
    }



    public appendConfiguration(configuration: ConfigurationMap) {

        const tableEntries = [...configuration.keys()].map(property => ({
            type: "tr",
            content: [
                {
                    type: "td",
                    content: property
                },
                {
                    type: "td",
                    content: configuration.get(property)
                }
            ]
        }));

        this._html.document.addElementToType("main", {
            type: "div",
            attributes: {
                id: "configuration-table"
            },
            content: [
                {
                    type: "table",
                    content: [
                        {
                            type: "thead",
                            content: [
                                {
                                    type: "th",
                                    content: "Configuration"
                                },
                                {
                                    type: "th"
                                }
                            ]
                        },
                        ...tableEntries
                    ]
                },
                {
                    type: "hr"
                }
            ]
        });
    }

    public appendIssueTableOfContents(issues: IssueLog[]) {
        const issueUnsignedList = issues.map(issue => ({
            type: "li",
            content: [{
                type: "a",
                attributes: {
                    href: `#${issue.key}`,
                },
                content: issue.key
            }]
        }));

        // Quick links used for navigation
        this._html.document.addElementToType("main", {
            type: "div",
            attributes: {
                id: "table-of-contents"
            },
            content: [
                {
                    type: "h3",
                    content: "Issues to be updated"
                },
                {
                    type: "ul",
                    content: issueUnsignedList
                },
                {
                    type: "hr"
                }
            ]
        });
    }


    public appendIssueLogs(issues: IssueLog[], viewIssueURL: string | undefined) {
        issues.forEach(issue => {
            this._html.document.addElementToType("main", {
                type: "div",
                attributes: {
                    id: issue.key
                },
                content: [
                    {
                        type: "div",
                        attributes: {
                            class: "issue-header",
                        },
                        content: [
                            {
                                type: "h3",
                                content: this._getIssueHeaderContent(issue.key, viewIssueURL)
                            },
                            {
                                type: "a",
                                attributes: {
                                    href: "#main"
                                },
                                content: "Back to top"
                            }
                        ]
                    }
                ]
            });

            issue.commitInfos.forEach(commitLog => this._appendCommitTable(commitLog, issue.key));
            this._html.document.addElementToId(issue.key, { type: "hr" });
        });
    }
    private _getIssueHeaderContent(key: string, viewIssueURL: string | undefined) {
        return viewIssueURL ? [{
            type: "a",
            attributes: {
                href: viewIssueURL + key
            },
            content: key
        }] : key;
    }

    private _appendCommitTable(commitLog: CommitLog, elementId: string): void {
        const fileEntries = commitLog.fileLogs.map(entry => ({
            type: "tr",
            content: [
                {
                    type: "td",
                    content: entry.path
                },
                {
                    type: "td",
                    content: entry.ignored ? "IGNORED" : entry.changeType
                },
                {
                    type: "td",
                    content: entry.updatedPath
                },
                {
                    type: "td",
                    content: entry.relevancy || "-"
                },
                {
                    type: "td",
                    content: this._renderLinedAddedRemoved(entry.linesAdded, entry.linesRemoved),
                },
                {
                    type: "td",
                    content: this._renderTagIdentifiers(entry.databaseContent)
                },
                {
                    type: "td",
                    content: this._renderReferencedFiles(entry.referencedFiles)
                },
            ],
            ...(entry.ignored ? {
                attributes: {
                    class: "ignored-file"
                }
            } : {}),
        }));

        this._html.document.addElementToId(elementId, {
            type: "div",
            content: [
                {
                    type: "p",
                    content: [
                        {
                            type: "span",
                            content: "From commit: "
                        },
                        {
                            type: "span",
                            attributes: {
                                title: commitLog.message,
                                class: "addotional-data-on-hover"
                            },
                            content: `<strong>${commitLog.summary} </strong> (${commitLog.hash})`
                        }
                    ]
                },
                {
                    type: "p",
                    content: `Has relevancy data?: <strong>${commitLog.hasRelevancy ? "yes" : "no"}</strong>`
                },
                {
                    type: "table",
                    content: [
                        // export type FileLog = {
                        //     path: string,
                        //     updatedPath: string
                        //     changeType: string,
                        //     linesAdded: number,
                        //     linesRemoved: number,
                        //     relevancy: string,
                        //     databaseContent: TagIdentifier[],
                        //     referencedFiles: FileReference[],
                        // }
                        {
                            type: "thead",
                            content: [
                                {
                                    type: "th",
                                    content: "File path"
                                },
                                {
                                    type: "th",
                                    content: "Change"
                                },
                                {
                                    type: "th",
                                    content: "New"
                                },
                                {
                                    type: "th",
                                    content: "Relevancy"
                                },
                                {
                                    type: "th",
                                    content: "Lines"
                                },
                                {
                                    type: "th",
                                    content: "Tag / module"
                                },
                                {
                                    type: "th",
                                    content: "Referenced files"
                                },
                            ]
                        },
                        ...fileEntries
                    ]
                },
            ]
        });
    }

    private _renderReferencedFiles(fileReferences: FileReference[]): any {
        return fileReferences.map(fileReference => ({
            type: "div",
            attributes: {
                title: this._renderTagIdentifiersToString(fileReference.tagIdentifiers),
                class: fileReference.tagIdentifiers.length ? "addotional-data-on-hover" : undefined
            },
            content: `${fileReference.fileInfo.filename + (fileReference.fileInfo.unused ? '- unused' : '')}`
        }));
    }

    private _renderLinedAddedRemoved(linesAdded: number, linesRemoved: number) {
        if (linesAdded === 0 && linesRemoved === 0) {
            return '-';
        }

        let linesAddedRemovedText = "";

        if (linesAdded > 0) {
            linesAddedRemovedText += `++${linesAdded}`;
            if (linesRemoved > 0) {
                linesAddedRemovedText += ` `;
            }
        }

        if (linesRemoved > 0) {
            linesAddedRemovedText += `--${linesAdded}`;
        }

        return linesAddedRemovedText;
    }

    private _renderTagIdentifiers(tagIdentifiers: TagIdentifier[]) {
        return [{
            type: "p",
            content: tagIdentifiers.map(tagIdentifier => `<strong>${tagIdentifier.tag}</strong> / <strong>${tagIdentifier.module}</strong>`).join('<br>')
        }]
    }

    private _renderTagIdentifiersToString(tagIdentifiers: TagIdentifier[]): string {
        if (!tagIdentifiers.length) {
            return 'Not tagged'
        }

        // return tagIdentifiers.map(tagIdentifier => `- '${tagIdentifier.tag}' from module '${tagIdentifier.module}'`).join('\n');
        return "Has tags";
    }
}
