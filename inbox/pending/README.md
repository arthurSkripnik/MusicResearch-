Proposed map changes, one JSON op per line, in `<date>-<topic>.jsonl`. Research threads write here; the Friday run (18:00 Kyiv)
applies them with `npx tsx tools/me.ts apply` (try `--dry` first). See the op format at the top of tools/me.ts.
Example:
{"op":"relation","type":"influenced","from":"genre:dub","to":"genre:trip-hop","why":"Дабовий бас і простір."}
