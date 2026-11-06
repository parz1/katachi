// katachi 仓库一致性检查。零依赖，只读。用法：node scripts/check.mjs
// 有错误时退出码为 1，警告不影响退出码。
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize } from 'node:path';
import { renderPage } from '../viewer/build.mjs';
import { OUTPUT, ROOT, loadTokens, renderCss } from './build-tokens.mjs';
import { exists, findTable, read, stripFences, stripInlineCode, subdirectories, walk } from './library.mjs';

const MB = 1024 * 1024;
const LIMITS = { agentsLines: 30, claudeLines: 12, guideLines: 150, warnBytes: 1 * MB, errorBytes: 10 * MB };
const TASTE_SECTIONS = {
  明确偏好: { prefix: 'S', fields: ['原话', '日期', '范围'] },
  推测: { prefix: 'I', fields: ['证据', '验证方式', '置信度'] },
  待验证: { prefix: 'O', fields: ['比较方式'] },
};
const REFERENCE_FIELDS = ['title', 'source', 'retrieved', 'found_by', 'license'];
const ASSET_FIELDS = ['path', 'title', 'source', 'license', 'allowed_use', 'added'];
const ASSET_INFRA = new Set(['assets/README.md', 'assets/manifest.json']);
const RECORD_ITEMS = ['验证记录', '功能正确', '视觉一致', '交互可用', '未覆盖'];
const PLATFORM_SECTIONS = ['能力', '平台要求', '必查', '验证'];
const PLATFORM_FIELDS = ['单位', '显示', '输入', '场景', '先用什么查', '最终验证'];
const MATRIX_VALUES = new Set(['直接', '细化', '不适用']);
const PATTERN_VALUES = new Set(['已验证', '已映射', '不适用', '未做']);
const PATTERN_STATUS = new Set(['draft', 'adopted', 'validated']);
const CODE_EXTENSIONS = new Set([
  '.html', '.css', '.js', '.mjs', '.ts', '.tsx', '.jsx', '.vue', '.svelte', '.svg', '.json', '.swift', '.kt',
]);

const files = walk();
const markdownFiles = files.filter((file) => file.endsWith('.md'));

function checkTokens() {
  const { tokens, problems } = loadTokens();
  const errors = [...problems];
  if (!errors.length) {
    const current = existsSync(OUTPUT) ? readFileSync(OUTPUT, 'utf8') : null;
    if (current !== renderCss(tokens)) {
      errors.push('tokens/build/tokens.css 已过期或被手改。运行 node scripts/build-tokens.mjs');
    }
  }
  return { errors, note: `${tokens.size} 个 token` };
}

function checkTokenReferences() {
  const { tokens } = loadTokens();
  const names = [...tokens.keys()];
  const groups = new Set(names.map((name) => name.split('.')[0]));
  const errors = [];
  let count = 0;
  for (const file of markdownFiles) {
    for (const [, reference] of stripFences(read(file)).matchAll(/`([A-Za-z][\w-]*(?:\.[\w-]+)+)`/g)) {
      if (!groups.has(reference.split('.')[0])) continue;
      count += 1;
      if (!names.some((name) => name === reference || name.startsWith(`${reference}.`))) {
        errors.push(`${file}：token 不存在：${reference}`);
      }
    }
  }
  return { errors, note: `${count} 处引用` };
}

function checkLinks() {
  const errors = [];
  let count = 0;
  for (const file of markdownFiles) {
    const text = stripInlineCode(stripFences(read(file)));
    for (const [, target] of text.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#')) continue;
      count += 1;
      if (target.startsWith('/')) {
        errors.push(`${file}：应使用相对路径：${target}`);
        continue;
      }
      const path = decodeURI(target.split('#')[0]);
      if (!exists(normalize(join(dirname(file), path)))) errors.push(`${file}：链接失效：${target}`);
    }
  }
  return { errors, note: `${count} 个相对链接` };
}

