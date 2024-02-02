export enum Relevancy {
    LOW = "LOW",            // Does not list file at all (example: formatting changes)
    MEDIUM = "MEDIUM",      // Does list tags for file, but does not search references for it
    HIGH = "HIGH",          // Does list tags for file and performs full reference search
}
