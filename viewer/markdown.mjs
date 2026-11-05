// 把仓库里的 Markdown 转成 HTML。只支持仓库实际用到的语法，零依赖。
import { posix } from 'node:path';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (char) => ESCAPES[char]);

function link(label, target, base) {
  if (/^https?:\/\//.test(target)) {
    return `<a href="${escapeHtml(target)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return label;
  const resolved = posix.normalize(posix.join(base, target));
  if (resolved.startsWith('..')) return label;
  return `<a href="/${escapeHtml(encodeURI(resolved))}">${label}</a>`;
}

export function inline(text, base = '') {
  const pattern = /`([^`\n]+)`|\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let html = '';
  let last = 0;
  for (const match of String(text).matchAll(pattern)) {
    html += escapeHtml(text.slice(last, match.index));
    if (match[1] !== undefined) html += `<code>${escapeHtml(match[1])}</code>`;
    else if (match[2] !== undefined) html += `<strong>${inline(match[2], base)}</strong>`;
    else html += link(inline(match[3], base), match[4], base);
    last = match.index + match[0].length;
  }
  return html + escapeHtml(String(text).slice(last));
}

const LIST_ITEM = /^(\s*)([-*]|\d+\.)\s+(.*)$/;
const isBlockStart = (line) => /^(#{1,6}\s|>|\||`{3,}|~{3,})/.test(line) || LIST_ITEM.test(line);

function renderList(lines, start, indent, base) {
  const tag = /^\s*\d+\./.test(lines[start]) ? 'ol' : 'ul';
  const items = [];
  let index = start;
  while (index < lines.length) {
    const match = lines[index].match(LIST_ITEM);
    if (!match || match[1].length < indent) break;
    if (match[1].length > indent) {
      const [nested, next] = renderList(lines, index, match[1].length, base);
      if (items.length) items[items.length - 1] += nested;
      else items.push(nested);
      index = next;
    } else {
      items.push(inline(match[3], base));
      index += 1;
    }
  }
  return [`<${tag}>${items.map((item) => `<li>${item}</li>`).join('')}</${tag}>`, index];
}

function renderTable(rows, base) {
  const cells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
  const [head, , ...body] = rows;
  const headHtml = cells(head).map((cell) => `<th scope="col">${inline(cell, base)}</th>`).join('');
  const bodyHtml = body
    .map((row) => `<tr>${cells(row).map((cell) => `<td>${inline(cell, base)}</td>`).join('')}</tr>`)
    .join('');
  return `<div class="table-wrap"><table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;
}

export function markdown(source, { base = '', headingOffset = 2 } = {}) {
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
      html.push(`<h${level}>${inline(heading[2], base)}</h${level}>`);
      index += 1;
      continue;
    }

    if (line.startsWith('>')) {
      const quoted = [];
      while (lines[index]?.startsWith('>')) {
        quoted.push(lines[index].replace(/^>\s?/, ''));
        index += 1;
      }
      html.push(`<blockquote>${markdown(quoted.join('\n'), { base, headingOffset })}</blockquote>`);
      continue;
    }

    if (line.startsWith('|')) {
      const rows = [];
      while (lines[index]?.startsWith('|')) {
        rows.push(lines[index]);
        index += 1;
      }
      html.push(rows.length > 1 ? renderTable(rows, base) : `<p>${inline(rows[0], base)}</p>`);
      continue;
    }

    if (LIST_ITEM.test(line)) {
      const [rendered, next] = renderList(lines, index, line.match(LIST_ITEM)[1].length, base);
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
    html.push(`<p>${inline(paragraph.join(' '), base)}</p>`);
  }
  return html.join('\n');
}
