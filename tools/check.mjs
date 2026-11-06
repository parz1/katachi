// katachi 仓库一致性检查。零依赖，只读。用法：node tools/check.mjs
// 有错误时退出码为 1，警告不影响退出码。
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { OUTPUT, ROOT, loadTokens, renderCss } from './build-tokens.mjs';
import { exists, read, stripFences, stripInlineCode, subdirectories, walk } from './library.mjs';
import { renderPage } from './viewer/build.mjs';

const MB = 1024 * 1024;
const LIMITS = { agentsLines: 5, claudeLines: 3, designLines: 120, patternLines: 180, warnBytes: 1 * MB, errorBytes: 10 * MB };
const ROOT_ENTRIES = new Set(['AGENTS.md', 'CLAUDE.md', 'DESIGN.md', 'standards', 'patterns', 'examples', 'tokens', 'platforms', 'tools', '.gitignore']);
const ROOT_IGNORED = new Set(['.git', '.claude', '.DS_Store', 'node_modules']);
const DESIGN_SECTIONS = ['按任务找', '定了的', '底线', '没定的，别自己决定', '交付前'];
const PATTERN_STATUS = new Set(['draft', 'adopted', 'validated']);
const STATES = ['焦点', '选中', '禁用', '加载', '空状态', '错误', '成功'];
const PATTERN_SECTIONS = ['规则', '状态', '做完检查'];
const PLATFORM_SECTIONS = ['能力', '平台要求', '必查', '验证'];
const PLATFORM_FIELDS = ['单位', '显示', '输入', '场景', '先用什么查', '最终验证'];

const files = walk();
const markdownFiles = files.filter((file) => file.endsWith('.md'));
const patternFiles = files.filter((file) => /^patterns\/[^/]+\.md$/.test(file));
const standardFiles = files.filter((file) => /^standards\/[^/]+\.md$/.test(file));
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
  const examplesIndex = exists('examples/README.md') ? ['examples/README.md'] : [];
  const required = [...standardFiles, ...patternFiles, ...platformFiles, ...examplesIndex, 'tokens/README.md', 'tools/sediment.md'];
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

// 颜色：OKLCH 转到线性 sRGB，再按 WCAG 算对比度。
function linearSrgb([L, C, H]) {
  const angle = (H * Math.PI) / 180;
  const a = C * Math.cos(angle);
  const b = C * Math.sin(angle);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}
