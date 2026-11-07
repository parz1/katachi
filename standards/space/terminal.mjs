// 同一份内容在终端里的 3 种分法。终端里没有圆角和底色，能用的只有空行、缩进和字符画的线。
// 用法：node standards/space/terminal.mjs [--split=gap|line|box] [--no-color]
//   gap   靠空行和缩进分开（默认）
//   line  靠一条横线分开
//   box   靠框线分开。框线字符的宽度是模糊的，有的终端会算成 2 列，整个框就歪了。规则见 ../space.md。

import { limit, padEnd, padStart, paint, widthOf, wrap } from '../typography/terminal-text.mjs';

const bold = paint(1, 22);
const dim = paint(2, 22);
const plain = (text) => text;

const split = process.argv.find((arg) => arg.startsWith('--split='))?.slice('--split='.length) ?? 'gap';
if (!['gap', 'line', 'box'].includes(split)) {
  console.error(`--split 只能是 gap、line、box，收到 ${split}`);
  process.exit(2);
}

// 线要 UTF-8 才画得出来，其他编码退回 ASCII。
const utf8 = /utf-?8/i.test(process.env.LC_ALL || process.env.LC_CTYPE || process.env.LANG || '');
const [H, V, TL, TR, BL, BR] = utf8 ? ['─', '│', '┌', '┐', '└', '┘'] : ['-', '|', '+', '+', '+', '+'];

const keyValues = (pairs) => (width) => {
  const key = Math.max(...pairs.map(([name]) => widthOf(name)));
  return pairs.flatMap(([name, value]) => wrap(value, Math.max(8, width - key - 2))
    .map((line, index) => [`${padEnd(index ? '' : name, key)}  ${line}`, plain]));
};

const documents = (items) => (width) => items.flatMap(([title, meta]) => [
  ...wrap(title, width).map((line) => [line, plain]),
  ...wrap(meta, width - 2).map((line) => [`  ${line}`, dim]),
]);

// 放得下时对齐成表，放不下时拆成多行。
const table = (head, rows) => (width) => {
  const numbers = [1, 2, 3].map((index) => Math.max(...[head, ...rows].map((row) => widthOf(row[index]))));
  const first = width - numbers.reduce((sum, column) => sum + column + 2, 0);
  if (first < 16) {
    return rows.flatMap(([name, ...rest]) => [
      ...wrap(name, width).map((line) => [line, plain]),
      ...wrap(rest.map((value, index) => (value ? `${head[index + 1]} ${value}` : '')).join('  ').trim(), width).map((line) => [line, dim]),
    ]);
  }
  const row = (cells, style) => wrap(cells[0], first).map((line, index) => [
    index ? line : `${padEnd(line, first)}${numbers.map((column, at) => `  ${padStart(cells[at + 1], column)}`).join('')}`,
    style,
  ]);
  return [...row(head, dim), ...rows.flatMap((cells) => row(cells, plain))];
};

const GROUPS = [
  ['同步设置', keyValues([
    ['状态', '正常'],
    ['上次同步', '3 分钟前 · 2026 年 11 月 5 日 14:30'],
    ['存储', '已用 95%，同步可能变慢'],
  ])],
  ['最近的文档', documents([
    ['关于调整第四季度跨部门协作流程以及相关审批权限的补充说明（第二次修订）', '李雷 · 3 分钟前'],
    ['Supplementary Notes on Revising the Cross-Department Collaboration Process and Related Approval Permissions for Q4', 'Alexandria Montgomery-Featherstonehaugh · Nov 5, 2026, 2:30 PM'],
    ['2026年11月产品评审_最终版_final_v3_修订_不要再改了.pdf', '阿依古丽·买买提艾力 · 3 minutes ago'],
  ])],
  ['用量', table(['项目', '数量', '金额', '变化'], [
    ['苹果 Apple', '3', '¥12.50', '-12.5%'],
    ['有机冷榨特级初榨橄榄油（意大利产）750ml 买二送一限时特惠装', '12', '¥12,345.60', '+8.0%'],
    ['合计 Total', '15', '¥12,358.10', ''],
  ])],
];

const out = (text = '') => process.stdout.write(`${text.trimEnd()}\n`);
GROUPS.forEach(([title, body], index) => {
  if (split === 'gap') {
    if (index) out();
    out(bold(title));
    for (const [line, style] of body(limit - 2)) out(`  ${style(line)}`);
  } else if (split === 'line') {
    out(H.repeat(limit));
    out(bold(title));
    for (const [line, style] of body(limit)) out(style(line));
  } else {
    out(`${TL}${H} ${bold(title)} ${H.repeat(limit - 5 - widthOf(title))}${TR}`);
    for (const [line, style] of body(limit - 4)) out(`${V} ${style(padEnd(line, limit - 4))} ${V}`);
    out(`${BL}${H.repeat(limit - 2)}${BR}`);
  }
});
