// katachi 仓库一致性检查。零依赖，只读。用法：node tools/check.mjs
// 有错误时退出码为 1，警告不影响退出码。
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { OUTPUT, ROOT, loadTokens, renderCss } from './build-tokens.mjs';
import { exists, findTable, read, stripFences, stripInlineCode, subdirectories, walk } from './library.mjs';
import { renderPage } from './viewer/build.mjs';

const MB = 1024 * 1024;
const LIMITS = { agentsLines: 5, claudeLines: 3, designLines: 120, patternLines: 180, warnBytes: 1 * MB, errorBytes: 10 * MB };
const ROOT_ENTRIES = new Set(['AGENTS.md', 'CLAUDE.md', 'DESIGN.md', 'patterns', 'examples', 'tokens', 'platforms', 'tools', '.gitignore']);
const ROOT_IGNORED = new Set(['.git', '.claude', '.DS_Store', 'node_modules']);
const DESIGN_SECTIONS = ['按任务找', '定了的', '底线', '没定的，别自己决定', '交付前'];
const PATTERN_STATUS = new Set(['draft', 'adopted', 'validated']);
const PATTERN_SECTIONS = ['规则', '状态', '做完检查'];
const PLATFORM_SECTIONS = ['能力', '平台要求', '必查', '验证'];
const PLATFORM_FIELDS = ['单位', '显示', '输入', '场景', '先用什么查', '最终验证'];

const files = walk();
const markdownFiles = files.filter((file) => file.endsWith('.md'));
const patternFiles = files.filter((file) => /^patterns\/[^/]+\.md$/.test(file));
const platformFiles = files.filter((file) => /^platforms\/[^/]+\.md$/.test(file));
const lineCount = (text) => text.trimEnd().split('\n').length;
const hasSection = (text, title) => new RegExp(`^## ${title}[ \\t]*$`, 'm').test(text);

// 根目录只放 agent 能直接用的东西，这样入口不会被别的东西淹没。
function checkRoot() {
  const extra = readdirSync(ROOT).filter((name) => !ROOT_ENTRIES.has(name) && !ROOT_IGNORED.has(name));
  return { errors: extra.map((name) => `根目录只放 ${[...ROOT_ENTRIES].join('、')}，多了 ${name}`) };
}

function checkEntries() {
  const errors = [];
  const agents = read('AGENTS.md');
  const claude = read('CLAUDE.md');
  const design = read('DESIGN.md');
  if (lineCount(agents) > LIMITS.agentsLines) errors.push(`AGENTS.md 超过 ${LIMITS.agentsLines} 行，内容应放在 DESIGN.md`);
  if (!agents.includes('DESIGN.md')) errors.push('AGENTS.md 没有指向 DESIGN.md');
  if (lineCount(claude) > LIMITS.claudeLines) errors.push(`CLAUDE.md 超过 ${LIMITS.claudeLines} 行，内容应放在 AGENTS.md`);
  if (!/^@AGENTS\.md[ \t]*$/m.test(claude)) errors.push('CLAUDE.md 缺少 @AGENTS.md 导入');
  if (lineCount(design) > LIMITS.designLines) errors.push(`DESIGN.md 超过 ${LIMITS.designLines} 行，入口要一页说完`);
  for (const title of DESIGN_SECTIONS) {
    if (!hasSection(design, title)) errors.push(`DESIGN.md 缺少「${title}」`);
  }
  return { errors };
}

// agent 从入口走，走不到的页面等于不存在。
function checkFindable() {
  const errors = [];
  const design = read('DESIGN.md');
  const required = [...patternFiles, ...platformFiles, 'tokens/README.md', 'examples/README.md', 'tools/sediment.md'];
  for (const file of required) {
    if (!design.includes(`(${file})`)) errors.push(`DESIGN.md 没有链接 ${file}`);
  }
  const index = exists('examples/README.md') ? read('examples/README.md') : '';
  const examples = subdirectories('examples');
  for (const dir of examples) {
    const target = `${dir.slice('examples/'.length)}/README.md`;
    if (!index.includes(`(${target})`)) errors.push(`examples/README.md 没有链接 ${target}`);
  }
  return { errors, note: `${required.length + examples.length} 个页面` };
}

