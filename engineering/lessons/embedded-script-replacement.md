# Candidate lesson — embedded JavaScript replacement-string expansion

- PR #131, failed run [43654362704](https://github.com/duykhang68/khoahoctienghan/actions/runs/43654362704), job 132629537465, HEAD `2f74847108bfeaeda6ef8defc5a2eabcd7555c1b`.
- Failure: Node ESM parser, `SyntaxError: Invalid or unexpected token`, before Worker tests. Passing a serialized browser script as a JavaScript string replacement expanded the dollar-apostrophe sequence in two regex-constructor literals into the suffix of the Worker source. Subsequent route replacements landed in an injected duplicate.
- Repair: reconstruct the exact browser string and restore the library handlers in the actual Worker; insert packed code using literal concatenation or callback replacement, never untrusted replacement strings. Add Node VM syntax compile of the real authenticated page script, preserve all access checks, rerun native CI and browser regression.
- Reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_string_as_the_replacement
- Verification pending until new exact HEAD CI passes; do not promote this lesson early.
