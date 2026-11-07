// 终端样例共用的工具：颜色开关，以及按显示列宽算的对齐和折行。

const color = process.stdout.isTTY && !process.env.NO_COLOR && process.env.TERM !== 'dumb' && !process.argv.includes('--no-color');
export const paint = (open, close) => (text) => (color ? `\x1b[${open}m${text}\x1b[${close}m` : text);

// 窗口宽度取实际列数；输出不是终端时取 COLUMNS，默认 constraint.terminal.columns-default。
export const limit = Math.min(process.stdout.columns || Number(process.env.COLUMNS) || 80, 80);

// 按显示列宽算，不按字符数。中日韩字符和全角标点占 2 列。
const WIDE = /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹯＀-｠￠-￦]/u;
export const widthOf = (text) => [...text].reduce((sum, char) => sum + (WIDE.test(char) ? 2 : 1), 0);
export const padStart = (text, width) => ' '.repeat(Math.max(0, width - widthOf(text))) + text;
export const padEnd = (text, width) => text + ' '.repeat(Math.max(0, width - widthOf(text)));

// 西文单词不拆开，破折号和省略号不拆到两行，闭合标点不放在行首。
const NO_LINE_START = /^[，。、；：？！）》」』…—]/u;
export function wrap(text, width) {
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
