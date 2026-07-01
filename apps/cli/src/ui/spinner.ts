import ora from "ora";
import { palette } from "./theme";

export const spinner = ora({
  color: palette.signalLight as "yellow",
  spinner: "dots",
});
