import { FilePath } from "../Git/Types";

export enum Relevancy {
    LOW = "LOW",            // Does not list file at all (example: formatting changes)
    MEDIUM = "MEDIUM",      // Does list tags for file, but does not search references for it
    HIGH = "HIGH",          // Does list tags for file and performs full reference search
}

// Default Relevancy is HIGH, and it can be reduced via user prompt
export const DEFAULT_RELEVANCY = Relevancy.HIGH;

export type CommitMessageRelevancyInfo = {
    path: string,
    relevancy: Relevancy,
    commit: string
};

export type RelevancyMap = Map<FilePath, Array<CommitMessageRelevancyInfo>>;

// Descriptions

type RelevancyDescription = {
    name: string,
    message: string,
};

export const RelevancyDescriptions = new Map<Relevancy, RelevancyDescription>([
    [Relevancy.LOW, { name: "Low", message: "Does not list file at all (example: formatting changes)" }],
    [Relevancy.MEDIUM, { name: "Medium", message: "Does list tags for file, but does not search references for it" }],
    [Relevancy.HIGH, { name: "High", message: "Does list tags for file and performs full reference search" }],
])