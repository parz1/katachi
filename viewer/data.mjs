// 把仓库文件读成查看器需要的数据。零依赖，只读。
import { execFileSync } from 'node:child_process';
import { basename, dirname, extname } from 'node:path';
import { ROOT, loadTokens } from '../scripts/build-tokens.mjs';
import { exists, findTable, read, stripFences, subdirectories, walk } from '../scripts/library.mjs';

const VARIANT_TYPES = new Set(['.html', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.txt']);

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

function readTaste() {
  return sectionsOf(stripFences(read('foundations/taste.md')), 2).map(({ title, body }) => ({
    title,
    entries: sectionsOf(body, 3).map((entry) => {
      const [id, ...rest] = entry.title.split(/\s+/);
      return { id, title: rest.join(' '), fields: fieldsOf(entry.body) };
    }),
  }));
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

function readPlatforms() {
  const index = read('platforms/README.md');
  const order = findTable(index, 'ID')?.rows.map((row) => row[0]) ?? [];
  const files = walk('platforms');
  const active = files
    .filter((file) => /^platforms\/[^/]+\.md$/.test(file) && file !== 'platforms/README.md')
    .map(readPlatform)
    .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  return {
    active,
    later: files.filter((file) => file.startsWith('platforms/later/') && file.endsWith('.md')).map(readPlatform),
    baseline: findTable(index, '规则'),
  };
}

function readWork(root) {
  return subdirectories(root).map((dir) => {
    const readme = exists(`${dir}/README.md`) ? read(`${dir}/README.md`) : '';
    const variants = walk(dir)
      .filter((file) => dirname(file) === dir && VARIANT_TYPES.has(extname(file).toLowerCase()))
      .map((path) => {
        const type = extname(path).toLowerCase();
        return { path, type, text: type === '.txt' || type === '.html' ? read(path) : '' };
      });
    return {
      dir,
      title: readme.match(/^# (.+)$/m)?.[1] ?? basename(dir),
      readme: readme.replace(/^# .+\n?/m, ''),
      variants,
    };
  });
}

function readReferences() {
  return walk('references')
    .filter((file) => /^references\/[^/]+\.md$/.test(file) && file !== 'references/README.md')
    .map((file) => {
      const text = read(file);
      const frontmatter = text.match(/^---\n([\s\S]*?)\n---/);
      const fields = Object.fromEntries((frontmatter?.[1] ?? '').split('\n')
        .map((line) => line.match(/^([\w-]+):\s*(.*)$/))
        .filter(Boolean)
        .map((match) => [match[1], match[2].trim()]));
      return { file, fields, body: frontmatter ? text.slice(frontmatter[0].length) : text };
    });
}

function readDecisions() {
  return walk('decisions')
    .filter((file) => /^decisions\/\d{4}-.*\.md$/.test(file))
    .sort()
    .map((file) => {
      const text = read(file);
      return {
        file,
        title: text.match(/^# (.+)$/m)?.[1] ?? basename(file),
        status: fieldsOf(text)['状态'] ?? '',
        body: text.replace(/^# .+\n?/m, ''),
      };
    });
}

function readGit() {
  const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  try {
    return { branch: git('branch', '--show-current'), commit: git('rev-parse', '--short', 'HEAD'), dirty: git('status', '--porcelain') !== '' };
  } catch {
    return null;
  }
}

export function readLibrary() {
  const readme = read('README.md');
  const patternsIndex = read('patterns/README.md');
  return {
    git: readGit(),
    maturity: findTable(readme, '内容'),
    route: findTable(readme, '阶段'),
    taste: readTaste(),
    tokens: readTokens(),
    platforms: readPlatforms(),
    patterns: {
      coverage: findTable(patternsIndex, '模式'),
      states: findTable(patternsIndex, '状态'),
      files: walk('patterns').filter((file) => file !== 'patterns/README.md' && file.endsWith('.md')),
    },
    contentStress: JSON.parse(read('foundations/content-stress.json')),
    explorations: readWork('explorations'),
    examples: readWork('examples'),
    references: readReferences(),
    assets: JSON.parse(read('assets/manifest.json')).assets ?? [],
    decisions: readDecisions(),
  };
}