function checkTokens() {
  const { tokens, problems } = loadTokens();
  const errors = [...problems];
  if (!errors.length) {
    const current = existsSync(OUTPUT) ? readFileSync(OUTPUT, 'utf8') : null;
    if (current !== renderCss(tokens)) {
      errors.push('tokens/build/tokens.css 已过期或被手改。运行 node tools/build-tokens.mjs');
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

function checkPatterns() {
  const errors = [];
  const states = findTable(read('DESIGN.md'), '状态')?.rows.map((row) => row[0]) ?? [];
  if (!states.length) errors.push('DESIGN.md 缺少状态清单');
  for (const file of patternFiles) {
    const raw = read(file);
    const text = stripFences(raw);
    if (lineCount(raw) > LIMITS.patternLines) errors.push(`${file}：超过 ${LIMITS.patternLines} 行，来源和记录放到 notes.md`);
    if (!PATTERN_STATUS.has(text.match(/^- 状态：[ \t]*(\S*)/m)?.[1])) errors.push(`${file}：状态只能是 ${[...PATTERN_STATUS].join('、')}`);
    if (!/^- 来源：[ \t]*\S/m.test(text)) errors.push(`${file}：缺少「来源」`);
    for (const title of PATTERN_SECTIONS) {
      if (!hasSection(text, title)) errors.push(`${file}：缺少「${title}」一节`);
    }
    const answers = text.split(/^## 状态[ \t]*$/m)[1]?.split(/^## /m)[0] ?? '';
    for (const state of states) {
      if (hasSection(text, '状态') && !new RegExp(`^\\|\\s*${state}\\s*\\|`, 'm').test(answers)) {
        errors.push(`${file}：状态一节没有回答「${state}」，没定义也要写明`);
      }
    }
  }
  return { errors, note: `${patternFiles.length} 个模式` };
}

function checkPlatforms() {
  const errors = [];
  const ids = platformFiles.map((file) => file.slice('platforms/'.length, -'.md'.length));
  if (!ids.includes('web')) errors.push('缺少 platforms/web.md，Web CSS 的输出依赖这个 ID');
  for (const id of ids) {
    const file = `platforms/${id}.md`;
    const text = stripFences(read(file));
    if (!text.startsWith(`# ${id} `)) errors.push(`${file}：标题要以「# ${id} 」开头`);
    for (const section of PLATFORM_SECTIONS) {
      if (!hasSection(text, section)) errors.push(`${file}：缺少「${section}」`);
    }
    for (const field of PLATFORM_FIELDS) {
      if (!new RegExp(`^- ${field}：[ \\t]*\\S`, 'm').test(text)) errors.push(`${file}：缺少「${field}」`);
    }
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
  return { errors, note: `${ids.length} 个平台` };
}

function checkExamples() {
  const errors = [];
  const examples = subdirectories('examples');
  for (const dir of examples) {
    if (!exists(`${dir}/README.md`)) {
      errors.push(`${dir}：缺少 README.md`);
      continue;
    }
    const text = stripFences(read(`${dir}/README.md`));
    if (!/^- 来源：[ \t]*\S/m.test(text)) errors.push(`${dir}/README.md：缺少「来源」`);
    if (!hasSection(text, '学什么')) errors.push(`${dir}/README.md：缺少「学什么」`);
  }
  const stress = JSON.parse(read('examples/content-stress.json'));
  if (!stress.text || !stress.counts) errors.push('examples/content-stress.json 应包含 text 和 counts');
  return { errors, note: `${examples.length} 个示例` };
}

function checkViewer() {
  const page = renderPage();
  const title = (file) => read(file).match(/^# (.+)$/m)?.[1] ?? file;
  const expected = [
    title('DESIGN.md'),
    ...patternFiles.map(title),
    ...subdirectories('examples').map((dir) => title(`${dir}/README.md`)),
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
  ['根目录', checkRoot],
  ['入口', checkEntries],
  ['能从入口找到', checkFindable],
  ['tokens', checkTokens],
  ['token 引用', checkTokenReferences],
  ['Markdown 链接', checkLinks],
  ['模式', checkPatterns],
  ['平台', checkPlatforms],
  ['示例', checkExamples],
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