const clampChannels = (rgb) => rgb.map((value) => Math.min(1, Math.max(0, value)));
const contrastRatio = (one, other) => {
  const luminance = (rgb) => {
    const [r, g, b] = clampChannels(rgb);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [light, dark] = [luminance(one), luminance(other)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};
const hexOf = (rgb) => `#${clampChannels(rgb).map((value) => {
  const encoded = value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
  return Math.round(encoded * 255).toString(16).padStart(2, '0');
}).join('')}`;

function checkColors() {
  const { tokens } = loadTokens();
  const errors = [];
  const valueOf = (name) => {
    let value = tokens.get(name)?.node.$value;
    while (typeof value === 'string') value = tokens.get(value.slice(1, -1))?.node.$value;
    return value;
  };
  const isColor = (token) => (token.node.$type ?? token.inheritedType) === 'color';
  for (const [name, token] of tokens) {
    if (!isColor(token) || typeof token.node.$value === 'string') continue;
    const { colorSpace, components, hex } = token.node.$value;
    if (colorSpace !== 'oklch') {
      errors.push(`${name}：颜色要用 oklch，校验脚本才算得了对比度`);
      continue;
    }
    const rgb = linearSrgb(components);
    if (rgb.some((value) => value < -0.0005 || value > 1.0005)) errors.push(`${name}：超出 sRGB`);
    else if (hex && hex !== hexOf(rgb)) errors.push(`${name}：hex 是 ${hex}，components 算出来是 ${hexOf(rgb)}`);
  }

  // 每个声明了 contrast 的角色，在默认和纸和墨两组、浅色和深色下都要过下限。
  const floor = (name) => tokens.get(`constraint.contrast.${name}`)?.node.$value;
  let pairs = 0;
  for (const [base, overlay] of [['color.light', 'color.light'], ['color.dark', 'color.dark'], ['color.light', 'color.paper.light'], ['color.dark', 'color.paper.dark']]) {
    const role = (name) => valueOf(tokens.has(`${overlay}.${name}`) ? `${overlay}.${name}` : `${base}.${name}`);
    for (const [name, token] of tokens) {
      const spec = token.node.$extensions?.['local.katachi']?.contrast;
      if (!spec || !name.startsWith(`${base}.`)) continue;
      const foreground = name.slice(base.length + 1);
      for (const background of spec.against) {
        pairs += 1;
        const front = role(foreground);
        const back = role(background);
        if (!front || !back) {
          errors.push(`${overlay}.${foreground}：要比较的 ${background} 不存在`);
          continue;
        }
        const ratio = contrastRatio(linearSrgb(front.components), linearSrgb(back.components));
        if (ratio < floor(spec.floor)) errors.push(`${overlay}.${foreground} 在 ${background} 上的对比度是 ${ratio.toFixed(2)}，低于 ${floor(spec.floor)}`);
      }
    }
  }

  // 强调色的配方：360 个色相都要过下限，选哪个都行。
  for (const mode of ['light', 'dark']) {
    const lightness = tokens.get(`color.recipe.${mode}-l`)?.node.$value;
    const chroma = tokens.get(`color.recipe.${mode}-c`)?.node.$value;
    if (lightness === undefined || chroma === undefined) continue;
    const surfaces = ['surface', 'surface-subtle'].map((name) => linearSrgb(valueOf(`color.${mode}.${name}`).components));
    for (let hue = 0; hue < 360; hue += 1) {
      const accent = linearSrgb([lightness, chroma, hue]);
      const worst = Math.min(...surfaces.map((surface) => contrastRatio(accent, surface)));
      if (worst < floor('text')) {
        errors.push(`color.recipe.${mode}：色相 ${hue} 的对比度是 ${worst.toFixed(2)}，低于 ${floor('text')}`);
        break;
      }
    }
  }

  // tokens 和 Web 实现不能脱节。
  if (exists('standards/color/color.css')) {
    const css = read('standards/color/color.css');
    for (const name of tokens.keys()) {
      if (/^color\.(light|dark|paper\.light|paper\.dark|recipe)\./.test(name) && !css.includes(`--${name.replaceAll('.', '-')}`)) {
        errors.push(`standards/color/color.css 没有用到 ${name}`);
      }
    }
  }
  return { errors, note: `${pairs} 组配对，360 个色相` };
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
  for (const file of standardFiles) {
    const text = stripFences(read(file));
    if (!PATTERN_STATUS.has(text.match(/^- 状态：[ \t]*(\S*)/m)?.[1])) errors.push(`${file}：状态只能是 ${[...PATTERN_STATUS].join('、')}`);
    if (!/^- 来源：[ \t]*\S/m.test(text)) errors.push(`${file}：缺少「来源」`);
  }
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
    for (const state of STATES) {
      if (hasSection(text, '状态') && !new RegExp(`^\\|\\s*${state}\\s*\\|`, 'm').test(answers)) {
        errors.push(`${file}：状态一节没有回答「${state}」，没定义也要写明`);
      }
    }
  }
  return { errors, note: `${standardFiles.length} 个规范，${patternFiles.length} 个模式` };
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
  const stress = JSON.parse(read('standards/content-stress.json'));
  if (!stress.text || !stress.counts) errors.push('standards/content-stress.json 应包含 text 和 counts');
  return { errors, note: `${examples.length} 个示例` };
}

function checkViewer() {
  const page = renderPage();
  const title = (file) => read(file).match(/^# (.+)$/m)?.[1] ?? file;
  const expected = [
    title('DESIGN.md'),
    ...standardFiles.map(title),
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
  ['颜色对比度', checkColors],
  ['token 引用', checkTokenReferences],
  ['Markdown 链接', checkLinks],
  ['规范和模式', checkPatterns],
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
