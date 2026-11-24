# AGENT.md

Build note for the One-Liner Marathon entry "Routine Maintenance".

**Entry (145 chars):** The museum guard has watched the same painting for 11 years; yesterday the painting finally blinked, and he filed it under 'routine maintenance.'

**main.ts** is dependency-free Node 22 TypeScript. It validates the entry against a small rule table, in order:

1. `not-blank`: not empty or whitespace-only.
2. `max-length`: at most 280 characters.
3. `single-line`: no CR or LF characters.

A failure throws an error that names the rule. The entry is then written to `output/entry.txt` with no trailing newline, and a read-back guard fails if the bytes on disk differ from the entry.

`node main.ts --self-test` checks that bad inputs are rejected by the intended rule, that a 280-char entry is accepted, and that the real entry round-trips byte-identical through a temp dir.
