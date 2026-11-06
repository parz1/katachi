// 把仓库里的 Markdown 转成 HTML。只支持仓库实际用到的语法，零依赖。
import { posix } from 'node:path';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (char) => ESCAPES[char]);

// 仓库内的相对路径才算数。外部地址和跳出仓库的路径返回 null。
function resolveLocal(target, base) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return null;
  const resolved = posix.normalize(posix.join(base, target));
  return resolved.startsWith('..') ? null : `/${escapeHtml(encodeURI(resolved))}`;
}

function link(label, target, base) {
  if (/^https?:\/\//.test(target)) {
    return `<a href="${escapeHtml(target)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  }
  const href = resolveLocal(target, base);
  return href ? `<a href="${href}">${label}</a>` : label;
}

function image(alt, target, base) {
  const src = resolveLocal(target, base);
  return src ? `<img src="${src}" alt="${escapeHtml(alt)}" loading="lazy">` : escapeHtml(alt);
}

// light-dark(a, b) 拆成 [a, b]。
function modes(value) {
  const inner = value.slice('light-dark('.length, -1);
  let depth = 0;
  for (let index = 0; index < inner.length; index += 1) {
    if (inner[index] === '(') depth += 1;
    if (inner[index] === ')') depth -= 1;
    if (inner[index] === ',' && depth === 0) return [inner.slice(0, index).trim(), inner.slice(index + 1).trim()];
  }
  return [value];
}

// 颜色值前面放小色块，两种模式各一个。值来自仓库自己的 tokens。
export function swatch(value) {
  const one = (color) => `<span class="swatch" style="background:${escapeHtml(color)}"></span>`;
  if (value.startsWith('light-dark(')) return modes(value).map(one).join('');
  return /^(#|(oklch|color|var)\()/.test(value) ? one(value) : '';
}

// 正文里只放短的：两种模式的颜色只显示色块，字体列表只显示第一个。全部写在 Tokens 一节。
export function briefValue(value) {
  if (value.startsWith('light-dark(')) return '';
  return value.length > 24 && value.includes(',') ? `${value.split(',')[0]} 等` : value;
}

// context 可以只写 base 字符串。tokens 是 token 名到值的 Map：有它时，代码样式的 token 名后面会显示当前的值。
const contextOf = (context) => (typeof context === 'string' ? { base: context } : context);

export function inline(text, context = '') {
  const { base = '', tokens } = contextOf(context);
  const pattern = /`([^`\n]+)`|\*\*(.+?)\*\*|!\[([^\]]*)\]\(([^)\s]+)\)|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let html = '';
  let last = 0;
  for (const match of String(text).matchAll(pattern)) {
    html += escapeHtml(text.slice(last, match.index));
    if (match[1] !== undefined) {
      html += `<code>${escapeHtml(match[1])}</code>`;
      if (tokens?.has(match[1])) html += ` <span class="token-value">${swatch(tokens.get(match[1]))}${escapeHtml(briefValue(tokens.get(match[1])))}</span>`;
    } else if (match[2] !== undefined) html += `<strong>${inline(match[2], context)}</strong>`;
    else if (match[4] !== undefined) html += image(match[3], match[4], base);
    else html += link(inline(match[5], context), match[6], base);
    last = match.index + match[0].length;
  }
  return html + escapeHtml(String(text).slice(last));
}

const LIST_ITEM = /^(\s*)([-*]|\d+\.)\s+(.*)$/;
const IMAGE_LINE = /^!\[([^\]]*)\]\(([^)\s]+)\)$/;
const HTML_LINK_LINE = /^\[([^\]]+)\]\(([^)\s]+\.html)\)$/;
const isBlockStart = (line) => /^(#{1,6}\s|>|\||`{3,}|~{3,})/.test(line) || LIST_ITEM.test(line);

function renderFigures(matches, base) {
  const figures = matches.map(([, alt, target]) => {
    const src = resolveLocal(target, base);
    if (!src) return `<figure class="figure"><figcaption>${escapeHtml(alt)}</figcaption></figure>`;
    return `<figure class="figure"><a href="${src}" target="_blank" rel="noopener">${image(alt, target, base)}</a><figcaption aria-hidden="true">${escapeHtml(alt)}</figcaption></figure>`;
  });
  return `<div class="figures">${figures.join('')}</div>`;
}

function renderList(lines, start, indent, context) {
  const tag = /^\s*\d+\./.test(lines[start]) ? 'ol' : 'ul';
  const items = [];
  let index = start;
  while (index < lines.length) {
    const match = lines[index].match(LIST_ITEM);
    if (!match || match[1].length < indent) break;
    if (match[1].length > indent) {
      const [nested, next] = renderList(lines, index, match[1].length, context);
      if (items.length) items[items.length - 1] += nested;
      else items.push(nested);
      index = next;
    } else {
      items.push(inline(match[3], context));
      index += 1;
    }
  }
  return [`<${tag}>${items.map((item) => `<li>${item}</li>`).join('')}</${tag}>`, index];
}

function renderTable(rows, context) {
  const cells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
  const [head, , ...body] = rows;
  const headHtml = cells(head).map((cell) => `<th scope="col">${inline(cell, context)}</th>`).join('');
  const bodyHtml = body
    .map((row) => `<tr>${cells(row).map((cell) => `<td>${inline(cell, context)}</td>`).join('')}</tr>`)
    .join('');
  return `<div class="table-wrap"><table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;
}

// embed(target, label) 可选：一段话只有一个指向 .html 的链接时，用它返回的内容代替这个链接。
export function markdown(source, { base = '', headingOffset = 2, tokens, embed } = {}) {
  const context = { base, tokens };
  const lines = String(source).replace(/\r/g, '').split('\n');
  const html = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^(`{3,}|~{3,})/);
    if (fence) {
      const end = lines.findIndex((candidate, position) => position > index && candidate.startsWith(fence[1]));
      const stop = end < 0 ? lines.length : end;
      html.push(`<pre><code>${escapeHtml(lines.slice(index + 1, stop).join('\n'))}</code></pre>`);
      index = stop + 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = Math.min(6, heading[1].length + headingOffset);
      html.push(`<h${level}>${inline(heading[2], context)}</h${level}>`);
      index += 1;
      continue;
    }

    if (line.startsWith('>')) {
      const quoted = [];
      while (lines[index]?.startsWith('>')) {
        quoted.push(lines[index].replace(/^>\s?/, ''));
        index += 1;
      }
      html.push(`<blockquote>${markdown(quoted.join('\n'), { base, headingOffset, tokens, embed })}</blockquote>`);
      continue;
    }

    if (line.startsWith('|')) {
      const rows = [];
      while (lines[index]?.startsWith('|')) {
        rows.push(lines[index]);
        index += 1;
      }
      html.push(rows.length > 1 ? renderTable(rows, context) : `<p>${inline(rows[0], context)}</p>`);
      continue;
    }

    if (LIST_ITEM.test(line)) {
      const [rendered, next] = renderList(lines, index, line.match(LIST_ITEM)[1].length, context);
      html.push(rendered);
      index = next;
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index])) {
      paragraph.push(lines[index]);
      index += 1;
    }
    const images = paragraph.map((text) => text.trim().match(IMAGE_LINE));
    if (images.every(Boolean)) {
      html.push(renderFigures(images, base));
      continue;
    }
    const htmlLink = paragraph.length === 1 ? paragraph[0].trim().match(HTML_LINK_LINE) : null;
    const embedded = htmlLink && embed ? embed(htmlLink[2], htmlLink[1]) : null;
    html.push(embedded ?? `<p>${inline(paragraph.join(' '), context)}</p>`);
  }
  return html.join('\n');
}
