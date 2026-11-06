// 把仓库文件读成查看器需要的数据。零依赖，只读。
import { execFileSync } from 'node:child_process';
import { ROOT, loadTokens } from '../build-tokens.mjs';
import { exists, read, stripFences, subdirectories, walk } from '../library.mjs';

const fieldsOf = (block) => Object.fromEntries(
  [...block.matchAll(/^- ([^：\n]+)：[ \t]*(.*)$/gm)].map((match) => [match[1], match[2]]),
);

function sectionsOf(text, level) {
  const pattern = new RegExp(`^${'#'.repeat(level)} `, 'm');
  return text.split(pattern).slice(1).map((chunk) => {
    const end = chunk.indexOf('\n');
    return end < 0
      ? { title: chunk.trim(), body: '' }
      : { title: chunk.slice(0, end).trim(), body: chunk.slice(end + 1) };
  });
}

function readTokens() {
  return [...loadTokens().tokens].map(([name, token]) => ({
    name,
    value: token.css ?? '',
    type: token.node.$type ?? token.inheritedType ?? '',
    description: token.description,
    status: token.status ?? '',
    source: token.node.$extensions?.['local.katachi']?.source ?? '',
    platforms: token.platforms ?? [],
  }));
}

function readPlatform(file) {
  const text = stripFences(read(file));
  const [id, ...name] = text.split('\n', 1)[0].replace(/^#\s*/, '').split(/\s+/);
  const parts = new Map(sectionsOf(text, 2).map(({ title, body }) => [title, body.trim()]));
  return {
    file,
    id,
    name: name.join(' '),
    intro: text.slice(text.indexOf('\n') + 1).split(/^## /m)[0].trim(),
    capabilities: fieldsOf(parts.get('能力') ?? ''),
    requirements: parts.get('平台要求') ?? '',
    checks: parts.get('必查') ?? '',
    extra: parts.get('额外状态') ?? '',
    verification: fieldsOf(parts.get('验证') ?? ''),
  };
}

// 平台按 DESIGN.md 里第一次出现的先后排列。
function readPlatforms() {
  const design = read('DESIGN.md');
  return walk('platforms')
    .filter((file) => file.endsWith('.md'))
    .sort((a, b) => design.indexOf(`(${a})`) - design.indexOf(`(${b})`))
    .map(readPlatform);
}

function readGit() {
  const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  try {
    return { branch: git('branch', '--show-current'), commit: git('rev-parse', '--short', 'HEAD'), dirty: git('status', '--porcelain') !== '' };
  } catch {
    return null;
  }
}

// 只取目录第一层的 Markdown，子目录放的是页面引用的东西。
const pagesIn = (dir) => (exists(dir)
  ? walk(dir).filter((file) => file.endsWith('.md') && !file.slice(dir.length + 1).includes('/'))
  : []);

// 示例按 examples/README.md 里的先后排列。
function readExamples() {
  const index = exists('examples/README.md') ? read('examples/README.md') : '';
  const position = (file) => index.indexOf(`(${file.slice('examples/'.length)})`);
  return subdirectories('examples')
    .map((dir) => `${dir}/README.md`)
    .filter(exists)
    .sort((a, b) => position(a) - position(b));
}

export function readLibrary() {
  return {
    git: readGit(),
    tokens: readTokens(),
    platforms: readPlatforms(),
    // 规范按 DESIGN.md 里第一次出现的先后排列，这也是从基础往上建的顺序。
    standards: pagesIn('standards').sort((a, b) => read('DESIGN.md').indexOf(`(${a})`) - read('DESIGN.md').indexOf(`(${b})`)),
    patterns: pagesIn('patterns'),
    examples: readExamples(),
    contentStress: JSON.parse(read('standards/content-stress.json')),
  };
}
