// 从仓库内容生成查看器页面。零依赖。
// 页面内容全部来自仓库文件，这里只负责排版，不写任何规范内容。
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OUTPUT } from '../build-tokens.mjs';
import { exists, read } from '../library.mjs';
import { readLibrary } from './data.mjs';
import { escapeHtml as h, inline, markdown, swatch } from './markdown.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SECTIONS = [
  ['design', '入口'],
  ['standards', '规范'],
  ['patterns', '模式'],
  ['examples', '示例'],
  ['platforms', '平台'],
  ['tokens', 'Tokens'],
  ['content', '内容压力'],
];

const section = (id, intro, body) => {
  const title = SECTIONS.find(([key]) => key === id)[1];
  return `<section id="${id}" aria-labelledby="${id}-title"><h2 id="${id}-title">${h(title)}</h2>${intro ? `<p class="intro">${intro}</p>` : ''}${body}</section>`;
};
const source = (path) => `<a href="/${h(encodeURI(path))}"><code>${h(path)}</code></a>`;

function fields(values, order, base = '') {
  const rows = order
    .filter((key) => values[key])
    .map((key) => `<dt>${h(key)}</dt><dd>${inline(values[key], base)}</dd>`)
    .join('');
  return rows ? `<dl class="fields">${rows}</dl>` : '';
}

// 能运行的例子

function benchWidths(lib) {
  const web = lib.platforms.find((platform) => platform.id === 'web');
  const sizes = [...(web?.checks ?? '').matchAll(/(\d{3,4})×(\d{3,4})/g)].map((match) => ({ width: Number(match[1]), height: Number(match[2]) }));
  const tokenWidth = (name) => parseFloat(lib.tokens.find((token) => token.name === name)?.value);
  const widths = [
    ...sizes.map(({ width, height }) => ({ width, height, label: `${width}` })),
    { width: tokenWidth('constraint.window.width-expanded-min'), height: 800, label: 'expanded' },
    { width: tokenWidth('constraint.window.width-medium-min'), height: 800, label: 'medium' },
    { width: tokenWidth('constraint.reflow.width'), height: 640, label: '重排' },
  ].filter(({ width }) => Number.isFinite(width));
  return widths
    .sort((a, b) => b.width - a.width)
    .map(({ width, height, label }) => ({ width, height, label: label === `${width}` ? label : `${width} ${label}` }));
}

// 把例子写进 srcdoc，不让 iframe 再发请求：有些内嵌浏览器（比如 Claude 桌面应用的面板）会拦截子框架的网络加载。
// 加上 <base>，例子里的相对路径仍然指向它自己的目录。
// sandbox 要带 allow-same-origin，否则这些内嵌浏览器也会拦截例子的样式和图片。例子都是仓库自己的文件；
// sandbox 仍然阻止例子把查看器整页跳走或打开弹窗。
// 标签里的相对路径直接改成绝对路径：浏览器的预加载扫描器不看 srcdoc 里的 <base>，会先按错的路径试探一次。
function withBase(html, directory) {
  const base = `<base href="/${encodeURI(directory)}/">`;
  const absolute = html.replace(/\b(href|src)="(?![a-z][a-z0-9+.-]*:|\/|#)([^"]+)"/gi, (_, attribute, target) => (
    `${attribute}="/${encodeURI(posix.normalize(posix.join(directory, target)))}"`
  ));
  for (const pattern of [/<head[^>]*>/i, /<html[^>]*>/i, /<!doctype[^>]*>/i]) {
    if (pattern.test(absolute)) return absolute.replace(pattern, (match) => `${match}${base}`);
  }
  return `${base}${absolute}`;
}

function runnable(path, label, widths) {
  const text = read(path);
  const title = text.match(/<title>([^<]*)<\/title>/i)?.[1] ?? basename(path);
  const start = Math.max(0, widths.findIndex(({ width }) => width === 1024));
  const buttons = widths.map(({ width, height, label: name }, index) => `<button type="button" class="btn" data-width="${width}" data-height="${height}" aria-pressed="${index === start}">${h(name)}</button>`).join('');
  const url = `/${h(encodeURI(path))}`;
  return `<figure class="bench" data-bench data-width="${widths[start]?.width ?? 1280}" data-height="${widths[start]?.height ?? 800}">
    <figcaption><strong>${h(title)}</strong> <a href="${url}" target="_blank" rel="noopener">单独打开</a></figcaption>
    <div class="controls" role="group" aria-label="${h(label)}：窗口宽度">${buttons}<button type="button" class="btn" data-gray aria-pressed="false">灰阶</button></div>
    <div class="frame-box"><iframe srcdoc="${h(withBase(text, dirname(path)))}" title="${h(title)}" sandbox="allow-scripts allow-forms allow-same-origin"></iframe></div>
  </figure>`;
}

