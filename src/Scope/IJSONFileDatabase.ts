export interface IJSONFileDatabase<T> {
    load: () => T,
    save: () => string,
    initDefault: () => void,
}