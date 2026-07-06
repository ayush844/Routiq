import ora from "ora";
import { palette } from "./theme.js";

export const spinner = ora({
  color: palette.signalLight as "yellow",
  spinner: "dots",
});
