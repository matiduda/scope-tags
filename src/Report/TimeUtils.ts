export function formatDate(date: Date, timeZone: string): string {
    const day = padNumber(date.getDate(), 2);
    const month = padNumber(date.getMonth() + 1, 2);
    const year = date.getFullYear();

    const hour = padNumber(date.getUTCHours() + 1, 2); // TODO: Make it configurable
    const minute = padNumber(date.getMinutes(), 2);

    return `${day}.${month}.${year} ${hour}:${minute}`;
}

function padNumber(number: number, size: number) {
    let numberAsString = number.toString();
    while (numberAsString.length < size) numberAsString = "0" + numberAsString;
    return numberAsString;
}