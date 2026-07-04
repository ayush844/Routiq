import stringWidth from "string-width";
import stripAnsi from "strip-ansi";

const COMPACT_WIDTH = 80;

export const CLEAR_SCREEN = "\x1b[2J\x1b[H";
export const ALT_SCREEN_ON = "\x1b[?1049h";
export const ALT_SCREEN_OFF = "\x1b[?1049l";

export function getTerminalColumns(): number {
  return process.stdout.columns || 80;
}

export function isCompactTerminal(): boolean {
  return getTerminalColumns() < COMPACT_WIDTH;
}

export function clearTerminal(): void {
  process.stdout.write(CLEAR_SCREEN);
}

export function truncate(text: string, maxWidth: number): string {
  if (maxWidth <= 0) return "";
  if (stringWidth(text) <= maxWidth) return text;

  const plain = stripAnsi(text);
  if (maxWidth <= 1) return "…";

  let result = "";
  let width = 0;

  for (const char of plain) {
    const next = stringWidth(char);
    if (width + next > maxWidth - 1) break;
    result += char;
    width += next;
  }

  return `${result}…`;
}

export function onTerminalResize(callback: () => void): () => void {
  process.stdout.on("resize", callback);
  return () => process.stdout.off("resize", callback);
}
