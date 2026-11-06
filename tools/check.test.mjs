// tools/check.mjs 和 build-tokens.mjs 的测试。零依赖。
// 在临时副本里制造违规，确认该报错时报错、该通过时通过。不会改动仓库本身。
// 用法：node tools/check.test.mjs（改了这两个脚本后运行）
import { spawnSync } from 'node:child_process';
import { appendFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const META = { 'local.katachi': { status: 'draft', source: 'test' } };
const PATTERN = 'patterns/object-forms.md';
const EXAMPLE = 'examples/kotolog-cli/README.md';

const copyRepo = (dir) => cpSync(REPO, dir, { recursive: true, filter: (src) => basename(src) !== '.git' });
const edit = (dir, rel, fn) => writeFileSync(join(dir, rel), fn(readFileSync(join(dir, rel), 'utf8')));
const put = (dir, rel, text) => {
  mkdirSync(dirname(join(dir, rel)), { recursive: true });
  writeFileSync(join(dir, rel), text);
};
const append = (dir, rel, text) => appendFileSync(join(dir, rel), text);
const tokens = (dir, fn) => edit(dir, 'tokens/katachi.tokens.json', (text) => {
  const tree = JSON.parse(text);
  fn(tree);
  return JSON.stringify(tree, null, 2);
});
const build = (dir) => spawnSync(process.execPath, ['tools/build-tokens.mjs'], { cwd: dir, encoding: 'utf8' });
const WATCH = '# watch 手表\n\n## 能力\n\n- 单位：pt\n- 显示：很小\n- 输入：触摸\n- 场景：一瞥\n\n## 平台要求\n\n暂无。\n\n## 必查\n\n- 小屏\n\n## 验证\n\n- 先用什么查：模拟器\n- 最终验证：真机\n';
const NEW_EXAMPLE = '# 新示例\n\n- 来源：某处\n\n## 学什么\n\n- 一点\n';

// [名称, 修改方法, 预期：'pass' 或错误信息片段]
const cases = [
  ['untouched copy passes', () => {}, 'pass'],

  ['extra file at the root', (d) => put(d, 'NOTES.md', '# x\n'), '多了 NOTES.md'],
  ['extra directory at the root', (d) => put(d, 'raw/a.txt', 'x'), '多了 raw'],
  ['ignored names at the root are fine', (d) => put(d, '.DS_Store', 'x'), 'pass'],

  ['AGENTS.md too long', (d) => append(d, 'AGENTS.md', '\n行'.repeat(10)), '超过 5 行'],
  ['AGENTS.md loses the entry', (d) => put(d, 'AGENTS.md', '# katachi\n'), '没有指向 DESIGN.md'],
  ['CLAUDE.md without import', (d) => put(d, 'CLAUDE.md', '# x\n'), '@AGENTS.md'],
  ['CLAUDE.md duplicates content', (d) => append(d, 'CLAUDE.md', '\n规则'.repeat(10)), '内容应放在 AGENTS.md'],
  ['DESIGN.md too long', (d) => append(d, 'DESIGN.md', '\n行'.repeat(130)), '超过 120 行'],
  ['DESIGN.md loses a section', (d) => edit(d, 'DESIGN.md', (t) => t.replace('## 定了的', '## 已定')), '缺少「定了的」'],

  ['pattern not linked from the entry', (d) => put(d, 'patterns/x.md', '# X\n'), 'DESIGN.md 没有链接 patterns/x.md'],
  ['platform not linked from the entry', (d) => put(d, 'platforms/watch.md', WATCH), 'DESIGN.md 没有链接 platforms/watch.md'],
  ['sediment steps not linked from the entry', (d) => edit(d, 'DESIGN.md', (t) => t.replace('[沉淀步骤](tools/sediment.md)', '沉淀步骤')), 'DESIGN.md 没有链接 tools/sediment.md'],
  ['example not linked from the index', (d) => put(d, 'examples/new/README.md', NEW_EXAMPLE), 'examples/README.md 没有链接 new/README.md'],
  ['linked example passes', (d) => {
    put(d, 'examples/new/README.md', NEW_EXAMPLE);
    append(d, 'examples/README.md', '\n[新示例](new/README.md)\n');
  }, 'pass'],

  ['broken link', (d) => append(d, 'DESIGN.md', '\n[x](nope.md)\n'), '链接失效'],
  ['broken image', (d) => append(d, PATTERN, '\n![x](object-forms/nope.png)\n'), '链接失效'],
  ['absolute link', (d) => append(d, 'DESIGN.md', '\n[x](/etc/passwd)\n'), '应使用相对路径'],
  ['link inside code fence is ignored', (d) => append(d, 'DESIGN.md', '\n```markdown\n[x](nope.md)\n```\n'), 'pass'],
  ['link inside inline code is ignored', (d) => append(d, 'DESIGN.md', '\n`[x](nope.md)`\n'), 'pass'],
  ['external link is ignored', (d) => append(d, 'DESIGN.md', '\n[x](https://example.com/nope)\n'), 'pass'],

  ['hand-edited generated CSS', (d) => append(d, 'tokens/build/tokens.css', '/* edit */\n'), '已过期或被手改'],
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
  ['malformed token JSON', (d) => put(d, 'tokens/katachi.tokens.json', '{ nope'), '检查时出错'],

  ['doc names a missing token', (d) => append(d, 'DESIGN.md', '\n`constraint.contrast.nope`\n'), 'token 不存在'],
  ['pattern names a missing token', (d) => append(d, PATTERN, '\n`object.radius.nope`\n'), 'token 不存在：object.radius.nope'],
  ['doc names a token group', (d) => append(d, 'DESIGN.md', '\n`constraint.contrast`\n'), 'pass'],
  ['file name in code is not a token', (d) => append(d, 'DESIGN.md', '\n`tokens.css`\n'), 'pass'],

  ['pattern with an unknown status', (d) => edit(d, PATTERN, (t) => t.replace('- 状态：draft', '- 状态：done')), '状态只能是'],
  ['pattern without a source', (d) => edit(d, PATTERN, (t) => t.replace(/^- 来源：.*$/m, '- 来源：')), '缺少「来源」'],
  ['pattern too long', (d) => append(d, PATTERN, '\n行'.repeat(200)), '超过 180 行'],
  ['pattern must answer every state', (d) => edit(d, PATTERN, (t) => t.replace('| 禁用 |', '| 停用 |')), '没有回答「禁用」'],
  ['pattern without a state section', (d) => edit(d, PATTERN, (t) => t.replace('## 状态\n', '## 情况\n')), '缺少「状态」一节'],
  ['pattern without a final check', (d) => edit(d, PATTERN, (t) => t.replace('## 做完检查', '## 收尾')), '缺少「做完检查」一节'],
  ['state table removed from the standard', (d) => edit(d, 'standards/interaction.md', (t) => t.replace('| 状态 | 默认怎么做 |', '| 情况 | 默认怎么做 |')), '缺少状态表'],
  ['standard not linked from the entry', (d) => edit(d, 'DESIGN.md', (t) => t.replaceAll('(standards/interaction.md)', '(examples/README.md)')), 'DESIGN.md 没有链接 standards/interaction.md'],
  ['standard names a missing token', (d) => append(d, 'standards/interaction.md', '\n`interaction.nope`\n'), 'token 不存在：interaction.nope'],

  ['token for an unknown platform', (d) => tokens(d, (t) => { t.constraint.reflow.width.$extensions['local.katachi'].platforms = ['tv']; }), '未知平台 tv'],
  ['token platforms is not an array', (d) => tokens(d, (t) => { t.constraint.reflow.width.$extensions['local.katachi'].platforms = 'web'; }), 'platforms 应为'],
  ['web token aliases a non-web token', (d) => tokens(d, (t) => { t.a = { $value: '{constraint.terminal.columns-default}', $description: 'x', $extensions: META }; }), 'Web 输出'],
  ['platform file without final verification', (d) => edit(d, 'platforms/terminal.md', (t) => t.replace('- 最终验证：', '- 最后：')), '缺少「最终验证」'],
  ['platform file with an empty field', (d) => edit(d, 'platforms/mobile.md', (t) => t.replace(/- 单位：.*/, '- 单位：')), '缺少「单位」'],
  ['platform file without a section', (d) => edit(d, 'platforms/web.md', (t) => t.replace('## 必查', '## 检查')), '缺少「必查」'],
  ['platform file with a wrong title', (d) => edit(d, 'platforms/terminal.md', (t) => t.replace('# terminal 终端', '# 命令行')), '标题要以'],
  ['platform file cites a token of another platform', (d) => edit(d, 'platforms/terminal.md', (t) => t.replace('## 必查', '参考 `constraint.target.web-min`。\n\n## 必查')), 'platforms 不含 terminal'],
  ['missing web platform', (d) => {
    rmSync(join(d, 'platforms/web.md'));
    edit(d, 'DESIGN.md', (t) => t.replace('[web](platforms/web.md)', 'web'));
  }, '缺少 platforms/web.md'],
  ['complete new platform passes', (d) => {
    put(d, 'platforms/watch.md', WATCH);
    edit(d, 'DESIGN.md', (t) => t.replace('| 尺寸、圆角', '| 手表 | [watch](platforms/watch.md) |\n| 尺寸、圆角'));
  }, 'pass'],

  ['example without README', (d) => put(d, 'examples/new/a.png', 'x'), '缺少 README.md'],
  ['example without a source', (d) => edit(d, EXAMPLE, (t) => t.replace(/^- 来源：.*$/m, '- 来源：')), '缺少「来源」'],
  ['example without what to learn', (d) => edit(d, EXAMPLE, (t) => t.replace('## 学什么', '## 说明')), '缺少「学什么」'],
  ['malformed content stress file', (d) => put(d, 'examples/content-stress.json', '{ nope'), '检查时出错'],
  ['content stress file without counts', (d) => put(d, 'examples/content-stress.json', '{"text":{}}'), '应包含 text 和 counts'],

  ['viewer that cannot render fails the check', (d) => rmSync(join(d, 'tools/viewer/app.css')), '检查时出错'],
  ['file over the hard limit', (d) => put(d, 'examples/kotolog-cli/big.bin', Buffer.alloc(11 * 1024 * 1024)), '超过 10 MB'],
  ['file over the soft limit only warns', (d) => put(d, 'examples/kotolog-cli/mid.png', Buffer.alloc(2 * 1024 * 1024)), 'pass'],
];

const base = mkdtempSync(join(tmpdir(), 'katachi-check-'));
let failures = 0;
for (const [index, [name, mutate, expected]] of cases.entries()) {
  const dir = join(base, String(index));
  copyRepo(dir);
  mutate(dir);
  const run = spawnSync(process.execPath, ['tools/check.mjs'], { cwd: dir, encoding: 'utf8' });
  const ok = expected === 'pass'
    ? run.status === 0
    : run.status === 1 && run.stdout.includes(expected);
  if (!ok) {
    failures += 1;
    console.log(`未通过：${name}\n  预期：${expected}\n  退出码：${run.status}\n${run.stdout}${run.stderr}`);
  }
  rmSync(dir, { recursive: true, force: true });
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

// Web CSS 只包含适用于 Web 的 token。
const webCss = readFileSync(join(REPO, 'tokens/build/tokens.css'), 'utf8');
const webExpectations = [
  ['--constraint-target-web-min', true],
  ['--constraint-contrast-text', true],
  ['--object-radius-bar', true],
  ['--constraint-target-ios-default', false],
  ['--constraint-window-width-medium-min', false],
  ['--constraint-terminal-columns-default', false],
  ['--interaction-drag-long-press', false],
  ['--interaction-feedback-undo', true],
];
for (const [name, shouldExist] of webExpectations) {
  if (webCss.includes(name) !== shouldExist) {
    failures += 1;
    console.log(`未通过：Web CSS ${shouldExist ? '应包含' : '不应包含'} ${name}`);
  }
}

// 查看器页面：内容都显示出来，内容里的 HTML 被转义，图和例子只能来自仓库内部。
const viewerDir = join(base, 'viewer-page');
copyRepo(viewerDir);
edit(viewerDir, 'DESIGN.md', (t) => t.replace('写给正在做界面的 agent。', '写给 <img src=x onerror=alert(1)> 的 agent。'));
put(viewerDir, 'patterns/probe.md', '# 探针\n\n![外部](https://evil.example/x.png)\n\n![跳出](../../../secret.png)\n\n![引号"><script>](probe/a.png)\n\n[跳出的例子](../../../secret.html)\n');
const viewerRun = spawnSync(process.execPath, ['--input-type=module', '-e', "const { renderPage } = await import('./tools/viewer/build.mjs'); process.stdout.write(renderPage());"], { cwd: viewerDir, encoding: 'utf8', maxBuffer: 1 << 26 });
const viewerExpectations = [
  ['没定的，别自己决定', true],
  ['列表里的对象怎么打开', true],
  ['Kotolog：桌面工作台', true],
  ['交互规范', true],
  ['方向 B：线和密度', true],
  ['<img src="/examples/kotolog-object-forms/bar.png"', true],
  ['<span class="token-value">40px</span>', true],
  ['条卡页窗：最小参考实现', true],
  ['srcdoc="', true],
  ['&lt;base href=&quot;/patterns/object-forms/&quot;&gt;', true],
  ['&lt;img src=x onerror', true],
  ['<img src=x onerror', false],
  ['evil.example/x.png"', false],
  ['secret.png', false],
  ['secret.html"', false],
  ['引号"><script>', false],
];
for (const [text, shouldExist] of viewerExpectations) {
  if (viewerRun.stdout.includes(text) !== shouldExist) {
    failures += 1;
    console.log(`未通过：查看器页面${shouldExist ? '应包含' : '不应包含'} ${text}\n${viewerRun.stderr}`);
  }
}

rmSync(base, { recursive: true, force: true });
const total = cases.length + expectedCss.length + webExpectations.length + viewerExpectations.length;
console.log(`${total - failures}/${total} 项通过`);
process.exitCode = failures ? 1 : 0;