function checkEntries() {
  const errors = [];
  const lines = (text) => text.trimEnd().split('\n').length;
  const agents = read('AGENTS.md');
  const claude = read('CLAUDE.md');
  const guide = read('AGENT_GUIDE.md');
  if (lines(agents) > LIMITS.agentsLines) errors.push(`AGENTS.md 超过 ${LIMITS.agentsLines} 行，入口要保持简短`);
  if (!agents.includes('AGENT_GUIDE.md')) errors.push('AGENTS.md 没有指向 AGENT_GUIDE.md');
  if (lines(claude) > LIMITS.claudeLines) errors.push(`CLAUDE.md 超过 ${LIMITS.claudeLines} 行，内容应放在 AGENTS.md`);
  if (!/^@AGENTS\.md[ \t]*$/m.test(claude)) errors.push('CLAUDE.md 缺少 @AGENTS.md 导入');
  if (lines(guide) > LIMITS.guideLines) errors.push(`AGENT_GUIDE.md 超过 ${LIMITS.guideLines} 行`);

  const chain = agents.match(/优先级：(.+)$/m)?.[1];
  if (!chain) {
    errors.push('AGENTS.md 缺少「优先级：A > B > …」这一行');
  } else {
    for (const level of chain.split(/\s*>\s*/)) {
      if (!guide.includes(level.trim())) errors.push(`AGENT_GUIDE.md 的优先级表缺少「${level.trim()}」，和 AGENTS.md 不一致`);
    }
  }
  return { errors };
}