// 仓库里的 Markdown 页面

function doc(file, lib, widths) {
  const base = dirname(file);
  const tokens = new Map(lib.tokens.map((item) => [item.name, item.value]));
  const embed = (target, label) => {
    const path = posix.normalize(posix.join(base, target));
    return path.startsWith('..') || !exists(path) ? null : runnable(path, label, widths);
  };
  return `<article class="doc">${markdown(read(file), { base, tokens, embed })}<p class="meta">${source(file)}</p></article>`;
}

// 平台

const CAPABILITY_FIELDS = ['单位', '显示', '输入', '场景'];
const VERIFY_FIELDS = ['先用什么查', '最终验证'];

function platformCard(platform) {
  const base = dirname(platform.file);
  const panel = (title, body) => (body ? `<details><summary>${h(title)}</summary>${markdown(body, { base })}</details>` : '');
  return `<article class="platform"><h3><code>${h(platform.id)}</code> ${h(platform.name)}</h3>
    ${platform.intro ? markdown(platform.intro, { base }) : ''}
    ${fields(platform.capabilities, CAPABILITY_FIELDS, base)}
    ${fields(platform.verification, VERIFY_FIELDS, base)}
    ${panel('平台要求', platform.requirements)}${panel('额外状态', platform.extra)}${panel('必查', platform.checks)}
    <p class="meta">${source(platform.file)}</p></article>`;
}

function platforms(lib) {
  return section('platforms', '每个平台和别的平台不同的地方。', `<div class="platform-grid">${lib.platforms.map(platformCard).join('')}</div>`);
}

// Tokens

const segmenter = new Intl.Segmenter('zh', { granularity: 'grapheme' });
// 近似的显示宽度，只用于这里的示意。真实终端的处理以终端为准。
const WIDE = /[ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿ꀀ-꓏가-힣豈-﫿︰-﹯＀-｠￠-￦]|\p{Extended_Pictographic}/u;
const graphemes = (text) => [...segmenter.segment(text)].map(({ segment }) => ({ text: segment, width: WIDE.test(segment) ? 2 : 1 }));
const padToColumns = (text, columns) => {
  const width = graphemes(text).reduce((sum, item) => sum + item.width, 0);
  return text + ' '.repeat(Math.max(0, columns - width));
};

function fitToColumns(text, columns) {
  const cells = [];
  let used = 0;
  const all = graphemes(text);
  const total = all.reduce((sum, item) => sum + item.width, 0);
  for (const item of all) {
    if (total > columns && used + item.width > columns - 1) {
      cells.push({ text: '…', width: 1 });
      break;
    }
    cells.push(item);
    used += item.width;
  }
  return cells;
}

function terminalGrid(lines, columns, rows, label) {
  const body = Array.from({ length: rows }, (_, index) => {
    const cells = fitToColumns(lines[index] ?? '', columns)
      .map((cell) => `<span${cell.width === 2 ? ' class="w2"' : ''}>${h(cell.text)}</span>`)
      .join('');
    return `<div class="term-row">${cells}</div>`;
  }).join('');
  return `<div class="table-wrap" tabindex="0" role="region" aria-label="${h(label)}"><div class="term" style="--cols:${columns}" role="img" aria-label="${h(label)}">${body}</div></div>`;
}

