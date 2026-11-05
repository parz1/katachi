// katachi 仓库一致性检查。零依赖，只读。用法：node scripts/check.mjs
// 有错误时退出码为 1，警告不影响退出码。
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize } from 'node:path';
import { OUTPUT, ROOT, loadTokens, renderCss } from './build-tokens.mjs';

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
const CODE_EXTENSIONS = new Set([
  '.html', '.css', '.js', '.mjs', '.ts', '.tsx', '.jsx', '.vue', '.svelte', '.svg', '.json', '.swift', '.kt',
]);

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const exists = (rel) => existsSync(join(ROOT, rel));
const stripFences = (text) => text.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[`~]*[ \t]*$/gm, '');
const stripInlineCode = (text) => text.replace(/`[^`\n]*`/g, '');

function walk(rel = '') {
  const found = [];
  for (const entry of readdirSync(join(ROOT, rel), { withFileTypes: true })) {
    if (['.git', 'node_modules', '.DS_Store'].includes(entry.name)) continue;
    const path = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) found.push(...walk(path));
    else found.push(path);
  }
  return found;
}

const files = walk();
const markdownFiles = files.filter((file) => file.endsWith('.md'));
const subdirectories = (rel) => (exists(rel)
  ? readdirSync(join(ROOT, rel), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `${rel}/${entry.name}`)
  : []);

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
  ['参考', checkReferences],
  ['正式素材', checkAssets],
  ['参考与产品隔离', checkIsolation],
  ['探索与示例', checkExplorationsAndExamples],
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
