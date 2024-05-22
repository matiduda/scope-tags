export enum Relevancy {
    LOW = "LOW",        // Does not search for references
    HIGH = "HIGH",      // Searches for references
}

// Default Relevancy is HIGH, and it can be reduced via user prompt
export const DEFAULT_RELEVANCY = Relevancy.HIGH;

export type CommitMessageRelevancyInfo = {
    path: string,
    relevancy: Relevancy,
    commit: string
};

export type RelevancyMap = Map<string, Array<CommitMessageRelevancyInfo>>; // Maps commit SHA to relevancies

// Descriptions

type RelevancyDescription = {
    name: string,
    message: string,
};

export const RelevancyDescriptions = new Map<Relevancy, RelevancyDescription>([
    [Relevancy.LOW, { name: "Low", message: "Does not search for references (more like: formatting changes)" }],
    [Relevancy.HIGH, { name: "High", message: "Searches for references (more like: some behaviour change)" }],
])