function tokenSpecimens(lib) {
  const stress = lib.contentStress.text ?? {};
  const token = (name) => lib.tokens.find((item) => item.name === name);
  const number = (name) => parseFloat(token(name)?.value);
  const parts = [];

  const contrastItem = (name, sample) => (token(name)
    ? `<div class="contrast-item">${sample(number(name))}<p class="meta"><code>${h(name)}</code>：下限 ${number(name)}:1，<span data-ratio-label></span></p></div>`
    : '');
  parts.push(`<h3>对比度下限</h3><p class="meta">下面的文字和边框按当前背景算出，正好落在下限上。这只是下限，不是推荐用色。</p>
    <div class="contrast">
    ${contrastItem('constraint.contrast.text', (ratio) => `<p data-ratio="${ratio}">${h(stress['label-zh-long'] ?? '')}</p>`)}
    ${contrastItem('constraint.contrast.text-large', (ratio) => `<p class="large" data-ratio="${ratio}">${h(stress['title-mixed'] ?? '')}</p>`)}
    ${contrastItem('constraint.contrast.non-text', (ratio) => `<div class="contrast-box" data-ratio="${ratio}" data-ratio-property="borderColor"></div>`)}
    </div>`);

  const targets = lib.tokens
    .filter((item) => item.name.startsWith('constraint.target.'))
    .map((item) => ({ ...item, size: parseFloat(item.value) }))
    .filter((item) => Number.isFinite(item.size))
    .sort((a, b) => a.size - b.size);
  parts.push(`<h3>目标尺寸</h3><p class="meta">按 1 px 对应 1 pt、1 dp 或 1 epx 画出。实际物理大小取决于设备。</p>
    <div class="targets">${targets.map((item) => `<div class="target"><div class="target-box" style="width:${item.size}px;height:${item.size}px"></div><code>${h(item.name.replace('constraint.target.', ''))}</code><span class="meta">${h(item.value)}</span></div>`).join('')}</div>`);

  const ruler = (axis, title, entries, max) => {
    const stops = entries.filter((stop) => Number.isFinite(stop.from));
    const segments = stops.map((stop, index) => {
      const end = stops[index + 1]?.from ?? max;
      return `<div class="ruler-segment" style="flex:${end - stop.from} 0 0"><span>${h(stop.label)}</span></div>`;
    }).join('');
    const legend = stops.map((stop) => `${stop.label} ≥ ${stop.from}`).join('，');
    return `<h4>${h(title)}</h4><div class="ruler" data-ruler="${axis}" data-max="${max}" data-stops="${h(JSON.stringify(stops))}">${segments}<div class="ruler-marker" hidden></div></div>
      <p class="meta"><span data-ruler-output="${axis}"></span> 分界：${h(legend)}（单位 dp，这里用 CSS px 对照）。</p>`;
  };
  parts.push(`<h3>窗口尺寸类</h3><p class="meta">改变窗口大小，竖线会跟着移动。</p>
    ${ruler('width', '宽度', [
    { from: 0, label: 'compact' },
    { from: number('constraint.window.width-medium-min'), label: 'medium' },
    { from: number('constraint.window.width-expanded-min'), label: 'expanded' },
    { from: number('constraint.window.width-large-min'), label: 'large' },
    { from: number('constraint.window.width-extra-large-min'), label: 'extra-large' },
  ], 1920)}
    ${ruler('height', '高度', [
    { from: 0, label: 'compact' },
    { from: number('constraint.window.height-medium-min'), label: 'medium' },
    { from: number('constraint.window.height-expanded-min'), label: 'expanded' },
  ], 1200)}`);

  const reflow = number('constraint.reflow.width');
  if (Number.isFinite(reflow)) {
    parts.push(`<h3>重排宽度</h3><p class="meta"><code>constraint.reflow.width</code> 的实际宽度，放的是内容压力测试集里的混排段落。</p>
      <div class="reflow" style="width:min(100%,${reflow}px)">${h(stress['paragraph-mixed'] ?? '')}</div>`);
  }

  const columns = number('constraint.terminal.columns-default');
  const rows = number('constraint.terminal.rows-default');
  if (Number.isFinite(columns) && Number.isFinite(rows)) {
    const lines = [`${padToColumns('用途', 20)}内容`, ...Object.entries(stress).map(([key, value]) => `${padToColumns(key, 20)}${value}`)];
    parts.push(`<h3>终端尺寸</h3><p class="meta">示意：按字符单元排版，中文占 2 列，超出时按列截断。这不是设计方案，也不是终端验证。真实的字体和配色由用户的终端决定。</p>
      <h4>${columns} 列 × ${rows} 行</h4>${terminalGrid(lines, columns, rows, `${columns} 列、${rows} 行的终端示意`)}
      <h4>窗口变窄到 ${Math.round(columns / 2)} 列</h4>${terminalGrid(lines, Math.round(columns / 2), 8, `${Math.round(columns / 2)} 列的终端示意`)}`);
  }
  return parts.join('');
}