function checkTaste() {
  const errors = [];
  const seen = new Set();
  const present = new Set();
  const counts = {};
  for (const section of stripFences(read('foundations/taste.md')).split(/^## /m).slice(1)) {
    const title = section.split('\n', 1)[0].trim();
    const rule = TASTE_SECTIONS[title];
    if (!rule) {
      errors.push(`未知章节：${title}`);
      continue;
    }
    present.add(title);
    counts[title] = 0;
    for (const entry of section.split(/^### /m).slice(1)) {
      const heading = entry.split('\n', 1)[0];
      const id = heading.match(/^([A-Z]+-\d{3})(\s|$)/)?.[1];
      if (!id) {
        errors.push(`条目标题要以 ID 开头：${heading}`);
        continue;
      }
      counts[title] += 1;
      if (!id.startsWith(`${rule.prefix}-`)) errors.push(`${id} 不应放在「${title}」`);
      if (seen.has(id)) errors.push(`${id} 重复`);
      seen.add(id);
      for (const field of rule.fields) {
        if (!new RegExp(`^- ${field}：[ \\t]*\\S`, 'm').test(entry)) errors.push(`${id} 缺少「${field}」`);
      }
    }
  }
  for (const title of Object.keys(TASTE_SECTIONS)) {
    if (!present.has(title)) errors.push(`缺少章节：${title}`);
  }
  return {
    errors,
    note: Object.keys(TASTE_SECTIONS).map((title) => `${title} ${counts[title] ?? 0}`).join('，'),
  };
}

function checkTableColumns(errors, label, table, ids) {
  const columns = table.header.slice(1);
  for (const id of ids) {
    if (!columns.includes(id)) errors.push(`${label}缺少 ${id} 列`);
  }
  for (const column of columns) {
    if (!ids.includes(column)) errors.push(`${label}有未知的平台列 ${column}`);
  }
  return columns;
}

function checkPlatforms() {
  const errors = [];
  const ids = files
    .filter((file) => /^platforms\/[^/]+\.md$/.test(file) && file !== 'platforms/README.md')
    .map((file) => file.slice('platforms/'.length, -'.md'.length));
  if (!ids.includes('web')) errors.push('缺少 platforms/web.md，Web CSS 的输出依赖这个 ID');

  const requirements = new Map();
  for (const id of ids) {
    const file = `platforms/${id}.md`;
    const text = stripFences(read(file));
    if (!text.startsWith(`# ${id} `)) errors.push(`${file}：标题要以「# ${id} 」开头`);
    for (const section of PLATFORM_SECTIONS) {
      if (!new RegExp(`^## ${section}[ \\t]*$`, 'm').test(text)) errors.push(`${file}：缺少「${section}」`);
    }
    for (const field of PLATFORM_FIELDS) {
      if (!new RegExp(`^- ${field}：[ \\t]*\\S`, 'm').test(text)) errors.push(`${file}：缺少「${field}」`);
    }
    requirements.set(id, text.split(/^## 平台要求[ \t]*$/m)[1]?.split(/^## /m)[0] ?? '');
  }

  const { tokens } = loadTokens();
  for (const [name, token] of tokens) {
    for (const id of token.platforms ?? []) {
      if (!ids.includes(id)) errors.push(`${name}：未知平台 ${id}，先新建 platforms/${id}.md`);
    }
  }
  for (const id of ids) {
    for (const [, reference] of stripFences(read(`platforms/${id}.md`)).matchAll(/`([A-Za-z][\w-]*(?:\.[\w-]+)+)`/g)) {
      const platforms = tokens.get(reference)?.platforms;
      if (platforms && !platforms.includes(id)) {
        errors.push(`platforms/${id}.md 引用了 ${reference}，但它的 platforms 不含 ${id}`);
      }
    }
  }

  const index = read('platforms/README.md');
  const listed = findTable(index, 'ID');
  for (const id of ids) {
    if (!listed?.rows.some((row) => row[0] === id)) errors.push(`platforms/README.md 的平台列表缺少 ${id}`);
  }

  const matrix = findTable(index, '规则');
  if (!matrix) {
    errors.push('platforms/README.md 缺少基线表格');
  } else {
    const columns = checkTableColumns(errors, 'platforms/README.md 的基线表格', matrix, ids);
    const rules = [...read('foundations/baseline.md').matchAll(/^### (BASE-\d+)/gm)].map((match) => match[1]);
    for (const rule of rules) {
      const row = matrix.rows.find((cells) => cells[0].split(/\s+/)[0] === rule);
      if (!row) {
        errors.push(`platforms/README.md 的基线表格缺少 ${rule}`);
        continue;
      }
      columns.forEach((id, position) => {
        const value = row[position + 1];
        if (!MATRIX_VALUES.has(value)) {
          errors.push(`基线表格里 ${rule} 的 ${id} 只能是 ${[...MATRIX_VALUES].join('、')}`);
          return;
        }
        const mentioned = new RegExp(`${rule}(?!\\d)`).test(requirements.get(id) ?? '');
        if (value === '直接' && mentioned) errors.push(`platforms/${id}.md 写了 ${rule}，但基线表格标为「直接」`);
        if (value !== '直接' && !mentioned) errors.push(`基线表格把 ${id} 的 ${rule} 标为「${value}」，但 platforms/${id}.md 的平台要求里没有说明`);
      });
    }
  }

  const patterns = findTable(read('patterns/README.md'), '模式');
  if (!patterns) {
    errors.push('patterns/README.md 缺少应用面表格');
  } else {
    const columns = checkTableColumns(errors, 'patterns/README.md 的应用面表格', patterns, ids);
    for (const row of patterns.rows) {
      columns.forEach((id, position) => {
        if (!PATTERN_VALUES.has(row[position + 1])) {
          errors.push(`patterns/README.md：${row[0]} 的 ${id} 只能是 ${[...PATTERN_VALUES].join('、')}`);
        }
      });
    }
  }
  return { errors, note: `${ids.length} 个平台` };
}

function checkPatterns() {
  const errors = [];
  const pages = files.filter((file) => /^patterns\/[^/]+\.md$/.test(file) && file !== 'patterns/README.md');
  const index = read('patterns/README.md');
  const states = findTable(index, '状态')?.rows.map((row) => row[0]) ?? [];
  const coverage = findTable(index, '模式')?.rows.map((row) => row[0]) ?? [];
  for (const file of pages) {
    const text = stripFences(read(file));
    const status = text.match(/^- 状态：[ \t]*(\S*)/m)?.[1];
    if (!PATTERN_STATUS.has(status)) errors.push(`${file}：状态只能是 ${[...PATTERN_STATUS].join('、')}`);
    if (!/^- 来源：[ \t]*\S/m.test(text)) errors.push(`${file}：缺少「来源」`);
    const answers = text.split(/^## 状态[ \t]*$/m)[1]?.split(/^## /m)[0];
    if (answers === undefined) {
      errors.push(`${file}：缺少「状态」一节`);
    } else {
      for (const state of states) {
        if (!new RegExp(`^\\|\\s*${state}\\s*\\|`, 'm').test(answers)) errors.push(`${file}：状态一节没有回答「${state}」，没定义也要写明`);
      }
    }
    if (!coverage.some((cell) => cell.includes(`(${file.slice('patterns/'.length)})`))) errors.push(`patterns/README.md 的应用面表格没有链接 ${file}`);
  }
  return { errors, note: `${pages.length} 个模式` };
}

function checkContentStress() {
  const { text, counts } = JSON.parse(read('foundations/content-stress.json'));
  const errors = [];
  if (!text || !counts) errors.push('foundations/content-stress.json 应包含 text 和 counts');
  return { errors, note: `${Object.keys(text ?? {}).length} 条文本` };
}

function checkReferences() {
  const errors = [];
  const notes = files.filter((file) => /^references\/[^/]+\.md$/.test(file) && file !== 'references/README.md');
  const noteTexts = [];
  for (const note of notes) {
    const text = read(note);
    noteTexts.push(text);
    const frontmatter = text.match(/^---\n([\s\S]*?)\n---/)?.[1];
    if (!frontmatter) {
      errors.push(`${note}：缺少 frontmatter`);
      continue;
    }
    const fields = Object.fromEntries(frontmatter.split('\n')
      .map((line) => line.match(/^([\w-]+):\s*(.*)$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2].trim()]));
    for (const field of REFERENCE_FIELDS) {
      if (!fields[field]) errors.push(`${note}：缺少 ${field}`);
    }
    if (fields.found_by && !['user', 'agent'].includes(fields.found_by)) {
      errors.push(`${note}：found_by 只能是 user 或 agent`);
    }
    if (fields.image && !exists(`references/${fields.image}`)) errors.push(`${note}：图片不存在：${fields.image}`);
  }
  for (const file of files.filter((path) => path.startsWith('references/') && !path.endsWith('.md'))) {
    if (!file.startsWith('references/images/')) {
      errors.push(`${file}：非 Markdown 文件要放在 references/images/`);
    } else if (!noteTexts.some((text) => text.includes(file.slice('references/'.length)))) {
      errors.push(`${file}：没有笔记引用它，来源无法追溯`);
    }
  }
  return { errors, note: `${notes.length} 条` };
}

function checkAssets() {
  const errors = [];
  const entries = JSON.parse(read('assets/manifest.json')).assets;
  if (!Array.isArray(entries)) return { errors: ['assets/manifest.json 的 assets 应为数组'] };
  for (const [index, entry] of entries.entries()) {
    const label = entry.path ?? `第 ${index + 1} 项`;
    for (const field of ASSET_FIELDS) {
      if (!entry[field]) errors.push(`assets/manifest.json：${label} 缺少 ${field}`);
    }
    if (/unknown|未知|待确认/i.test(entry.license ?? '')) errors.push(`assets/manifest.json：${label} 授权不明，不能放进正式素材`);
    if (entry.path && !exists(`assets/${entry.path}`)) errors.push(`assets/manifest.json：${label} 文件不存在`);
  }
  const registered = entries.map((entry) => String(entry.path ?? '').replace(/\/$/, '')).filter(Boolean);
  for (const file of files.filter((path) => path.startsWith('assets/') && !ASSET_INFRA.has(path))) {
    const rel = file.slice('assets/'.length);
    if (!registered.some((path) => rel === path || rel.startsWith(`${path}/`))) {
      errors.push(`${file}：没有登记在 assets/manifest.json`);
    }
  }
  return { errors, note: `${entries.length} 个已登记` };
}

function checkIsolation() {
  const errors = [];
  for (const file of files.filter((path) => /^(assets|examples|tokens)\//.test(path) && CODE_EXTENSIONS.has(extname(path)))) {
    if (/(^|[\s"'`(=/])references\//m.test(read(file))) {
      errors.push(`${file}：不能引用 references/，产品只能使用 assets/ 里已登记的素材`);
    }
  }
  return { errors };
}

function checkExplorationsAndExamples() {
  const errors = [];
  const explorations = subdirectories('explorations');
  const examples = subdirectories('examples');
  for (const dir of explorations) {
    if (!exists(`${dir}/README.md`)) errors.push(`${dir}：缺少 README.md（记录方案、选择和理由）`);
  }
  for (const dir of examples) {
    if (!exists(`${dir}/README.md`)) {
      errors.push(`${dir}：缺少 README.md（要写验证记录）`);
      continue;
    }
    const text = read(`${dir}/README.md`);
    for (const item of RECORD_ITEMS) {
      if (!text.includes(item)) errors.push(`${dir}/README.md：缺少「${item}」`);
    }
  }
  return { errors, note: `探索 ${explorations.length}，示例 ${examples.length}` };
}

function checkViewer() {
  const page = renderPage();
  const platformFiles = files.filter((file) => /^platforms\/[^/]+\.md$/.test(file) && file !== 'platforms/README.md');
  const patternFiles = files.filter((file) => /^patterns\/[^/]+\.md$/.test(file) && file !== 'patterns/README.md');
  const expected = [
    ...patternFiles.map((file) => read(file).match(/^# (.+)$/m)?.[1] ?? file),
    ...[...stripFences(read('foundations/taste.md')).matchAll(/^### ([A-Z]+-\d{3})/gm)].map((match) => match[1]),
    ...loadTokens().tokens.keys(),
    ...platformFiles.map((file) => file.slice('platforms/'.length, -'.md'.length)),
  ];
  const errors = expected.filter((item) => !page.includes(item)).map((item) => `查看器页面缺少 ${item}`);
  return { errors, note: `页面 ${Math.round(page.length / 1024)} KB` };
}

function checkSizes() {
  const errors = [];
  const warnings = [];
  for (const file of files) {
    const { size } = statSync(join(ROOT, file));
    const label = `${file}：${(size / MB).toFixed(1)} MB`;
    if (size > LIMITS.errorBytes) errors.push(`${label}，超过 ${LIMITS.errorBytes / MB} MB`);
    else if (size > LIMITS.warnBytes) warnings.push(`${label}，Git 历史不会忘记它，确认确实需要`);
  }
  return { errors, warnings, note: `${files.length} 个文件` };
}

const checks = [
  ['tokens', checkTokens],
  ['token 引用', checkTokenReferences],
  ['Markdown 链接', checkLinks],
  ['agent 入口', checkEntries],
  ['审美账本', checkTaste],
  ['平台', checkPlatforms],
  ['模式', checkPatterns],
  ['内容压力测试集', checkContentStress],
  ['参考', checkReferences],
  ['正式素材', checkAssets],
  ['参考与产品隔离', checkIsolation],
  ['探索与示例', checkExplorationsAndExamples],
  ['查看器', checkViewer],
  ['文件体积', checkSizes],
];

let failed = false;
for (const [name, run] of checks) {
  let result;
  try {
    result = run();
  } catch (error) {
    result = { errors: [`检查时出错：${error.message}`] };
  }
  const { errors = [], warnings = [], note } = result;
  console.log(`${errors.length ? '✗' : '✓'} ${name}${note ? `（${note}）` : ''}`);
  for (const message of errors) console.log(`    错误：${message}`);
  for (const message of warnings) console.log(`    警告：${message}`);
  if (errors.length) failed = true;
}
console.log(failed ? '\n未通过。' : '\n全部通过。');
process.exitCode = failed ? 1 : 0;
