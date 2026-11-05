// 校验 tokens/katachi.tokens.json，并生成 tokens/build/tokens.css。零依赖。
//   node scripts/build-tokens.mjs           校验并写入
//   node scripts/build-tokens.mjs --check   只比较，生成物过期时退出码为 1
// 只支持基本类型。组合类型（typography、shadow 等）和模式等到真正用到时再加。
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const THIS_FILE = fileURLToPath(import.meta.url);
export const ROOT = join(dirname(THIS_FILE), '..');
const SOURCE = join(ROOT, 'tokens/katachi.tokens.json');
export const OUTPUT = join(ROOT, 'tokens/build/tokens.css');

const EXTENSION_KEY = 'local.katachi';
const STATUSES = new Set(['standard', 'draft', 'adopted', 'validated']);
const META_KEYS = new Set(['$value', '$type', '$description', '$extensions', '$deprecated']);
const FONT_WEIGHTS = {
  thin: 100, hairline: 100, 'extra-light': 200, 'ultra-light': 200, light: 300,
  normal: 400, regular: 400, book: 400, medium: 500, 'semi-bold': 600, 'demi-bold': 600,
  bold: 700, 'extra-bold': 800, 'ultra-bold': 800, black: 900, heavy: 900,
  'extra-black': 950, 'ultra-black': 950,
};
const CSS_COLOR_FUNCTIONS = new Set(['hsl', 'hwb', 'lab', 'lch', 'oklab', 'oklch']);
const CSS_COLOR_SPACES = new Set([
  'srgb', 'srgb-linear', 'display-p3', 'a98-rgb', 'prophoto-rgb', 'rec2020', 'xyz-d65', 'xyz-d50',
]);

const aliasTarget = (value) =>
  typeof value === 'string' ? value.match(/^\{([^{}]+)\}$/)?.[1] : undefined;
const cssName = (dottedPath) => `--${dottedPath.replaceAll('.', '-')}`;

function colorToCss(value) {
  const { colorSpace, components, alpha } = value ?? {};
  const isFunction = CSS_COLOR_FUNCTIONS.has(colorSpace);
  if ((!isFunction && !CSS_COLOR_SPACES.has(colorSpace)) || !Array.isArray(components)) {
    throw new Error('color 的 $value 需要合法的 colorSpace 和 components');
  }
  const channels = components.join(' ');
  const suffix = alpha === undefined || alpha === 1 ? '' : ` / ${alpha}`;
  // 规范里 hex 只是后备值，这里以 components 为准。
  return isFunction
    ? `${colorSpace}(${channels}${suffix})`
    : `color(${colorSpace} ${channels}${suffix})`;
}

function valueToCss(type, value) {
  switch (type) {
    case 'number':
      if (typeof value !== 'number') throw new Error('number 的 $value 应为数字');
      return String(value);
    case 'dimension':
    case 'duration': {
      const units = type === 'dimension' ? ['px', 'rem'] : ['ms', 's'];
      if (typeof value?.value !== 'number' || !units.includes(value?.unit)) {
        throw new Error(`${type} 的 $value 应为 { value, unit }，unit 只能是 ${units.join(' 或 ')}`);
      }
      return `${value.value}${value.unit}`;
    }
    case 'color':
      return colorToCss(value);
    case 'fontFamily': {
      const names = Array.isArray(value) ? value : [value];
      if (!names.length || names.some((name) => typeof name !== 'string' || !name)) {
        throw new Error('fontFamily 的 $value 应为字符串或字符串数组');
      }
      return names.map((name) => (/^[A-Za-z-]+$/.test(name) ? name : `"${name}"`)).join(', ');
    }
    case 'fontWeight': {
      const weight = typeof value === 'string' ? FONT_WEIGHTS[value] : value;
      if (typeof weight !== 'number' || weight < 1 || weight > 1000) {
        throw new Error('fontWeight 的 $value 应为 1–1000 的数字或规范中的名称');
      }
      return String(weight);
    }
    case 'cubicBezier': {
      const valid = Array.isArray(value) && value.length === 4
        && value.every((n) => typeof n === 'number')
        && value[0] >= 0 && value[0] <= 1 && value[2] >= 0 && value[2] <= 1;
      if (!valid) throw new Error('cubicBezier 的 $value 应为 [x1, y1, x2, y2]，x 在 0–1 之间');
      return `cubic-bezier(${value.join(', ')})`;
    }
    default:
      throw new Error(`类型 ${type ?? '（未指定）'} 还不支持，真正用到时再扩展本脚本`);
  }
}

