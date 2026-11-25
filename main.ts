import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export const TITLE = "The Fire Hazard";

export const ENTRY =
  "My smoke detector's incident report lists 347 false alarms and one conclusion: \"Human, you're the fire hazard.\"";

export const MAX_CHARS = 280;
export const MIN_CHARS = 100; // RULES.txt: one line, 100-200 characters

const OUTPUT_FILE = join("output", "entry.txt");

interface Rule {
  name: string;
  check: (text: string) => string | null; // problem description, or null if fine
}

const RULES: Rule[] = [
  {
    name: "not-blank",
    check: (t) => (t.trim() === "" ? "entry is blank" : null),
  },
  {
    name: "max-length",
    check: (t) => (t.length > MAX_CHARS ? `entry has ${t.length} chars, ${t.length - MAX_CHARS} over the ${MAX_CHARS}-char limit` : null),
  },
  {
    name: "single-line",
    check: (t) => (/[\r\n]/.test(t) ? "entry contains a newline character" : null),
  },
  {
    name: "min-length",
    check: (t) => (t.length < MIN_CHARS ? `entry has ${t.length} chars, ${MIN_CHARS - t.length} under the ${MIN_CHARS}-char minimum` : null),
  },
];

export function validate(text: string): void {
  for (const rule of RULES) {
    const problem = rule.check(text);
    if (problem !== null) throw new Error(`rule "${rule.name}" failed: ${problem}`);
  }
}

export function writeEntry(path: string, text: string): number {
  validate(text);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, "utf8");
  const onDisk = readFileSync(path);
  if (!onDisk.equals(Buffer.from(text, "utf8"))) {
    throw new Error(`read-back guard failed: ${path} differs from the entry`);
  }
  return onDisk.length;
}

function rejectedBy(text: string): string | null {
  try {
    validate(text);
    return null;
  } catch (e) {
    const m = /^rule "([^"]+)"/.exec((e as Error).message);
    return m ? m[1] : (e as Error).message;
  }
}

function selfTest(): void {
  const bad: Array<[string, string, string]> = [
    ["empty", "", "not-blank"],
    ["too short (99 chars)", "x".repeat(MIN_CHARS - 1), "min-length"],
    ["spaces only", "   ", "not-blank"],
    ["281 chars", "x".repeat(MAX_CHARS + 1), "max-length"],
    ["embedded LF", "one\ntwo", "single-line"],
    ["embedded CR", "one\rtwo", "single-line"],
    ["real entry + trailing newline", ENTRY + "\n", "single-line"],
    ["tabs and newlines only", "\t\n\t", "not-blank"],
    ["too long AND multi-line (first failing rule wins)", "x".repeat(MAX_CHARS) + "\ny", "max-length"],
  ];
  for (const [label, text, rule] of bad) {
    const got = rejectedBy(text);
    if (got !== rule) throw new Error(`self-test: ${label}: expected rule ${rule}, got ${got}`);
  }

  validate("y".repeat(MAX_CHARS));
  validate(ENTRY);

  const dir = mkdtempSync(join(tmpdir(), "marathon-"));
  try {
    const target = join(dir, "output", "entry.txt");
    const n = writeEntry(target, ENTRY);
    if (!existsSync(target) || !readFileSync(target).equals(Buffer.from(ENTRY, "utf8"))) {
      throw new Error("self-test: round trip not byte-identical");
    }
    console.log(`self-test ok: ${bad.length} rejections, ${MAX_CHARS}-char boundary accepted, ${n} bytes round-tripped`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

try {
  if (process.argv.includes("--self-test")) {
    selfTest();
  } else {
    const n = writeEntry(OUTPUT_FILE, ENTRY);
    console.log(`wrote ${n} bytes (${ENTRY.length} chars) to ${OUTPUT_FILE}`);
  }
} catch (e) {
  console.error(`error: ${(e as Error).message}`);
  process.exit(1);
}
