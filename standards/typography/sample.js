// 排版样例的内容，3 种排法完全相同，大多取自 ../content-stress.json。排法不同的地方写在各页的样式里。
(() => {
  'use strict';
  const NAME = document.title;
  const main = document.createElement('main');
  main.innerHTML = `
    <div class="bar t-caption" id="bar"><span id="status">${NAME}</span></div>
    <article class="article">
      <p class="mode t-caption">阅读</p>
      <h1 class="t-title-l">用 Claude 和 Codex 在 3 个 iOS 项目里复用 Design Tokens</h1>
      <p class="byline t-ui">阿依古丽·买买提艾力 · 2026 年 11 月 5 日 14:30</p>
      <div class="body">
        <p class="t-read">三个项目各存一份颜色和间距，改一处要改三遍，还总有一份忘了改。这个季度我们把它们收成一份 Design Tokens，让 Claude 和 Codex 都从同一个地方读，新页面不用再问「这个灰到底是哪个灰」。</p>
        <p class="t-read">升级到 v2.4.0 后，API 的默认超时从 30 秒改为 10 秒。如果你在 CI 中调用 <code class="t-mono">/v1/sync</code>，请检查 retry 配置；请求过多时会返回 HTTP 429，并在 Retry-After 中给出等待时间（单位：秒）。</p>
        <blockquote class="t-read">他问：「这份《设计规范》（第 2 版）能用吗？」我说——先看看……再决定！</blockquote>
        <h2 class="t-title-s">旧数据怎么办</h2>
        <p class="t-read">这个版本把原本分散在三个页面的同步设置合并到了一处。旧数据会在首次启动时自动迁移，迁移期间可以继续浏览，但<strong>暂时不能编辑</strong>。如果迁移失败，应用会保留原始数据并提示你重试，不会覆盖任何内容。</p>
        <p class="t-read" lang="en">This release consolidates sync settings that used to live on three separate screens. Existing data migrates automatically on first launch; you can keep browsing during migration, but editing is paused until it finishes. If migration fails, the app keeps the original data and prompts you to retry, so nothing gets overwritten.</p>
      </div>
    </article>
    <section>
      <p class="mode t-caption">操作</p>
      <label class="t-ui" for="field"><strong>仅在连接到受信任的无线网络时自动同步附件</strong></label>
      <input class="input t-ui" id="field" lang="en" value="Automatically sync attachments only when connected to a trusted wireless network">
      <p class="hint t-caption">3 分钟前 · 2026 年 11 月 5 日 14:30</p>
      <p class="error t-ui">无法保存：网络连接已断开。你的修改仍保留在本页，恢复连接后可以重试。</p>
      <div class="controls">
        <button class="btn primary t-ui" type="button">保存修改</button>
        <button class="btn t-ui" type="button">取消</button>
        <button class="btn t-ui" type="button" lang="en">Settings</button>
      </div>
    </section>
    <section>
      <p class="mode t-caption">扫读</p>
      <h2 class="t-title-m">最近的文档</h2>
      <ul class="rows">
        <li class="t-ui"><strong>关于调整第四季度跨部门协作流程以及相关审批权限的补充说明（第二次修订）</strong><span class="t-caption">李雷 · 3 分钟前</span></li>
        <li class="t-ui" lang="en"><strong>Supplementary Notes on Revising the Cross-Department Collaboration Process and Related Approval Permissions for Q4</strong><span class="t-caption">Alexandria Montgomery-Featherstonehaugh · Nov 5, 2026, 2:30 PM</span></li>
        <li class="t-ui"><strong>2026年11月产品评审_最终版_final_v3_修订_不要再改了.pdf</strong><span class="t-caption">阿依古丽·买买提艾力 · 3 minutes ago</span></li>
      </ul>
    </section>
    <section>
      <p class="mode t-caption">比对</p>
      <table class="t-data">
        <thead><tr><th scope="col">项目</th><th class="num" scope="col">数量</th><th class="num" scope="col">金额</th><th class="num" scope="col">变化</th></tr></thead>
        <tbody>
          <tr><td>苹果 Apple</td><td class="num">3</td><td class="num">¥12.50</td><td class="num">-12.5%</td></tr>
          <tr><td>有机冷榨特级初榨橄榄油（意大利产）750ml 买二送一限时特惠装</td><td class="num">12</td><td class="num">¥12,345.60</td><td class="num">+8.0%</td></tr>
          <tr><td>年度授权</td><td class="num">1</td><td class="num">¥1,222,209.79</td><td class="num">0.0%</td></tr>
        </tbody>
        <tfoot><tr><td>合计 Total</td><td class="num">16</td><td class="num">¥1,234,567.89</td><td class="num"></td></tr></tfoot>
      </table>
      <p class="checksum t-caption">校验值 <code class="t-mono">a3f9c2e87b1d4f60a3f9c2e87b1d4f60</code></p>
    </section>`;
  document.body.append(main);

  const status = document.getElementById('status');
  const bar = document.getElementById('bar');
  const warn = (families) => {
    bar.classList.add('warn');
    status.textContent = `${NAME}：字体没有从网络加载（${families.join('、')}），看到的可能不是这个样例。检查网络后刷新，或单独打开这个页面。`;
  };
  // 样式表没加载时没有对应的字体，fonts.check 仍然返回 true；fonts.load 这时返回空，所以用它判断。
  const check = async (families) => {
    const loaded = await Promise.all(families.map((family) => document.fonts.load(`16px "${family}"`, '设计A').catch(() => [])));
    const missing = families.filter((_, index) => !loaded[index].length);
    if (missing.length) warn(missing);
  };
  const needed = (document.body.dataset.fonts ?? '').split('|').filter(Boolean);
  if (needed.length && document.fonts) check(needed);

  // 默认这一版可以直接换字体，版式不动，用来看层次是不是真的还在。
  if (document.body.dataset.swap === undefined) return;
  const CHOICES = {
    默认: { families: null },
    宋体: { family: '--type-family-serif', sheet: 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600&display=swap', webFont: 'Noto Serif SC' },
    文楷: { family: '--type-family-kai', sheet: 'https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/lxgwwenkai-regular.css', webFont: 'LXGW WenKai' },
    等宽: { family: '--type-family-mono' },
  };
  const label = document.createElement('label');
  label.className = 'select small';
  label.innerHTML = `<span class="select-label">换字体试试</span><select id="swap">${Object.keys(CHOICES).map((name) => `<option>${name}</option>`).join('')}</select><svg class="icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 6.25L8 9.75l3.5-3.5"/></svg>`;
  bar.append(label);
  const root = document.documentElement.style;
  const ROLES = ['--font-title', '--font-read', '--font-ui', '--font-data', '--font-title-en', '--font-read-en', '--font-ui-en'];
  document.getElementById('swap').addEventListener('change', ({ target }) => {
    bar.classList.remove('warn');
    status.textContent = NAME;
    const choice = CHOICES[target.value];
    for (const role of ROLES) {
      if (choice.family) root.setProperty(role, `var(${choice.family})`);
      else root.removeProperty(role);
    }
    if (!choice.sheet) return;
    if (!document.querySelector(`link[href="${choice.sheet}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = choice.sheet;
      link.addEventListener('load', () => check([choice.webFont]));
      link.addEventListener('error', () => warn([choice.webFont]));
      document.head.append(link);
    }
  });
})();
