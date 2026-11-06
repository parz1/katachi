// 同一份内容在终端里的样子。字体、字号和配色是用户的，层次只能靠粗体、暗淡、缩进、空行和位置。
// 颜色只用 16 色的名字，不指定具体颜色，也不设背景。去掉颜色，文字本身也说得清。
// 用法：node standards/typography/terminal.mjs [--no-color]
// 窗口宽度取实际列数；输出不是终端时取 COLUMNS，默认 constraint.terminal.columns-default。

const color = process.stdout.isTTY && !process.env.NO_COLOR && process.env.TERM !== 'dumb' && !process.argv.includes('--no-color');
const paint = (open, close) => (text) => (color ? `\x1b[${open}m${text}\x1b[${close}m` : text);
const bold = paint(1, 22);
const dim = paint(2, 22);
const red = paint(31, 39);
const yellow = paint(33, 39);
const green = paint(32, 39);
const limit = Math.min(process.stdout.columns || Number(process.env.COLUMNS) || 80, 80);

// 按显示列宽算，不按字符数。中日韩字符和全角标点占 2 列。
const WIDE = /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹯＀-｠￠-￦]/u;
const widthOf = (text) => [...text].reduce((sum, char) => sum + (WIDE.test(char) ? 2 : 1), 0);
const padStart = (text, width) => ' '.repeat(Math.max(0, width - widthOf(text))) + text;
const padEnd = (text, width) => text + ' '.repeat(Math.max(0, width - widthOf(text)));

// 西文单词不拆开，破折号和省略号不拆到两行，闭合标点不放在行首。
const NO_LINE_START = /^[，。、；：？！）》」』…—]/u;
function wrap(text, width) {
  const queue = text.match(/——|……|[A-Za-z0-9.,:;/_\-+%'’¥]+|\s+|./gu) ?? [];
  const lines = [];
  let line = [];
  const flush = () => lines.push(line.join('').trimEnd());
  while (queue.length) {
    const part = queue.shift();
    if (widthOf(part) > width) {
      queue.unshift(...part);
    } else if (widthOf(line.join('') + part) <= width) {
      line.push(part);
    } else if (NO_LINE_START.test(part) && line.length > 1) {
      const carry = [part];
      do carry.unshift(line.pop());
      while (line.length > 1 && NO_LINE_START.test(carry[0]));
      flush();
      line = carry;
    } else {
      flush();
      line = part.trim() ? [part] : [];
    }
  }
  if (line.length) flush();
  return lines;
}

const out = (text = '') => process.stdout.write(`${text}\n`);
const block = (text, style = (line) => line, indent = '') => {
  for (const line of wrap(text, limit - indent.length)) out(indent + style(line));
};

// 阅读
block('用 Claude 和 Codex 在 3 个 iOS 项目里复用 Design Tokens', bold);
block('阿依古丽·买买提艾力 · 2026 年 11 月 5 日 14:30', dim);
out();
block('三个项目各存一份颜色和间距，改一处要改三遍，还总有一份忘了改。这个季度我们把它们收成一份 Design Tokens，让 Claude 和 Codex 都从同一个地方读，新页面不用再问「这个灰到底是哪个灰」。');
out();
block('升级到 v2.4.0 后，API 的默认超时从 30 秒改为 10 秒。如果你在 CI 中调用 /v1/sync，请检查 retry 配置；请求过多时会返回 HTTP 429，并在 Retry-After 中给出等待时间（单位：秒）。');
out();
block('他问：「这份《设计规范》（第 2 版）能用吗？」我说——先看看……再决定！', undefined, '  ');
out();
block('旧数据怎么办', bold);
block('这个版本把原本分散在三个页面的同步设置合并到了一处。旧数据会在首次启动时自动迁移，迁移期间可以继续浏览，但暂时不能编辑。如果迁移失败，应用会保留原始数据并提示你重试，不会覆盖任何内容。');
out();

// 扫读
block('最近的文档', bold);
for (const [title, meta] of [
  ['关于调整第四季度跨部门协作流程以及相关审批权限的补充说明（第二次修订）', '李雷 · 3 分钟前'],
  ['Supplementary Notes on Revising the Cross-Department Collaboration Process and Related Approval Permissions for Q4', 'Alexandria Montgomery-Featherstonehaugh · Nov 5, 2026, 2:30 PM'],
  ['2026年11月产品评审_最终版_final_v3_修订_不要再改了.pdf', '阿依古丽·买买提艾力 · 3 minutes ago'],
]) {
  const selected = title.startsWith('关于调整');
  wrap(title, limit - 2).forEach((line, index) => out(selected ? bold(`${index ? '  ' : '> '}${line}`) : `  ${line}`));
  block(meta, dim, '  ');
}
out();

// 比对：放得下时对齐成表，放不下时拆成多行。
block('金额', bold);
const ROWS = [
  ['苹果 Apple', '3', '¥12.50', '-12.5%'],
  ['有机冷榨特级初榨橄榄油（意大利产）750ml 买二送一限时特惠装', '12', '¥12,345.60', '+8.0%'],
  ['年度授权', '1', '¥1,222,209.79', '0.0%'],
  ['合计 Total', '16', '¥1,234,567.89', ''],
];
const HEAD = ['项目', '数量', '金额', '变化'];
const columnWidth = (index) => Math.max(...[HEAD, ...ROWS].map((row) => widthOf(row[index])));
const numbers = [1, 2, 3].map(columnWidth);
const first = limit - 2 - numbers.reduce((sum, width) => sum + width + 2, 0);
if (first >= 16) {
  const row = (cells, style = (text) => text) => {
    const lines = wrap(cells[0], first);
    const cellsAfter = numbers.map((width, index) => `  ${padStart(cells[index + 1], width)}`).join('').trimEnd();
    out(`  ${style(padEnd(lines[0], first) + cellsAfter)}`);
    for (const line of lines.slice(1)) out(`  ${style(line)}`);
  };
  row(HEAD, dim);
  ROWS.forEach((cells) => row(cells));
} else {
  for (const [name, count, amount, change] of ROWS) {
    block(name, undefined, '  ');
    block(`数量 ${count}  金额 ${amount}${change ? `  变化 ${change}` : ''}`, dim, '  ');
  }
}
out();

// 状态：前面的词说清发生了什么，颜色只是加强。
const status = (word, text, style) => {
  wrap(text, limit - 6).forEach((line, index) => out(style(`${index ? '      ' : `${word}  `}${line}`)));
};
status('完成', '发布成功，共 12 项。', green);
status('警告', '存储空间只剩 5%，同步可能变慢。', yellow);
status('错误', '无法保存：网络连接已断开。你的修改仍保留在本页，恢复连接后可以重试。', red);
block('要重试吗？[Y/n]');
