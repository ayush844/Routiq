import boxen from "boxen";
import figlet from "figlet";
import { brandGradient, boxBorderColor, c } from "./theme";

export function showBanner() {
  const logo = figlet.textSync("Routiq", {
    font: "ANSI Shadow",
    horizontalLayout: "default",
  });

  console.log(
    boxen(
      `${brandGradient.multiline(logo)}

${c.gray("Expose localhost to the internet")}
${c.dim("Fast • Secure • Simple")}
`,
      {
        padding: {
          top: 1,
          bottom: 1,
          left: 2,
          right: 2,
        },
        borderStyle: "round",
        borderColor: boxBorderColor,
      }
    )
  );
}
