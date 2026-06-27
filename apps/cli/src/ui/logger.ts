import chalk from "chalk";
import logSymbols from "log-symbols";

export const logger = {
    success(message: string) {
        console.log(`${logSymbols.success} ${chalk.bold.green(message)}`);
    },

    error(message: string) {
        console.log(`${logSymbols.error} ${chalk.bold.red(message)}`);
    },

    info(message: string) {
        console.log(`${chalk.bold.cyan(message)}`);
    },

    warn(message: string) {
        console.log(`${logSymbols.warning} ${chalk.bold.yellow(message)}`);
    },

    dim(message: string) {
        console.log(chalk.dim(message));
    }
};