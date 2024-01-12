// TODO: Make it configurable
export function formatDate(date: Date, timeZone: string): string {
    return date.toLocaleDateString("pl-PL", { timeZone: timeZone })
        + " "
        + date.toLocaleTimeString("pl-PL", { timeZone: timeZone })
}