export function validatePorts(ports: number[]) {
    for (const port of ports) {
        if (
            !Number.isInteger(port) ||
            port < 1 ||
            port > 65535
        ) {
            throw new Error(
                `Invalid port ${port}`
            );
        }
    }
}