function tokens(lib) {
  const rows = lib.tokens.map((item) => `<tr><th scope="row"><code>${h(item.name)}</code></th><td>${swatch(item.value)}${h(item.value)}</td><td>${h(item.description)}</td><td>${h(item.platforms.join('、') || '所有')}</td><td>${h(item.status)}</td><td>${h(item.source)}</td></tr>`).join('');
  return section('tokens', `constraint 来自标准和平台规范，不是审美选择。type 除了日文字体 type.family.ja 都是提案；color 的色阶是用户选定的 Radix Colors 原值，角色除了 color.control 都是提案；space、size、stroke 是提案，radius 默认用大的是用户定的。来源：${source('tokens/katachi.tokens.json')}。`,
    `${tokenSpecimens(lib)}<h3>全部 Tokens</h3>
    <div class="table-wrap" tabindex="0" role="region" aria-label="全部 Tokens"><table class="tokens-table"><thead><tr><th scope="col">名称</th><th scope="col">值</th><th scope="col">说明</th><th scope="col">平台</th><th scope="col">状态</th><th scope="col">来源</th></tr></thead><tbody>${rows}</tbody></table></div>`);
}

// 内容压力

function content(lib) {
  const { text = {}, counts = {} } = lib.contentStress;
  const widths = [320, 600, 840];
  const buttons = [
    ...widths.map((width) => `<button type="button" class="btn" data-stress-width="${width}" aria-pressed="false">${width}</button>`),
    '<button type="button" class="btn" data-stress-width="" aria-pressed="true">不限宽</button>',
    '<button type="button" class="btn" data-stress-truncate aria-pressed="false">单行截断</button>',
  ].join('');
  const rows = Object.entries(text).map(([key, value]) => `<div class="stress-row"><code>${h(key)}</code><div class="stress-sample">${h(value)}</div></div>`).join('');
  const countRows = Object.entries(counts).map(([key, value]) => `<li><code>${h(key)}</code>：${h(value.join('、'))}</li>`).join('');
  return section('content', `用这些内容检查界面会不会被破坏。优先用产品的真实内容。来源：${source('standards/content-stress.json')}。`,
    `<div class="controls" role="group" aria-label="内容宽度和截断">${buttons}</div>
    <div class="stress" data-stress>${rows}</div>
    <h3>数量</h3><ul>${countRows}</ul>`);
}

export function renderPage() {
  const lib = readLibrary();
  const tokensCss = existsSync(OUTPUT) ? readFileSync(OUTPUT, 'utf8') : '';
  const css = readFileSync(join(HERE, 'app.css'), 'utf8');
  const js = readFileSync(join(HERE, 'app.js'), 'utf8');
  const present = SECTIONS.filter(([id]) => (id === 'patterns' ? lib.patterns.length : id === 'examples' ? lib.examples.length || exists('examples/README.md') : true));
  const nav = present.map(([id, title]) => `<li><a href="#${id}">${h(title)}</a></li>`).join('');
  const version = lib.git
    ? `分支 ${h(lib.git.branch || '（游离）')}，提交 ${h(lib.git.commit)}${lib.git.dirty ? '，有未提交的改动' : ''}`
    : '不在 Git 仓库中';
  const widths = benchWidths(lib);
  const pages = (files) => files.map((file) => doc(file, lib, widths)).join('');
  const body = [
    section('design', '', doc('DESIGN.md', lib, widths)),
    section('standards', '', pages(lib.standards)),
    lib.patterns.length ? section('patterns', '', pages(lib.patterns)) : '',
    lib.examples.length || exists('examples/README.md') ? section('examples', '', `${exists('examples/README.md') ? doc('examples/README.md', lib, widths) : ''}${pages(lib.examples)}`) : '',
    platforms(lib),
    tokens(lib),
    content(lib),
  ].join('\n');
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>katachi 查看器</title>
<style>${tokensCss}\n${css}</style>
</head>
<body>
<a class="skip" href="#design">跳到内容</a>
<div class="layout">
<aside class="side">
<h1 class="brand"><strong>katachi</strong> 查看器</h1>
<nav aria-label="章节"><ul>${nav}</ul></nav>
</aside>
<main>
<div class="notice"><p>内容由仓库生成，刷新页面就是最新的。<strong>这个页面的外观只是中性外壳，不是设计规范。</strong></p><p class="meta">${version}</p></div>
${body}
</main>
</div>
<script>${js}</script>
</body>
</html>
`;
}
