// 颜色样例的内容，3 种用色完全相同，不同的只有角色指向哪条色阶。文字大多取自 ../content-stress.json。
(() => {
  'use strict';
  const NAME = document.title;
  const ICONS = {
    error: '<circle cx="8" cy="8" r="6.25"/><path d="M5.75 5.75l4.5 4.5M10.25 5.75l-4.5 4.5"/>',
    warning: '<path d="M8 2.25l6.25 11.5H1.75z"/><path d="M8 6.5v3.25M8 11.5v.25"/>',
    success: '<circle cx="8" cy="8" r="6.25"/><path d="M5 8.25l2.25 2.25L11 6"/>',
  };
  const icon = (kind) => `<svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${ICONS[kind]}</svg>`;
  const main = document.createElement('main');
  main.innerHTML = `
    <div class="bar t-caption" id="bar"><span id="status">${NAME}</span></div>
    <article class="article">
      <p class="mode t-caption">阅读：层次全靠灰，链接靠下划线</p>
      <h1 class="t-title-l">用 Claude 和 Codex 在 3 个 iOS 项目里复用 Design Tokens</h1>
      <p class="byline t-ui">阿依古丽·买买提艾力 · 2026 年 11 月 5 日 14:30</p>
      <div class="body">
        <p class="t-read">三个项目各存一份颜色和间距，改一处要改三遍，还总有一份忘了改。这个季度我们把它们收成一份 Design Tokens，让 Claude 和 Codex 都从同一个地方读，新页面不用再问「这个灰到底是哪个灰」。详情见<a href="#">迁移说明</a>。</p>
        <p class="t-read">升级到 v2.4.0 后，API 的默认超时从 30 秒改为 10 秒。如果你在 CI 中调用 <code class="t-mono">/v1/sync</code>，请检查 retry 配置；请求过多时会返回 HTTP 429，并在 Retry-After 中给出等待时间（单位：秒）。</p>
        <blockquote class="t-read">他问：「这份《设计规范》（第 2 版）能用吗？」我说——先看看……再决定！</blockquote>
      </div>
    </article>
    <section>
      <p class="mode t-caption">状态：颜色加上文字和图标</p>
      <p class="notice error t-ui">${icon('error')}<span>无法保存：网络连接已断开。你的修改仍保留在本页，恢复连接后可以重试。</span></p>
      <p class="notice warning t-ui">${icon('warning')}<span>存储空间只剩 5%，同步可能变慢。</span></p>
      <p class="notice success t-ui">${icon('success')}<span>发布成功，共 12 项。</span></p>
    </section>
    <section>
      <p class="mode t-caption">操作：要打字的地方有框，对比度不低于 3:1；能点的靠底色；禁用可以更淡</p>
      <label class="t-ui" for="field"><strong>仅在连接到受信任的无线网络时自动同步附件</strong></label>
      <input class="input t-ui" id="field" lang="en" aria-invalid="true" aria-describedby="field-error" value="Automatically sync attachments only when connected to a trusted wireless network">
      <p class="error t-caption" id="field-error">这个设置和当前的存储方案冲突，请先修改存储方案。</p>
      <p class="hint t-caption">3 分钟前 · 2026 年 11 月 5 日 14:30</p>
      <div class="controls">
        <button class="btn primary t-ui" type="button">保存修改</button>
        <button class="btn t-ui" type="button">取消</button>
        <button class="btn t-ui" type="button" lang="en">Settings</button>
        <button class="btn t-ui" type="button" disabled>暂不可用</button>
        <button class="btn danger t-ui" type="button">删除</button>
      </div>
      <p class="mode t-caption states-title">这些状态平时看不见，这里固定下来：悬停、按下、焦点</p>
      <div class="controls">
        <button class="btn primary is-hover t-ui" type="button">主按钮悬停</button>
        <button class="btn danger is-hover t-ui" type="button">删除悬停</button>
        <button class="btn is-hover t-ui" type="button">按钮悬停</button>
        <button class="btn is-active t-ui" type="button">按钮按下</button>
        <button class="btn t-ui is-focus" type="button">焦点</button>
      </div>
    </section>
    <section>
      <p class="mode t-caption">位置：当前页和选中，去掉颜色也看得出</p>
      <nav class="tabs t-ui" aria-label="文档筛选"><a href="#" aria-current="page">全部</a><a href="#">进行中</a><a href="#">已归档</a></nav>
      <ul class="rows">
        <li class="t-ui" aria-current="true"><strong>关于调整第四季度跨部门协作流程以及相关审批权限的补充说明（第二次修订）</strong><span class="t-caption">李雷 · 3 分钟前</span><span class="badge warning t-caption">需要处理</span></li>
        <li class="t-ui" lang="en"><strong>Supplementary Notes on Revising the Cross-Department Collaboration Process and Related Approval Permissions for Q4</strong><span class="t-caption">Alexandria Montgomery-Featherstonehaugh · Nov 5, 2026, 2:30 PM</span><span class="badge success t-caption" lang="zh-CN">已完成</span></li>
        <li class="t-ui"><strong>2026年11月产品评审_最终版_final_v3_修订_不要再改了.pdf</strong><span class="t-caption">阿依古丽·买买提艾力 · 3 minutes ago</span><span class="badge error t-caption">上传失败</span></li>
      </ul>
    </section>
    <section>
      <p class="mode t-caption">比对：涨跌不上色，靠正负号</p>
      <table class="t-data">
        <thead><tr><th scope="col">项目</th><th class="num" scope="col">数量</th><th class="num" scope="col">金额</th><th class="num" scope="col">变化</th></tr></thead>
        <tbody>
          <tr><td>苹果 Apple</td><td class="num">3</td><td class="num">¥12.50</td><td class="num">-12.5%</td></tr>
          <tr><td>有机冷榨特级初榨橄榄油（意大利产）750ml 买二送一限时特惠装</td><td class="num">12</td><td class="num">¥12,345.60</td><td class="num">+8.0%</td></tr>
          <tr><td>年度授权</td><td class="num">1</td><td class="num">¥1,222,209.79</td><td class="num">0.0%</td></tr>
        </tbody>
        <tfoot><tr><td>合计 Total</td><td class="num">16</td><td class="num">¥1,234,567.89</td><td class="num"></td></tr></tfoot>
      </table>
      <pre class="code t-mono t-caption"><code>https://example.com/projects/2026/design-assets/exports/final/review-round-3/representative-page-1440x900.png?download=true&amp;version=12</code></pre>
    </section>`;
  document.body.append(main);

  // 样例里的链接只是样子，点了不跳走。
  document.addEventListener('click', (event) => {
    if (event.target.closest('a')) event.preventDefault();
  });

  const root = document.documentElement;
  const bar = document.getElementById('bar');
  const status = document.getElementById('status');
  window.addColorControls(bar, { accents: root.dataset.accent !== undefined });

  const needed = (document.body.dataset.fonts ?? '').split('|').filter(Boolean);
  if (needed.length && document.fonts) {
    // 样式表没加载时没有对应的字体，fonts.check 仍然返回 true；fonts.load 这时返回空，所以用它判断。
    Promise.all(needed.map((family) => document.fonts.load(`16px "${family}"`, '设计A').catch(() => []))).then((loaded) => {
      const missing = needed.filter((_, index) => !loaded[index].length);
      if (!missing.length) return;
      bar.classList.add('warn');
      status.textContent = `${NAME}：字体没有从网络加载（${missing.join('、')}），看到的可能不是这个样例。检查网络后刷新，或单独打开这个页面。`;
    });
  }
})();
