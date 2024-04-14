export interface IJSONFileDatabase<T> {
    _loaded: boolean,

    load: () => T,
    save: () => string,
    initDefault: () => void,
}