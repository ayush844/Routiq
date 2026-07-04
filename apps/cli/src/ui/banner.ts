import boxen from "boxen";
import figlet from "figlet";
import { brandGradient, boxBorderColor, c } from "./theme.js";

export function renderBanner(compact = false): string {
  const logo = figlet.textSync("Routiq", {
    font: compact ? "Standard" : "ANSI Shadow",
    horizontalLayout: "default",
  });

  return boxen(
    `${brandGradient.multiline(logo)}

${c.gray("Expose localhost to the internet")}
${c.dim("Fast • Secure • Simple")}
`,
    {
      padding: compact
        ? 1
        : {
            top: 1,
            bottom: 1,
            left: 2,
            right: 2,
          },
      borderStyle: "round",
      borderColor: boxBorderColor,
    }
  );
}

export function showBanner(compact = false) {
  console.log(renderBanner(compact));
}