/** 展开 token 树并校验。返回 { tokens: Map<点分路径, token>, problems: string[] }。 */
export function collectTokens(tree) {
  const tokens = new Map();
  const problems = [];

  const walk = (node, path, inheritedType) => {
    const name = path.join('.') || '（根）';
    if (node === null || typeof node !== 'object' || Array.isArray(node)) {
      problems.push(`${name}：应为 token 或分组`);
      return;
    }
    const isToken = '$value' in node;
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith('$')) {
        if (!META_KEYS.has(key)) problems.push(`${name}：不支持 ${key}`);
      } else if (/[{}.]/.test(key)) {
        problems.push(`${name}：名称 "${key}" 不能包含 { } .`);
      } else if (isToken) {
        problems.push(`${name}：token 不能同时包含子项 ${key}`);
      } else {
        walk(child, [...path, key], node.$type ?? inheritedType);
      }
    }
    if (isToken) tokens.set(name, { node, inheritedType });
  };
  walk(tree, [], undefined);

  const followAlias = (start) => {
    const seen = new Set([start]);
    let target = aliasTarget(tokens.get(start).node.$value);
    while (target) {
      if (!tokens.has(target)) throw new Error(`引用的 token 不存在：${target}`);
      if (seen.has(target)) throw new Error(`循环引用：${target}`);
      seen.add(target);
      target = aliasTarget(tokens.get(target).node.$value);
    }
  };

  const cssNames = new Map();
  for (const [name, token] of tokens) {
    const { node, inheritedType } = token;
    const meta = node.$extensions?.[EXTENSION_KEY];
    if (!node.$description) problems.push(`${name}：缺少 $description`);
    if (!STATUSES.has(meta?.status)) {
      problems.push(`${name}：${EXTENSION_KEY}.status 应为 ${[...STATUSES].join('、')} 之一`);
    }
    if (!meta?.source) problems.push(`${name}：缺少 ${EXTENSION_KEY}.source`);

    token.description = node.$description ?? '';
    token.status = meta?.status;
    token.cssName = cssName(name);
    try {
      const target = aliasTarget(node.$value);
      if (target) {
        followAlias(name);
        token.css = `var(${cssName(target)})`;
      } else {
        token.css = valueToCss(node.$type ?? inheritedType, node.$value);
      }
    } catch (error) {
      problems.push(`${name}：${error.message}`);
    }

    if (cssNames.has(token.cssName)) {
      problems.push(`${name}：CSS 变量名和 ${cssNames.get(token.cssName)} 冲突`);
    }
    cssNames.set(token.cssName, name);
  }
  return { tokens, problems };
}

export function loadTokens() {
  return collectTokens(JSON.parse(readFileSync(SOURCE, 'utf8')));
}

export function renderCss(tokens) {
  const lines = ['/* 由 scripts/build-tokens.mjs 从 tokens/katachi.tokens.json 生成，不要手改。 */', ':root {'];
  for (const token of tokens.values()) {
    lines.push(`  /* ${token.description.replaceAll('*/', '* /')} [${token.status}] */`);
    lines.push(`  ${token.cssName}: ${token.css};`);
  }
  lines.push('}', '');
  return lines.join('\n');
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(THIS_FILE)) {
  const { tokens, problems } = loadTokens();
  if (problems.length) {
    console.error(problems.join('\n'));
    process.exit(1);
  }
  const css = renderCss(tokens);
  if (process.argv.includes('--check')) {
    let current = null;
    try {
      current = readFileSync(OUTPUT, 'utf8');
    } catch {
      // 文件不存在，按过期处理。
    }
    if (current !== css) {
      console.error('tokens/build/tokens.css 已过期或被手改。运行 node scripts/build-tokens.mjs');
      process.exit(1);
    }
    console.log('tokens/build/tokens.css 是最新的。');
  } else {
    mkdirSync(dirname(OUTPUT), { recursive: true });
    writeFileSync(OUTPUT, css);
    console.log(`已生成 tokens/build/tokens.css（${tokens.size} 个 token）。`);
  }
}
