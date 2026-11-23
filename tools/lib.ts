// Shared helpers for data files: one record per line keeps diffs and grep output small.
import fs from 'node:fs';

export function writeArray(path: string, list: unknown[]) {
  fs.writeFileSync(path, list.length ? `[\n${list.map((x) => JSON.stringify(x)).join(',\n')}\n]\n` : '[]\n');
}
export function writeObject(path: string, obj: Record<string, unknown>) {
  const keys = Object.keys(obj);
  const body = keys.map((k) => {
    const v = obj[k];
    if (Array.isArray(v)) return `${JSON.stringify(k)}: [\n${v.map((x) => '  ' + JSON.stringify(x)).join(',\n')}\n]`;
    return `${JSON.stringify(k)}: ${JSON.stringify(v)}`;
  });
  fs.writeFileSync(path, `{\n${body.join(',\n')}\n}\n`);
}
export const readJSON = <T = any>(path: string): T => JSON.parse(fs.readFileSync(path, 'utf8'));

/** Stable relation id from its content: type:from>to. */
export const relationId = (r: { type: string; from: string; to: string }) => `${r.type}:${r.from}>${r.to}`;
