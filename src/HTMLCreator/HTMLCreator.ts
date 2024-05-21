import { CommitLog, ConfigurationMap, ConfigurationProperty, IssueLog, Logger } from "../Logger/Logger";
import { RelevancyDescriptions } from "../Relevancy/Relevancy";
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
                    type: "a",
                    attributes: {
                        href: "#instructions"
                    },
                    content: "Instructions"
                },
                {
                    type: "h2",
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
                href: "https://andybrewer.github.io/mvp/mvp.css"  // don't use https://unpkg.com/mvp.css as cloudflare is sometimes down
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
                    content: Logger.parseConfigurationPropertyName(property)
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

        // Override page title with build tag if present

        if (configuration.has(ConfigurationProperty.BUILD_TAG)) {
            const buildTag = configuration.get(ConfigurationProperty.BUILD_TAG);

            const pageTitle = this._html.document.findElementById("page-title")[0];
            pageTitle.content = buildTag;

            this._html.document.setTitle(buildTag + " - Scope Tags");
        }
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


    public appendIssueLogs(issues: IssueLog[], viewIssueURL: string | undefined, repositoryURL: string | undefined, seeCommitURL: string | undefined) {
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
            issue.commitInfos.forEach(commitLog => this._appendCommitTable(commitLog, issue.key, seeCommitURL, repositoryURL));
            if (issue.errors.length) {
                this._html.document.addElementToId(issue.key, {
                    type: "h3",
                    content: "Error messages"
                });

                issue.errors.forEach(errorMessage => {
                    this._appendErrorMessage(issue.key, errorMessage);
                })

            }
            this._html.document.addElementToId(issue.key, { type: "hr" });
        });
    }

    private _appendErrorMessage(key: string, errorMessage: string) {
        this._html.document.addElementToId(key, {
            type: "pre",
            content: [{
                type: "code",
                content: errorMessage
            }
            ]
        });
    }

    public appendInstructions() {
        this._html.document.addElementToType("main", {
            type: "div",
            attributes: {
                id: "instructions"
            },
            content: [
                {
                    type: "h3",
                    content: "Instructions"
                },
                {
                    type: "details",
                    content: [
                        {
                            type: "summary",
                            content: "Reading additional data"
                        },
                        {
                            type: "span",
                            content: "Some entries have "
                        },
                        {
                            type: "span",
                            attributes: {
                                title: "Some extra data!!",
                                class: "addotional-data-on-hover"
                            },
                            content: `additional data on hover`
                        },
                        {
                            type: "span",
                            content: ". You can hover over them to read the associated data - full commit message, tags associated with a file, etc."
                        },
                    ]
                },
                {
                    type: "hr"
                }
            ]
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

    private formatPathWithRepositoryURL(path: string, repositoryURL: string | undefined) {
        if (!repositoryURL) {
            return path;
        }

        return `<a href="${repositoryURL + path}">${path}</a>`;
    }

    private _appendCommitTable(commitLog: CommitLog, elementId: string, seeCommitURL: string | undefined, repositoryURL: string | undefined): void {
        const fileEntries = commitLog.fileLogs.map(entry => ({
            type: "tr",
            content: [
                {
                    type: "td",
                    content: this.formatPathWithRepositoryURL(entry.path, repositoryURL)
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
                                class: "addotional-data-on-hover",
                            },
                            content: `<strong>${commitLog.summary} </strong> ${seeCommitURL ? `<a href="${seeCommitURL + commitLog.hash}">(${commitLog.hash})</a>` : `(${commitLog.hash})`}`
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
                                    content: "Renamed"
                                },
                                {
                                    type: "th",
                                    content: [
                                        {
                                            type: "span",
                                            attributes: {
                                                title: this._getRelevancyDescriptions(),
                                                class: "addotional-data-on-hover-light"
                                            },
                                            content: `Relevancy`
                                        }
                                    ]
                                },
                                {
                                    type: "th",
                                    content: "Lines"
                                },
                                {
                                    type: "th",
                                    content: "Module / Tag"
                                },
                                {
                                    type: "th",
                                    content: "Used by"
                                },
                            ]
                        },
                        ...fileEntries
                    ]
                },
            ]
        });
    }
    private _getRelevancyDescriptions() {
        return [...RelevancyDescriptions.entries()].map(([relevancy, description]) => `${relevancy} - ${description.message}`).join('\n');
    }

    private _renderReferencedFiles(fileReferences: FileReference[]): any {
        if (!fileReferences.length) {
            return "-";
        }

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
                linesAddedRemovedText += `  `;
            }
        }

        if (linesRemoved > 0) {
            linesAddedRemovedText += `--${linesRemoved}`;
        }

        return linesAddedRemovedText;
    }

    private _renderTagIdentifiers(tagIdentifiers: TagIdentifier[]) {
        return [{
            type: "p",
            content: tagIdentifiers.map(tagIdentifier => `<strong>${tagIdentifier.module}</strong> / <strong>${tagIdentifier.tag}</strong>`).join('<br>')
        }]
    }

    private _renderTagIdentifiersToString(tagIdentifiers: TagIdentifier[]): string {
        if (!tagIdentifiers.length) {
            return 'Untagged'
        }

        return tagIdentifiers.map(tagIdentifier => `- '${tagIdentifier.tag}' from module '${tagIdentifier.module}'`).join('\n');
    }
}
