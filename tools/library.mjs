// 读取仓库内容的共用函数，供校验脚本和查看器使用。零依赖，只读。
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './build-tokens.mjs';

const SKIPPED = new Set(['.git', '.claude', 'node_modules', '.DS_Store']);

export const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
export const exists = (rel) => existsSync(join(ROOT, rel));
export const stripFences = (text) => text.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[`~]*[ \t]*$/gm, '');
export const stripInlineCode = (text) => text.replace(/`[^`\n]*`/g, '');

export function walk(rel = '') {
  const found = [];
  for (const entry of readdirSync(join(ROOT, rel), { withFileTypes: true })) {
    if (SKIPPED.has(entry.name)) continue;
    const path = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) found.push(...walk(path));
    else found.push(path);
  }
  return found;
}

export const subdirectories = (rel) => (exists(rel)
  ? readdirSync(join(ROOT, rel), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `${rel}/${entry.name}`)
  : []);

export function findTable(text, firstCell) {
  const lines = stripFences(text).split('\n');
  const start = lines.findIndex((line) => line.startsWith(`| ${firstCell} |`));
  if (start < 0) return null;
  const cells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
  const rows = [];
  for (let index = start + 2; lines[index]?.startsWith('|'); index += 1) rows.push(cells(lines[index]));
  return { header: cells(lines[start]), rows };
}
