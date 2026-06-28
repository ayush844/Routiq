import boxen from "boxen";
import gradient from "gradient-string";
import figlet from "figlet";
import chalk from "chalk";

export function showBanner() {
  const logo = figlet.textSync("Routiq", {
    font: "ANSI Shadow",
    horizontalLayout: "default",
  });

  console.log(
    boxen(
      `${gradient.instagram.multiline(logo)}

${chalk.gray("Expose localhost to the internet")}
${chalk.dim("Fast • Secure • Simple")}
`,
      {
        padding: {
          top: 1,
          bottom: 1,
          left: 2,
          right: 2,
        },
        borderStyle: "round",
        borderColor: "magenta",
      }
    )
  );
}