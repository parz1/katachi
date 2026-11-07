// 间距和形状样例的内容，3 种分法完全相同，不同的只有组和行怎么分开。文字大多取自 ../content-stress.json。
(() => {
  'use strict';
  const NAME = document.title;
  const ICON = '<svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="8" cy="8" r="6.25"/><path d="M5.75 5.75l4.5 4.5M10.25 5.75l-4.5 4.5"/></svg>';
  const ROWS = [
    ['关于调整第四季度跨部门协作流程以及相关审批权限的补充说明（第二次修订）', '李雷 · 3 分钟前', 'warning', '需要处理', ''],
    ['Supplementary Notes on Revising the Cross-Department Collaboration Process and Related Approval Permissions for Q4', 'Alexandria Montgomery-Featherstonehaugh · Nov 5, 2026, 2:30 PM', 'success', '已完成', 'en'],
    ['2026年11月产品评审_最终版_final_v3_修订_不要再改了.pdf', '阿依古丽·买买提艾力 · 3 minutes ago', 'error', '上传失败', ''],
    ['设置', '李雷 · 3 分钟前', '', '', ''],
    ['用 Claude 和 Codex 在 3 个 iOS 项目里复用 Design Tokens', '阿依古丽·买买提艾力 · 2026 年 11 月 5 日 14:30', 'success', '已完成', ''],
    ['Settings', 'Nov 5, 2026, 2:30 PM', '', '', 'en'],
  ];
  const row = ([title, meta, kind, word, lang], index) => `
    <li${index === 0 ? ' aria-current="true"' : ''}>
      <div${lang ? ` lang="${lang}"` : ''}><a href="#">${title}</a><span class="row-meta t-caption">${meta}</span></div>
      ${word ? `<span class="badge ${kind} t-caption">${word}</span>` : ''}
    </li>`;

  document.body.insertAdjacentHTML('afterbegin', `
    <div class="bar t-caption" id="bar"><span>${NAME}</span></div>
    <div class="app">
      <nav class="side t-ui" aria-label="项目">
        <ul>
          <li><a href="#" aria-current="page">设计资产</a></li>
          <li><a href="#">第四季度跨部门协作流程</a></li>
          <li><a href="#" lang="en">Automatically Synced Attachments</a></li>
          <li><a href="#">设置</a></li>
        </ul>
      </nav>
      <main>
        <header class="head">
          <div>
            <h1 class="t-title-m">用 Claude 和 Codex 在 3 个 iOS 项目里复用 Design Tokens</h1>
            <p class="meta t-ui">阿依古丽·买买提艾力 · 2026 年 11 月 5 日 14:30</p>
          </div>
          <div class="actions"><button type="button">导出</button><button type="button">分享</button></div>
        </header>

        <section class="group" aria-labelledby="documents">
          <h2 class="t-ui" id="documents">最近的文档</h2>
          <nav class="tabs t-ui" aria-label="文档筛选"><a href="#" aria-current="page">全部</a><a href="#">进行中</a><a href="#">已归档</a></nav>
          <ul class="rows t-ui">${ROWS.map(row).join('')}</ul>
        </section>

        <section class="group" aria-labelledby="sync">
          <h2 class="t-ui" id="sync">同步设置</h2>
          <div class="field">
            <label class="t-ui" for="name">项目名称</label>
            <input class="t-ui" id="name" type="text" value="设计资产" aria-describedby="name-hint">
            <p class="hint t-caption" id="name-hint">3 分钟前 · 2026 年 11 月 5 日 14:30</p>
          </div>
          <div class="field">
            <label class="t-ui" for="network">仅在连接到受信任的无线网络时自动同步附件</label>
            <input class="t-ui" id="network" type="text" lang="en" aria-invalid="true" aria-describedby="network-error" value="Automatically sync attachments only when connected to a trusted wireless network">
            <p class="error t-caption" id="network-error">这个设置和当前的存储方案冲突，请先修改存储方案。</p>
          </div>
          <label class="check t-ui"><input type="checkbox" checked><span>发布成功后通知项目里的所有人</span></label>
          <div class="actions under"><button class="primary" type="button">保存修改</button><button type="button">取消</button><button type="button" disabled>暂不可用</button></div>
        </section>

        <section class="group" aria-labelledby="usage">
          <h2 class="t-ui" id="usage">用量</h2>
          <div class="table-wrap" role="region" aria-labelledby="usage" tabindex="0">
            <table class="t-data">
              <thead><tr><th scope="col">项目</th><th class="num" scope="col">数量</th><th class="num" scope="col">金额</th><th class="num" scope="col">变化</th></tr></thead>
              <tbody>
                <tr><td>苹果 Apple</td><td class="num">3</td><td class="num">¥12.50</td><td class="num">-12.5%</td></tr>
                <tr><td>有机冷榨特级初榨橄榄油（意大利产）750ml 买二送一限时特惠装</td><td class="num">12</td><td class="num">¥12,345.60</td><td class="num">+8.0%</td></tr>
                <tr><td>年度授权</td><td class="num">1</td><td class="num">¥1,222,209.79</td><td class="num">0.0%</td></tr>
              </tbody>
              <tfoot><tr><td>合计 Total</td><td class="num">16</td><td class="num">¥1,234,567.89</td><td class="num"></td></tr></tfoot>
            </table>
          </div>
        </section>

        <section class="group" aria-labelledby="notes">
          <h2 class="t-ui" id="notes">升级说明</h2>
          <p class="notice t-ui">${ICON}<span>无法保存：网络连接已断开。你的修改仍保留在本页，恢复连接后可以重试。</span></p>
          <div class="prose">
            <p class="t-read">这个版本把原本分散在三个页面的同步设置合并到了一处。旧数据会在首次启动时自动迁移，迁移期间可以继续浏览，但暂时不能编辑。如果迁移失败，应用会保留原始数据并提示你重试，不会覆盖任何内容。</p>
            <p class="t-read">升级到 v2.4.0 后，API 的默认超时从 30 秒改为 10 秒。如果你在 CI 中调用 <code class="t-mono">/v1/sync</code>，请检查 retry 配置；请求过多时会返回 HTTP 429，并在 Retry-After 中给出等待时间（单位：秒）。</p>
          </div>
        </section>
      </main>
    </div>`);

  // 样例里的链接只是样子，点了不跳走。
  document.addEventListener('click', (event) => {
    if (event.target.closest('a')) event.preventDefault();
  });

  const bar = document.getElementById('bar');
  window.addSpaceControls(bar);
  window.addColorControls(bar);
})();
