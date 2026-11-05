// 从仓库内容生成查看器页面。零依赖。
// 页面内容全部来自仓库文件，这里只负责排版，不写任何规范内容。
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OUTPUT } from '../scripts/build-tokens.mjs';
import { readLibrary } from './data.mjs';
import { escapeHtml as h, inline, markdown } from './markdown.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SECTIONS = [
  ['overview', '总览'],
  ['work', '探索与示例'],
  ['taste', '审美账本'],
  ['platforms', '平台'],
  ['tokens', 'Tokens'],
  ['patterns', '模式与状态'],
  ['content', '内容压力'],
  ['sources', '参考与素材'],
  ['decisions', '决策'],
];

const section = (id, intro, body) => {
  const title = SECTIONS.find(([key]) => key === id)[1];
  return `<section id="${id}" aria-labelledby="${id}-title"><h2 id="${id}-title">${h(title)}</h2>${intro ? `<p class="intro">${intro}</p>` : ''}${body}</section>`;
};
const empty = (text) => `<p class="empty">${text}</p>`;
const source = (path) => `<a href="/${h(encodeURI(path))}"><code>${h(path)}</code></a>`;

function table(parsed, label, { base = '', rowHeader = true } = {}) {
  if (!parsed) return '';
  const head = parsed.header.map((cell) => `<th scope="col">${inline(cell, base)}</th>`).join('');
  const body = parsed.rows.map((row) => `<tr>${row.map((cell, index) => (index === 0 && rowHeader
    ? `<th scope="row">${inline(cell, base)}</th>`
    : `<td>${inline(cell, base)}</td>`)).join('')}</tr>`).join('');
  return `<div class="table-wrap" tabindex="0" role="region" aria-label="${h(label)}"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function fields(values, order, base = '') {
  const rows = order
    .filter((key) => values[key])
    .map((key) => `<dt>${h(key)}</dt><dd>${inline(values[key], base)}</dd>`)
    .join('');
  return rows ? `<dl class="fields">${rows}</dl>` : '';
}

// 总览

function overview(lib) {
  const group = (title) => lib.taste.find((item) => item.title === title)?.entries.length ?? 0;
  const stats = [
    ['明确偏好', group('明确偏好')],
    ['推测', group('推测')],
    ['待验证', group('待验证')],
    ['Tokens', lib.tokens.length],
    ['当前平台', lib.platforms.active.length],
    ['暂缓平台', lib.platforms.later.length],
    ['模式', lib.patterns.files.length],
    ['探索', lib.explorations.length],
    ['认可的示例', lib.examples.length],
    ['参考', lib.references.length],
    ['正式素材', lib.assets.length],
    ['决策', lib.decisions.length],
  ];
  const cells = stats.map(([label, value]) => `<div class="stat"><span class="stat-value">${value}</span><span class="stat-label">${h(label)}</span></div>`).join('');
  return section('overview', '', `<div class="stats">${cells}</div>
    <h3>成熟度</h3>${table(lib.maturity, '成熟度')}
    <h3>路线</h3>${table(lib.route, '路线')}`);
}

// 探索与示例

function benchWidths(lib) {
  const web = lib.platforms.active.find((platform) => platform.id === 'web');
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

// 把方案内容写进 srcdoc，不让 iframe 再发请求：有些内嵌浏览器（比如 Claude 桌面应用的面板）会拦截子框架的网络加载。
// 加上 <base>，方案里的相对路径仍然指向它自己的目录。
// sandbox 要带 allow-same-origin，否则这些内嵌浏览器也会拦截方案的样式和图片。方案都是仓库自己的文件；
// sandbox 仍然阻止方案把查看器整页跳走或打开弹窗。
function withBase(html, directory) {
  const base = `<base href="/${encodeURI(directory)}/">`;
  for (const pattern of [/<head[^>]*>/i, /<html[^>]*>/i, /<!doctype[^>]*>/i]) {
    if (pattern.test(html)) return html.replace(pattern, (match) => `${match}${base}`);
  }
  return `${base}${html}`;
}

function variant(file) {
  const name = basename(file.path);
  const url = `/${h(encodeURI(file.path))}`;
  const label = file.type === '.html' ? file.text.match(/<title>([^<]*)<\/title>/i)?.[1] : '';
  let content;
  if (file.type === '.html') {
    content = `<div class="frame-box"><iframe srcdoc="${h(withBase(file.text, dirname(file.path)))}" title="${h(label || name)}" sandbox="allow-scripts allow-forms allow-same-origin"></iframe></div>`;
  } else if (file.type === '.txt') {
    // 按字符单元排版，中文才能和英文对齐。纯文本留给读屏和复制。
    const lines = file.text.replace(/\n$/, '').split('\n');
    const columns = Math.max(1, ...lines.map((line) => graphemes(line).reduce((sum, item) => sum + item.width, 0)));
    content = `${terminalGrid(lines, columns, lines.length, `${name}，${columns} 列的文本示意`)}<pre class="visually-hidden">${h(file.text)}</pre>`;
  } else {
    content = `<img class="variant-image" src="${url}" alt="${h(name)}">`;
  }
  return `<figure class="variant"><figcaption>${label ? `<strong>${h(label)}</strong> ` : ''}<code>${h(name)}</code> <a href="${url}" target="_blank" rel="noopener">单独打开</a></figcaption>${content}</figure>`;
}

function bench(item, widths, { notesOpen = false } = {}) {
  const hasPages = item.variants.some((file) => file.type === '.html');
  const widthButtons = hasPages ? widths.map(({ width, height, label }, index) => `<button type="button" class="btn" data-width="${width}" data-height="${height}" aria-pressed="${index === 0}">${h(label)}</button>`).join('') : '';
  const stack = item.variants.length > 1 ? '<button type="button" class="btn" data-stack aria-pressed="false">单列放大</button>' : '';
  const controls = item.variants.length
    ? `<div class="controls" role="group" aria-label="比较方式">${widthButtons}<button type="button" class="btn" data-gray aria-pressed="false">灰阶</button>${stack}</div>`
    : '';
  const grid = item.variants.length ? `<div class="bench-grid">${item.variants.map(variant).join('')}</div>` : '';
  const notes = item.readme.trim() ? `<details class="notes"${notesOpen ? ' open' : ''}><summary>记录</summary>${markdown(item.readme, { base: item.dir })}</details>` : '';
  return `<article class="bench" data-bench data-width="${widths[0]?.width ?? 1280}" data-height="${widths[0]?.height ?? 800}"><h4>${inline(item.title, item.dir)}</h4><p class="meta">${source(item.dir)}</p>${controls}${grid}${notes}</article>`;
}

function work(lib) {
  const widths = benchWidths(lib);
  const explorations = lib.explorations.length
    ? lib.explorations.map((item) => bench(item, widths, { notesOpen: true })).join('')
    : empty('还没有探索方案。第一轮比较开始后，方案会显示在这里，可以切换窗口宽度，也可以打开灰阶。');
  const examples = lib.examples.length
    ? lib.examples.map((item) => bench(item, widths)).join('')
    : empty('还没有认可的示例。用户认可的界面和它的验证记录会显示在这里。');
  return section('work', '探索还没有得到认可；示例已经得到认可，并带有验证记录。', `<h3>探索中</h3>${explorations}<h3>认可的示例</h3>${examples}`);
}

// 审美账本

const TASTE_FIELDS = {
  明确偏好: ['范围', '日期'],
  推测: ['证据', '验证方式', '置信度'],
  待验证: ['比较方式'],
};
const TASTE_INTROS = {
  明确偏好: '用户亲口说过，附原话。只有这一类才算偏好。',
  推测: 'Agent 根据证据的猜测，不能当成偏好。',
  待验证: '还没有决定，要靠比较来回答。',
};

function tasteEntry(entry, group) {
  const quote = entry.fields['原话'] ? `<blockquote>${inline(entry.fields['原话'])}</blockquote>` : '';
  return `<article class="entry"><h4><code>${h(entry.id)}</code> ${inline(entry.title)}</h4>${quote}${fields(entry.fields, TASTE_FIELDS[group] ?? [])}</article>`;
}

function taste(lib) {
  const groups = lib.taste.map((group) => `<div class="taste-group"><h3>${h(group.title)} <span class="count">${group.entries.length}</span></h3><p class="meta">${h(TASTE_INTROS[group.title] ?? '')}</p>${group.entries.map((entry) => tasteEntry(entry, group.title)).join('')}</div>`).join('');
  return section('taste', `来源：${source('foundations/taste.md')}。还没有做过视觉比较，下面的明确偏好都来自文字需求。`, groups);
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
  const later = lib.platforms.later.length
    ? `<h3>暂缓</h3><ul>${lib.platforms.later.map((platform) => `<li>${h(platform.name || platform.id)}：${source(platform.file)}</li>`).join('')}</ul>`
    : '';
  return section('platforms', `每个平台分别处理，上面放通用层。来源：${source('platforms/README.md')}。`,
    `<div class="platform-grid">${lib.platforms.active.map(platformCard).join('')}</div>
    <h3>基线表格</h3><p class="meta">每条通用基线在各平台上的做法写在哪里，不代表已经验证。</p>
    ${table(lib.platforms.baseline, '基线表格')}${later}`);
}

// Tokens

const segmenter = new Intl.Segmenter('zh', { granularity: 'grapheme' });
// 近似的显示宽度，只用于这里的示意。真实终端的处理以终端为准。
const WIDE = /[ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿ꀀ-꓏가-힣豈-﫿︰-﹯＀-｠￠-￦]|\p{Extended_Pictographic}/u;
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
    const lines = [`${padToColumns('ID', 7)}${padToColumns('类型', 10)}标题`];
    for (const group of lib.taste) {
      for (const entry of group.entries) lines.push(`${padToColumns(entry.id, 7)}${padToColumns(group.title, 10)}${entry.title}`);
    }
    parts.push(`<h3>终端尺寸</h3><p class="meta">示意：按字符单元排版，中文占 2 列，超出时按列截断。这不是设计方案，也不是终端验证。真实的字体和配色由用户的终端决定。</p>
      <h4>${columns} 列 × ${rows} 行</h4>${terminalGrid(lines, columns, rows, `${columns} 列、${rows} 行的终端示意`)}
      <h4>窗口变窄到 ${Math.round(columns / 2)} 列</h4>${terminalGrid(lines, Math.round(columns / 2), 8, `${Math.round(columns / 2)} 列的终端示意`)}`);
  }
  return parts.join('');
}

function tokens(lib) {
  const rows = lib.tokens.map((item) => `<tr><th scope="row"><code>${h(item.name)}</code></th><td>${h(item.value)}</td><td>${h(item.description)}</td><td>${h(item.platforms.join('、') || '所有')}</td><td>${h(item.status)}</td><td>${h(item.source)}</td></tr>`).join('');
  return section('tokens', `这些数值来自标准和平台规范，不是审美选择。颜色、字体和间距要等校准后才有。来源：${source('tokens/katachi.tokens.json')}。`,
    `${tokenSpecimens(lib)}<h3>全部 Tokens</h3>
    <div class="table-wrap" tabindex="0" role="region" aria-label="全部 Tokens"><table class="tokens-table"><thead><tr><th scope="col">名称</th><th scope="col">值</th><th scope="col">说明</th><th scope="col">平台</th><th scope="col">状态</th><th scope="col">来源</th></tr></thead><tbody>${rows}</tbody></table></div>`);
}

// 模式与状态

function patterns(lib) {
  const files = lib.patterns.files.length
    ? `<ul>${lib.patterns.files.map((file) => `<li>${source(file)}</li>`).join('')}</ul>`
    : empty('还没有模式。模式要从真实界面中提炼。');
  return section('patterns', `来源：${source('patterns/README.md')}。`,
    `<h3>模式文件</h3>${files}<h3>应用面</h3>${table(lib.patterns.coverage, '模式的应用面')}
    <h3>状态清单</h3><p class="meta">每个交互模式都要回答这些问题。</p>${table(lib.patterns.states, '状态清单')}`);
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
  return section('content', `用这些内容检查界面会不会被破坏。优先用产品的真实内容。来源：${source('foundations/content-stress.json')}。`,
    `<div class="controls" role="group" aria-label="内容宽度和截断">${buttons}</div>
    <div class="stress" data-stress>${rows}</div>
    <h3>数量</h3><ul>${countRows}</ul>`);
}

// 参考与素材

function sources(lib) {
  const references = lib.references.length
    ? lib.references.map((item) => {
      const title = item.fields.title ?? basename(item.file);
      const link = /^https?:\/\//.test(item.fields.source ?? '') ? `<a href="${h(item.fields.source)}" target="_blank" rel="noopener noreferrer">${h(item.fields.source)}</a>` : h(item.fields.source ?? '');
      return `<article class="entry"><h4>${h(title)}</h4><p class="meta">${link} · 来自 ${h(item.fields.found_by ?? '未知')} · 授权 ${h(item.fields.license ?? '未知')}</p>${markdown(item.body, { base: 'references' })}</article>`;
    }).join('')
    : empty('还没有参考。参考只用来学习判断，不能直接进入产品。');
  const assets = lib.assets.length
    ? `<ul>${lib.assets.map((item) => `<li>${h(item.title ?? item.path)}：<code>${h(item.path)}</code>，授权 ${h(item.license ?? '未知')}，${h(item.allowed_use ?? '')}</li>`).join('')}</ul>`
    : empty('还没有正式素材。正式素材要登记来源和授权。');
  return section('sources', '', `<h3>参考</h3>${references}<h3>正式素材</h3>${assets}`);
}

// 决策

function decisions(lib) {
  const items = lib.decisions.map((item) => `<details><summary>${inline(item.title)} <span class="meta">${inline(item.status)}</span></summary>${markdown(item.body, { base: 'decisions' })}</details>`).join('');
  return section('decisions', `来源：${source('decisions/')}。`, items);
}

export function renderPage() {
  const lib = readLibrary();
  const tokensCss = existsSync(OUTPUT) ? readFileSync(OUTPUT, 'utf8') : '';
  const css = readFileSync(join(HERE, 'app.css'), 'utf8');
  const js = readFileSync(join(HERE, 'app.js'), 'utf8');
  const nav = SECTIONS.map(([id, title]) => `<li><a href="#${id}">${h(title)}</a></li>`).join('');
  const version = lib.git
    ? `分支 ${h(lib.git.branch || '（游离）')}，提交 ${h(lib.git.commit)}${lib.git.dirty ? '，有未提交的改动' : ''}`
    : '不在 Git 仓库中';
  const body = [overview, work, taste, platforms, tokens, patterns, content, sources, decisions].map((render) => render(lib)).join('\n');
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>katachi 查看器</title>
<style>${tokensCss}\n${css}</style>
</head>
<body>
<a class="skip" href="#overview">跳到内容</a>
<div class="layout">
<aside class="side">
<h1 class="brand"><strong>katachi</strong> 查看器</h1>
<nav aria-label="章节"><ul>${nav}</ul></nav>
</aside>
<main>
<div class="notice"><p>内容由仓库生成，刷新页面就是最新的。<strong>这个页面的外观只是中性外壳，不是 katachi 的视觉规范。</strong></p><p class="meta">${version}</p></div>
${body}
</main>
</div>
<script>${js}</script>
</body>
</html>
`;
}
