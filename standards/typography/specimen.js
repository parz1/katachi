// 字体比较的内容，3 个方案完全相同，文字取自 ../content-stress.json。字体没有加载时会写明，免得看错。
(() => {
  'use strict';
  const NAME = document.title;
  const main = document.createElement('main');
  main.innerHTML = `
    <p class="tag" id="status">${NAME}</p>
    <section>
      <p class="label">标题</p>
      <h1>设置</h1>
      <h1>用 Claude 和 Codex 在 3 个 iOS 项目里复用 Design Tokens</h1>
      <h2>关于调整第四季度跨部门协作流程以及相关审批权限的补充说明（第二次修订）</h2>
      <h2>Supplementary Notes on Revising the Cross-Department Collaboration Process and Related Approval Permissions for Q4</h2>
      <h3>他问：「这份《设计规范》（第 2 版）能用吗？」我说——先看看……再决定！</h3>
    </section>
    <section>
      <p class="label">正文</p>
      <p>这个版本把原本分散在三个页面的同步设置合并到了一处。旧数据会在首次启动时自动迁移，迁移期间可以继续浏览，但暂时不能编辑。如果迁移失败，应用会保留原始数据并提示你重试，不会覆盖任何内容。</p>
      <p>升级到 v2.4.0 后，API 的默认超时从 30 秒改为 10 秒。如果你在 CI 中调用 /v1/sync，请检查 retry 配置；请求过多时会返回 HTTP 429，并在 Retry-After 中给出等待时间（单位：秒）。</p>
      <p>This release consolidates sync settings that used to live on three separate screens. Existing data migrates automatically on first launch; you can keep browsing during migration, but editing is paused until it finishes. If migration fails, the app keeps the original data and prompts you to retry, so nothing gets overwritten.</p>
    </section>
    <section>
      <p class="label">界面文字</p>
      <div class="controls"><button type="button" class="strong">保存修改</button><button type="button">取消</button><button type="button">Settings</button></div>
      <label for="field">仅在连接到受信任的无线网络时自动同步附件</label>
      <input id="field" value="Automatically sync attachments only when connected to a trusted wireless network">
      <p class="hint">3 分钟前 · 2026 年 11 月 5 日 14:30</p>
      <p class="error">无法保存：网络连接已断开。你的修改仍保留在本页，恢复连接后可以重试。</p>
    </section>
    <section>
      <p class="label">列表</p>
      <ul class="rows">
        <li><strong>李雷</strong><span>3 minutes ago</span></li>
        <li><strong>阿依古丽·买买提艾力</strong><span>2026 年 11 月 5 日 14:30</span></li>
        <li><strong>Alexandria Montgomery-Featherstonehaugh</strong><span>Nov 5, 2026, 2:30 PM</span></li>
      </ul>
    </section>
    <section>
      <p class="label">数字和符号</p>
      <div class="numbers"><span>1,234,567.89</span><span>¥1,234,567.89</span><span>-12.5%</span><span>价格 ±5% § 3.2 → 详见 ①</span></div>
    </section>
    <section class="weights">
      <p class="label">字重（正文字体 400、500、700，最后一行是标题字体）</p>
      <p style="font-weight:400">设计规范 Design Tokens 2026</p>
      <p style="font-weight:500">设计规范 Design Tokens 2026</p>
      <p style="font-weight:700">设计规范 Design Tokens 2026</p>
      <h3 style="margin-top:12px">设计规范 Design Tokens 2026</h3>
    </section>`;
  document.body.append(main);

  const needed = (document.body.dataset.fonts ?? '').split('|').filter(Boolean);
  if (!needed.length || !document.fonts) return;
  const status = document.getElementById('status');
  // 样式表没加载时没有对应的字体，fonts.check 仍然返回 true；fonts.load 这时返回空，所以用它判断。
  Promise.all(needed.map((family) => document.fonts.load(`16px "${family}"`, '设计A').catch(() => []))).then((loaded) => {
    const missing = needed.filter((_, index) => !loaded[index].length);
    if (missing.length) {
      status.className = 'tag warn';
      status.textContent = `${NAME}：字体没有从网络加载（${missing.join('、')}），看到的可能不是这个方案。检查网络后刷新，或单独打开这个页面。`;
    }
  });
})();
