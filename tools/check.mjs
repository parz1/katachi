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

// 颜色都写成 sRGB，按 WCAG 算对比度。
const decode = (channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
const luminance = ([r, g, b]) => 0.2126 * decode(r) + 0.7152 * decode(g) + 0.0722 * decode(b);
const contrastRatio = (one, other) => {
  const [light, dark] = [luminance(one), luminance(other)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};
const hexOf = (components) => `#${components.map((channel) => Math.round(channel * 255).toString(16).padStart(2, '0')).join('')}`;
const fromHex = (hex) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);

// standards/color/accents.css 里每条强调色：12 级，以及个别要改指向的角色。
function readAccents() {
  const accents = new Map();
  if (!exists('standards/color/accents.css')) return accents;
  for (const [, name, body] of read('standards/color/accents.css').matchAll(/:root\[data-accent="([a-z]+)"\]\s*\{([^}]*)\}/g)) {
    const values = new Map();
    for (const [, variable, light, dark] of body.matchAll(/(--color-[\w-]+):\s*light-dark\((#[0-9a-f]{6}),\s*(#[0-9a-f]{6})\)/g)) {
      values.set(variable, { light: fromHex(light), dark: fromHex(dark) });
    }
    accents.set(name, values);
  }
  return accents;
}

function checkColors() {
  const { tokens } = loadTokens();
  const errors = [];
  const metaOf = (name) => tokens.get(name)?.node.$extensions?.['local.katachi'] ?? {};
  const floor = (name) => tokens.get(`constraint.contrast.${name}`)?.node.$value;
  const isColor = (token) => (token.node.$type ?? token.inheritedType) === 'color';

  // 数值本身：要是 sRGB，范围对，hex 和 components 一致。
  for (const [name, token] of tokens) {
    if (!isColor(token)) continue;
    for (const [mode, value] of [['浅色', token.node.$value], ['深色', metaOf(name).dark]]) {
      if (value === undefined || typeof value === 'string') continue;
      if (value.colorSpace !== 'srgb') {
        errors.push(`${name}：颜色要用 srgb，校验脚本才算得了对比度`);
        continue;
      }
      if (value.components.some((channel) => channel < 0 || channel > 1)) errors.push(`${name}（${mode}）：超出 sRGB`);
      else if (value.hex && value.hex !== hexOf(value.components)) errors.push(`${name}（${mode}）：hex 是 ${value.hex}，components 算出来是 ${hexOf(value.components)}`);
    }
  }

  // 取一个角色在某种情况下的颜色。纸和墨把灰换成 sand；选了强调色时角色改指向那条色阶。
  const pick = (name, mode, { sand = false, accent } = {}) => {
    let current = name;
    for (let hops = 0; hops < 20; hops += 1) {
      const token = tokens.get(current);
      if (!token) return null;
      const meta = metaOf(current);
      const override = accent?.get(`--${current.replaceAll('.', '-')}`);
      if (override) return override[mode];
      if (accent && meta.accent !== undefined) return accent.get(`--color-hue-${meta.accent}`)?.[mode] ?? null;
      const raw = mode === 'dark' && meta.dark !== undefined ? meta.dark : token.node.$value;
      if (typeof raw === 'string') {
        current = raw.slice(1, -1);
        continue;
      }
      if (sand && current.startsWith('color.gray.')) {
        current = current.replace('color.gray.', 'color.sand.');
        sand = false;
        continue;
      }
      return raw.components;
    }
    return null;
  };

  const accents = readAccents();
  for (const [name, values] of accents) {
    for (let step = 1; step <= 12; step += 1) {
      if (!values.has(`--color-hue-${step}`)) errors.push(`standards/color/accents.css：${name} 缺第 ${step} 级`);
    }
  }

  // 每个声明了 contrast 的角色，在默认、纸和墨、每条强调色下，浅色和深色都要过下限。
  const situations = [{ label: '', options: {} }, { label: '纸和墨，', options: { sand: true } }];
  for (const [name, accent] of accents) situations.push({ label: `强调色 ${name}，`, options: { accent } });
  const withContrast = [...tokens.keys()].filter((name) => metaOf(name).contrast);
  let pairs = 0;
  for (const { label, options } of situations) {
    for (const [mode, modeLabel] of [['light', '浅色'], ['dark', '深色']]) {
      for (const name of withContrast) {
        for (const spec of metaOf(name).contrast) {
          for (const background of spec.against) {
            pairs += 1;
            const front = pick(name, mode, options);
            const back = pick(background, mode, options);
            if (!front || !back) {
              errors.push(`${name}：要比较的 ${front ? background : name} 不存在`);
              continue;
            }
            const ratio = contrastRatio(front, back);
            if (ratio < floor(spec.floor)) errors.push(`${name} 在 ${background} 上（${label}${modeLabel}）的对比度是 ${ratio.toFixed(2)}，低于 ${floor(spec.floor)}`);
          }
        }
      }
    }
  }

  // 纸和墨要把灰的 12 级都换掉，不然会混着用。
  if (exists('standards/color/color.css')) {
    const css = read('standards/color/color.css');
    for (const name of tokens.keys()) {
      const step = name.match(/^color\.gray\.(\d+)$/)?.[1];
      if (step && !css.includes(`--color-gray-${step}: var(--color-sand-${step});`)) errors.push(`standards/color/color.css 没有把 ${name} 换成纸和墨的值`);
    }
  }
  return { errors, note: `${situations.length - 2} 条强调色，${pairs} 组配对` };
}

// 间距的角色都指向阶梯上的某一级，这样换疏密时样式不用改。每种疏密下组和组都要明显比项和项远，控件不能小于目标尺寸。
function checkSpace() {
  const { tokens } = loadTokens();
  const errors = [];
  if (!tokens.has('space.item')) return { errors: ['缺少 space 这组 token'] };
  const DENSITIES = [['compact', '紧'], [undefined, '常规'], ['loose', '松']];
  const raw = (name, density) => {
    const modes = tokens.get(name)?.node.$extensions?.['local.katachi']?.modes?.density;
    return (density && modes?.[density]) ?? tokens.get(name)?.node.$value;
  };
  const toPx = (value) => {
    let current = value;
    for (let hops = 0; typeof current === 'string' && hops < 20; hops += 1) current = tokens.get(current.slice(1, -1))?.node.$value;
    if (current?.unit === 'rem') return current.value * 16;
    return typeof current === 'number' ? current : current?.value;
  };
  const names = [...tokens.keys()].filter((name) => name.startsWith('space.'));
  const steps = names.filter((name) => /^space\.\d+$/.test(name));
  const roles = names.filter((name) => !steps.includes(name));
  steps.map((name) => toPx(raw(name))).forEach((value, index, all) => {
    if (index && value <= all[index - 1]) errors.push(`${steps[index]}：阶梯要从小到大`);
  });
  for (const name of roles) {
    const sizes = DENSITIES.map(([density, label]) => {
      if (!/^\{space\.\d+\}$/.test(raw(name, density))) errors.push(`${name}（${label}）：角色要指向阶梯上的某一级，不写数值`);
      return toPx(raw(name, density));
    });
    if (!(sizes[0] <= sizes[1] && sizes[1] <= sizes[2])) errors.push(`${name}：紧、常规、松要从小到大，现在是 ${sizes.join('、')}`);
  }
  for (const [density, label] of DENSITIES) {
    const item = toPx(raw('space.item', density));
    const group = toPx(raw('space.group', density));
    if (group < item * 2) errors.push(`space.group（${label}）是 ${group}，至少是 space.item 的两倍（${item * 2}），不然看不出是两层`);
    const control = toPx(raw('size.control', density));
    const floor = toPx(raw('constraint.target.web-min'));
    if (control < floor) errors.push(`size.control（${label}）是 ${control}，低于 constraint.target.web-min（${floor}）`);
  }
  const touch = toPx(raw('size.control-touch'));
  const touchFloor = toPx(raw('constraint.target.ios-default'));
  if (touch < touchFloor) errors.push(`size.control-touch 是 ${touch}，低于 constraint.target.ios-default（${touchFloor}）`);
  return { errors, note: `${steps.length} 级阶梯，${roles.length} 个角色，3 种疏密` };
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

// 写了「状态」一节的页面，七种状态每行都要回答，没定义也要写明。
function unansweredStates(file, text) {
  if (!hasSection(text, '状态')) return [];
  const answers = text.split(/^## 状态[ \t]*$/m)[1]?.split(/^## /m)[0] ?? '';
  return STATES
    .filter((state) => !new RegExp(`^\\|\\s*${state}\\s*\\|`, 'm').test(answers))
    .map((state) => `${file}：状态一节没有回答「${state}」，没定义也要写明`);
}

function checkPatterns() {
  const errors = [];
  for (const file of standardFiles) {
    const text = stripFences(read(file));
    if (!PATTERN_STATUS.has(text.match(/^- 状态：[ \t]*(\S*)/m)?.[1])) errors.push(`${file}：状态只能是 ${[...PATTERN_STATUS].join('、')}`);
    if (!/^- 来源：[ \t]*\S/m.test(text)) errors.push(`${file}：缺少「来源」`);
    errors.push(...unansweredStates(file, text));
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
    errors.push(...unansweredStates(file, text));
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
  ['间距', checkSpace],
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
