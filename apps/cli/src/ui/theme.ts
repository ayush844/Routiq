import colors from "colors";
import chalk from "chalk";
import gradient from "gradient-string";

/** Matches apps/web/cli-dashboard.tsx orange palette */
export const palette = {
  signal: "#CF4500",
  signalLight: "#F37338",
} as const;

colors.setTheme({
  signal: palette.signal,
  signalLight: palette.signalLight,
});

export const c = {
  signal: chalk.hex(palette.signal),
  signalLight: chalk.hex(palette.signalLight),
  gray: chalk.gray,
  dim: chalk.dim,
  green: chalk.green,
  cyan: chalk.cyan,
  red: chalk.red,
  yellow: chalk.yellow,
};

export const brandGradient = gradient([
  palette.signal,
  palette.signalLight,
  palette.signal,
]);

export const tableColors = {
  head: ["signalLight"] as string[],
  border: ["signalLight"] as string[],
};

export const boxBorderColor = palette.signalLight;
