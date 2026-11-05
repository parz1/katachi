// scripts/check.mjs 和 build-tokens.mjs 的测试。零依赖。
// 在临时副本里制造违规，确认该报错时报错、该通过时通过。不会改动仓库本身。
// 用法：node scripts/check.test.mjs（改了这两个脚本后运行）
import { spawnSync } from 'node:child_process';
import { appendFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const META = { 'local.katachi': { status: 'draft', source: 'test' } };

const copyRepo = (dir) => cpSync(REPO, dir, { recursive: true, filter: (src) => basename(src) !== '.git' });
const edit = (dir, rel, fn) => writeFileSync(join(dir, rel), fn(readFileSync(join(dir, rel), 'utf8')));
const put = (dir, rel, text) => {
  mkdirSync(dirname(join(dir, rel)), { recursive: true });
  writeFileSync(join(dir, rel), text);
};
const tokens = (dir, fn) => edit(dir, 'tokens/katachi.tokens.json', (text) => {
  const tree = JSON.parse(text);
  fn(tree);
  return JSON.stringify(tree, null, 2);
});
const build = (dir) => spawnSync(process.execPath, ['scripts/build-tokens.mjs'], { cwd: dir, encoding: 'utf8' });
const GOOD_RECORD = '## 验证记录\n- 功能正确：通过\n- 视觉一致：未检查\n- 交互可用：未检查\n- 未覆盖：全部\n';
const NOTE = (extra = '') => `---\ntitle: T\nsource: https://example.com\nretrieved: 2026-11-05\nfound_by: user\nlicense: unknown-study-only\n${extra}---\n\n## 用户的判断\n\n具体内容\n`;
const ASSET = (fields) => JSON.stringify({ assets: [{ path: 'logo.svg', title: 'L', source: 'self-made', license: 'owned', allowed_use: 'all', added: '2026-11-05', ...fields }] });

// [名称, 修改方法, 预期：'pass' 或错误信息片段]
const cases = [
  ['untouched copy passes', () => {}, 'pass'],

  ['broken link', (d) => appendFileSync(join(d, 'README.md'), '\n[x](nope.md)\n'), '链接失效'],
  ['absolute link', (d) => appendFileSync(join(d, 'README.md'), '\n[x](/etc/passwd)\n'), '应使用相对路径'],
  ['link inside code fence is ignored', (d) => appendFileSync(join(d, 'README.md'), '\n```markdown\n[x](nope.md)\n```\n'), 'pass'],
  ['link inside inline code is ignored', (d) => appendFileSync(join(d, 'README.md'), '\n`[x](nope.md)`\n'), 'pass'],
  ['external link is ignored', (d) => appendFileSync(join(d, 'README.md'), '\n[x](https://example.com/nope)\n'), 'pass'],

  ['hand-edited generated CSS', (d) => appendFileSync(join(d, 'tokens/build/tokens.css'), '/* edit */\n'), '已过期或被手改'],
  ['missing generated CSS', (d) => rmSync(join(d, 'tokens/build/tokens.css')), '已过期或被手改'],
  ['source changed without rebuild', (d) => tokens(d, (t) => { t.constraint.contrast.text.$value = 7; }), '已过期或被手改'],
  ['source changed and rebuilt', (d) => { tokens(d, (t) => { t.constraint.contrast.text.$value = 7; }); build(d); }, 'pass'],
  ['token without status', (d) => tokens(d, (t) => { delete t.constraint.contrast.text.$extensions['local.katachi'].status; }), 'status'],
  ['token without source', (d) => tokens(d, (t) => { delete t.constraint.contrast.text.$extensions['local.katachi'].source; }), 'source'],
  ['token without description', (d) => tokens(d, (t) => { delete t.constraint.contrast.text.$description; }), '$description'],
  ['token with children', (d) => tokens(d, (t) => { t.constraint.contrast.text.child = { $value: 1 }; }), '不能同时包含子项'],
  ['bad token name', (d) => tokens(d, (t) => { t.constraint['a.b'] = { $type: 'number', $value: 1, $description: 'x', $extensions: META }; }), '不能包含'],
  ['alias to missing token', (d) => tokens(d, (t) => { t.a = { $value: '{no.such}', $description: 'x', $extensions: META }; }), '引用的 token 不存在'],
  ['alias cycle', (d) => tokens(d, (t) => {
    t.a = { $value: '{b}', $description: 'x', $extensions: META };
    t.b = { $value: '{a}', $description: 'x', $extensions: META };
  }), '循环引用'],
  ['dimension in pt', (d) => tokens(d, (t) => { t.a = { $type: 'dimension', $value: { value: 1, unit: 'pt' }, $description: 'x', $extensions: META }; }), 'unit 只能是'],
  ['untyped token', (d) => tokens(d, (t) => { t.a = { $value: 1, $description: 'x', $extensions: META }; }), '未指定'],
  ['unsupported composite type', (d) => tokens(d, (t) => { t.a = { $type: 'typography', $value: {}, $description: 'x', $extensions: META }; }), '还不支持'],
  ['unsupported $root', (d) => tokens(d, (t) => { t.constraint.$root = { $value: 1 }; }), '不支持 $root'],
  ['CSS name collision', (d) => tokens(d, (t) => {
    t['x-y'] = { $type: 'number', $value: 1, $description: 'x', $extensions: META };
    t.x = { y: { $type: 'number', $value: 1, $description: 'x', $extensions: META } };
  }), '冲突'],
  ['malformed JSON', (d) => put(d, 'tokens/katachi.tokens.json', '{ nope'), '检查时出错'],

  ['doc names a missing token', (d) => appendFileSync(join(d, 'foundations/baseline.md'), '\n`constraint.contrast.nope`\n'), 'token 不存在'],
  ['doc names a token group', (d) => appendFileSync(join(d, 'foundations/baseline.md'), '\n`constraint.contrast`\n'), 'pass'],
  ['file name in code is not a token', (d) => appendFileSync(join(d, 'foundations/baseline.md'), '\n`tokens.css`\n'), 'pass'],

  ['AGENTS.md too long', (d) => appendFileSync(join(d, 'AGENTS.md'), '\n行'.repeat(40)), '超过 30 行'],
  ['AGENTS.md loses the guide', (d) => edit(d, 'AGENTS.md', (t) => t.replaceAll('AGENT_GUIDE.md', 'OTHER.md')), '没有指向'],
  ['AGENTS.md priority line removed', (d) => edit(d, 'AGENTS.md', (t) => t.replace('优先级：', '顺序：')), '缺少「优先级'],
  ['priority drift between entry and guide', (d) => edit(d, 'AGENT_GUIDE.md', (t) => t.replace('已采用的产品规范', '产品规范')), '不一致'],
  ['CLAUDE.md without import', (d) => edit(d, 'CLAUDE.md', (t) => t.replace('@AGENTS.md\n', '')), '@AGENTS.md'],
  ['CLAUDE.md duplicates content', (d) => appendFileSync(join(d, 'CLAUDE.md'), '\n规则'.repeat(20)), '内容应放在 AGENTS.md'],
  ['guide too long', (d) => appendFileSync(join(d, 'AGENT_GUIDE.md'), '\n行'.repeat(80)), '超过 150 行'],

  ['stated preference without a quote', (d) => edit(d, 'foundations/taste.md', (t) => t.replace('- 原话：「不要直接替我选定一套流行风格。」\n', '')), '缺少「原话」'],
  ['stated preference with an empty quote', (d) => edit(d, 'foundations/taste.md', (t) => t.replace('- 原话：「不要直接替我选定一套流行风格。」', '- 原话：')), '缺少「原话」'],
  ['inference filed as stated', (d) => edit(d, 'foundations/taste.md', (t) => t.replace('### S-001', '### I-099')), '不应放在'],
  ['duplicate id', (d) => edit(d, 'foundations/taste.md', (t) => t.replace('### S-002', '### S-001')), '重复'],
  ['entry without id', (d) => edit(d, 'foundations/taste.md', (t) => t.replace('### S-001 ', '### ')), '要以 ID 开头'],
  ['inference without evidence', (d) => edit(d, 'foundations/taste.md', (t) => t.replace(/- 证据：.*\n/, '')), '缺少「证据」'],
  ['open item without comparison', (d) => edit(d, 'foundations/taste.md', (t) => t.replace(/- 比较方式：.*\n/, '')), '缺少「比较方式」'],
  ['unknown section', (d) => edit(d, 'foundations/taste.md', (t) => t.replace('## 推测', '## 猜测')), '未知章节'],
  ['example heading in a fence is ignored', (d) => edit(d, 'foundations/taste.md', (t) => t.replace('## 明确偏好', '```\n### S-999 fake\n```\n\n## 明确偏好')), 'pass'],

  ['valid reference with image', (d) => {
    put(d, 'references/good.md', NOTE('image: images/good.png\n'));
    put(d, 'references/images/good.png', 'x');
  }, 'pass'],
  ['reference without license', (d) => put(d, 'references/bad.md', NOTE().replace('license: unknown-study-only\n', '')), '缺少 license'],
  ['reference without frontmatter', (d) => put(d, 'references/bad.md', '# no frontmatter\n'), '缺少 frontmatter'],
  ['reference with bad found_by', (d) => put(d, 'references/bad.md', NOTE().replace('found_by: user', 'found_by: someone')), 'found_by'],
  ['reference pointing at a missing image', (d) => put(d, 'references/bad.md', NOTE('image: images/none.png\n')), '图片不存在'],
  ['orphan reference image', (d) => put(d, 'references/images/orphan.png', 'x'), '没有笔记引用'],
  ['image outside references/images', (d) => put(d, 'references/stray.png', 'x'), '要放在 references/images/'],

  ['unregistered asset', (d) => put(d, 'assets/logo.svg', '<svg/>'), '没有登记'],
  ['registered asset', (d) => {
    put(d, 'assets/logo.svg', '<svg/>');
    put(d, 'assets/manifest.json', ASSET({}));
  }, 'pass'],
  ['registered bundle directory', (d) => {
    put(d, 'assets/App.icon/icon.json', '{}');
    put(d, 'assets/App.icon/Assets/a.png', 'x');
    put(d, 'assets/manifest.json', ASSET({ path: 'App.icon' }));
  }, 'pass'],
  ['asset with unknown license', (d) => {
    put(d, 'assets/logo.svg', '<svg/>');
    put(d, 'assets/manifest.json', ASSET({ license: 'unknown' }));
  }, '授权不明'],
  ['asset missing a field', (d) => {
    put(d, 'assets/logo.svg', '<svg/>');
    put(d, 'assets/manifest.json', ASSET({ allowed_use: undefined }));
  }, '缺少 allowed_use'],
  ['manifest entry without a file', (d) => put(d, 'assets/manifest.json', ASSET({ path: 'gone.svg' })), '文件不存在'],

  ['approved example with a record', (d) => {
    put(d, 'examples/page/README.md', GOOD_RECORD);
    put(d, 'examples/page/index.html', '<img src="../../assets/logo.svg">');
  }, 'pass'],
  ['example pulling from references', (d) => {
    put(d, 'examples/page/README.md', GOOD_RECORD);
    put(d, 'examples/page/index.html', '<img src="../../references/images/a.png">');
  }, '不能引用 references/'],
  ['example README may cite references', (d) => put(d, 'examples/page/README.md', `${GOOD_RECORD}\n[来源](../../references/README.md)\n`), 'pass'],
  ['example without README', (d) => put(d, 'examples/page/index.html', '<p>'), '缺少 README.md'],
  ['example without a verification record', (d) => put(d, 'examples/page/README.md', '# page\n'), '缺少「验证记录」'],
  ['exploration without README', (d) => put(d, 'explorations/2026-11-x/a.html', '<p>'), '缺少 README.md'],
  ['exploration with README', (d) => {
    put(d, 'explorations/2026-11-x/a.html', '<p>');
    put(d, 'explorations/2026-11-x/README.md', '# x\n');
  }, 'pass'],

  ['file over the hard limit', (d) => put(d, 'references/images/big.bin', Buffer.alloc(11 * 1024 * 1024)), '超过 10 MB'],
  ['file over the soft limit only warns', (d) => {
    put(d, 'references/images/mid.png', Buffer.alloc(2 * 1024 * 1024));
    put(d, 'references/mid.md', NOTE('image: images/mid.png\n'));
  }, 'pass'],
];

const base = mkdtempSync(join(tmpdir(), 'katachi-check-'));
let failures = 0;
for (const [index, [name, mutate, expected]] of cases.entries()) {
  const dir = join(base, String(index));
  copyRepo(dir);
  mutate(dir);
  const run = spawnSync(process.execPath, ['scripts/check.mjs'], { cwd: dir, encoding: 'utf8' });
  const ok = expected === 'pass'
    ? run.status === 0
    : run.status === 1 && run.stdout.includes(expected);
  if (!ok) {
    failures += 1;
    console.log(`未通过：${name}\n  预期：${expected}\n  退出码：${run.status}\n${run.stdout}${run.stderr}`);
  }
}

// 现在还没用到的 token 类型，也要确认输出正确。
const dir = join(base, 'types');
copyRepo(dir);
tokens(dir, (t) => {
  const meta = { $description: 'x', $extensions: META };
  t.sample = {
    srgb: { $type: 'color', $value: { colorSpace: 'srgb', components: [0.2, 0.4, 0.6], hex: '#336699' }, ...meta },
    translucent: { $type: 'color', $value: { colorSpace: 'oklch', components: [0.7, 0.1, 200], alpha: 0.5 }, ...meta },
    p3: { $type: 'color', $value: { colorSpace: 'display-p3', components: [1, 0, 'none'] }, ...meta },
    alias: { $value: '{sample.srgb}', ...meta },
    chained: { $value: '{sample.alias}', ...meta },
    fast: { $type: 'duration', $value: { value: 120, unit: 'ms' }, ...meta },
    gap: { $type: 'dimension', $value: { value: 0.5, unit: 'rem' }, ...meta },
    body: { $type: 'fontFamily', $value: ['PingFang SC', 'Inter', 'sans-serif'], ...meta },
    bold: { $type: 'fontWeight', $value: 'semi-bold', ...meta },
    w: { $type: 'fontWeight', $value: 450, ...meta },
    ease: { $type: 'cubicBezier', $value: [0.2, 0, 0, 1], ...meta },
  };
});
const built = build(dir);
const css = readFileSync(join(dir, 'tokens/build/tokens.css'), 'utf8');
const expectedCss = [
  '--sample-srgb: color(srgb 0.2 0.4 0.6);',
  '--sample-translucent: oklch(0.7 0.1 200 / 0.5);',
  '--sample-p3: color(display-p3 1 0 none);',
  '--sample-alias: var(--sample-srgb);',
  '--sample-chained: var(--sample-alias);',
  '--sample-fast: 120ms;',
  '--sample-gap: 0.5rem;',
  '--sample-body: "PingFang SC", Inter, sans-serif;',
  '--sample-bold: 600;',
  '--sample-w: 450;',
  '--sample-ease: cubic-bezier(0.2, 0, 0, 1);',
];
for (const line of expectedCss) {
  if (built.status !== 0 || !css.includes(line)) {
    failures += 1;
    console.log(`未通过：token 输出 ${line}\n${built.stderr}`);
  }
}

rmSync(base, { recursive: true, force: true });
const total = cases.length + expectedCss.length;
console.log(`${total - failures}/${total} 项通过`);
process.exitCode = failures ? 1 : 0;
