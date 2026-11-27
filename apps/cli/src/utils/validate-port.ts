export function isValidPort(port: number): boolean {
    return Number.isInteger(port) && port >= 1 && port <= 65535;
}
