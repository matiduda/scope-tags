const nodeFetch = require("node-fetch");
const betterAjvErrors = require("better-ajv-errors");
import Ajv from "ajv";
import { Logger } from "../Logger/Logger";

export class ADFValidator {
    private static SCHEMA_URL = "http://go.atlassian.com/adf-json-schema";
    private static JIRA_COMMENT_MAX_LENGTH = 32_767;

    private _schema: unknown;

    public constructor() { }

    public async loadSchema(): Promise<void> {
        console.log("[ADFValidator] Fetching latest JSON schema");

        const response = await nodeFetch(ADFValidator.SCHEMA_URL);

        if (!response.ok) {
            throw new Error(`[ADFValidator] Error ${response.errorCode} while fetching latest ADF schema from ${ADFValidator.SCHEMA_URL}`);
        }

        this._schema = await response.json();
    }

    public validateADF(
        commentJSON: string,
        issue?: string
    ): boolean {
        console.log("[ADFValidator] Validating ADF...");

        if (!this._schema) {
            throw new Error("[ADFValidator] Schema is not loaded yet, call await loadSchema() before validation");
        }

        const ajv = new Ajv({ jsonPointers: true });

        if(commentJSON.length > ADFValidator.JIRA_COMMENT_MAX_LENGTH) {
            console.log(`[ADFValidator] Maximum length of Jira comment (${ADFValidator.JIRA_COMMENT_MAX_LENGTH}) exceeded`);
            return false;
        }

        const data = JSON.parse(commentJSON);

        const validate = ajv.compile(this._schema);
        const isValid = validate(data);
        if (!isValid) {
            const errors = betterAjvErrors(this._schema, data, validate.errors, {
                indent: 2,
            });
            console.log(errors);

            if (issue) {
                Logger.pushAjvErrorMessage(errors, issue);
            }
            console.log(`[ADFValidator] Error while validating ${commentJSON}`);
            return false;
        }

        console.log("[ADFValidator] Successfully validated ADF");
        return true;
    }
}