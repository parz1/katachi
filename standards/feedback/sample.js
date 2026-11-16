// 反馈样例：同一个待办页、同一组操作，3 种结果提示放在哪不同。body 上的 data-feedback 决定放法：
//   toast 浮在底部（默认，用户定的）：用 toast.js，成功的过一会儿消失，出错的留到关掉或解决。
//   inline 就地：提示出现在出事的地方旁边，成功的留到下一次操作，出错的留到解决。
//   bar 底部一条：窗口底部固定一条，只放最近的一条，留到下一条来。
// 三种放法共用的：先改后存、保存中写在那一项上、失败改回去并给「再试一次」、删除给「撤销」、
// ⌘Z / Ctrl+Z 撤销最近一次、读屏用隐藏的播报区。
(() => {
  'use strict';
  const MODE = document.body.dataset.feedback;
  const TOAST_TIME = 5000; // 临时的：浮在底部的成功提示几秒后消失。动效和时长还没定。
  const NETWORK = { normal: { label: '正常', delay: 400 }, slow: { label: '慢（2 秒）', delay: 2000 }, fail: { label: '保存失败', delay: 800, fail: true } };
  // agent 画的线条图标，和控件一览用同一套。
  const PATHS = {
    chevron: '<path d="M4.5 6.25L8 9.75l3.5-3.5"/>',
    spinner: '<path d="M8 2a6 6 0 1 1-6 6"/>',
    alert: '<path d="M8 2.25l6.25 11.25H1.75z"/><path d="M8 6.5v3M8 11.5v.25"/>',
    done: '<circle cx="8" cy="8" r="6"/><path d="M5.4 8.2l1.8 1.8 3.4-3.9"/>',
  };
  const icon = (name, spin = false) => `<svg class="icon${spin ? ' spin' : ''}" viewBox="0 0 16 16" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${PATHS[name]}</svg>`;
  const kindIcon = (kind) => icon(kind === 'success' ? 'done' : 'alert');
  const esc = (text) => String(text).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);
  const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });
  const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  // 内容大多取自 ../content-stress.json。
  const state = {
    network: 'normal',
    tasks: [
      { id: 't1', title: '整理第四季度跨部门协作流程以及相关审批权限的补充说明（第二次修订）', done: false },
      { id: 't2', title: 'Supplementary Notes on Revising the Cross-Department Collaboration Process', lang: 'en', done: false },
      { id: 't3', title: '把 2026年11月产品评审_最终版_final_v3_修订_不要再改了.pdf 发给李雷', done: false },
      { id: 't4', title: '设置', done: true },
      { id: 't5', title: '用 Claude 和 Codex 在 3 个 iOS 项目里复用 Design Tokens', done: false },
    ],
    pending: new Set(),
    nextId: 6,
  };
  const save = () => wait(NETWORK[state.network].delay).then(() => {
    if (NETWORK[state.network].fail) throw new Error('网络连接已断开');
  });

  // ---------- 页面 ----------
  const MODES = {
    toast: `提示浮在窗口底部。成功的 ${TOAST_TIME / 1000} 秒后自己消失，鼠标停在上面或焦点在里面时不消失；出错的留到关掉或解决。Esc 关掉最新的一条。`,
    inline: '提示出现在出事的地方旁边。成功的留到下一次操作，出错的留到解决。',
    bar: '窗口底部固定一条，只放最近的一条，留到下一条来。',
  };
  document.body.insertAdjacentHTML('afterbegin', `
    <div class="bar t-caption" id="bar"><span>${document.title}</span></div>
    <main class="page t-ui">
      <header class="head">
        <h1 class="t-title-m" id="title">第四季度的待办</h1>
        <p class="meta">${MODES[MODE]}按 ${mac ? '⌘Z' : 'Ctrl+Z'} 撤销最近一次。可以把顶上的网络换成「慢」或「保存失败」，看保存中和出错。</p>
      </header>
      <section class="group" aria-labelledby="add-title">
        <h2 class="t-ui" id="add-title">加一件</h2>
        <form class="input-box" id="add-form" novalidate>
          <input class="input" id="add-input" type="text" placeholder="加一件要做的事" aria-label="要做的事" autocomplete="off">
          <div class="input-foot"><span class="hint">Enter 加上</span><button class="btn primary small" id="add-submit" type="submit" disabled>加上</button></div>
        </form>
        <div class="slot" data-slot="add"></div>
      </section>
      <section class="group" aria-labelledby="list-title">
        <h2 class="t-ui" id="list-title" tabindex="-1">要做的</h2>
        <ul class="tasks" id="tasks"></ul>
      </section>
      <section class="group" aria-labelledby="sync-title">
        <h2 class="t-ui" id="sync-title">同步设置</h2>
        <label class="check"><input type="checkbox" id="sync-wifi" checked><span>仅在连接到受信任的无线网络时自动同步附件</span></label>
        <div class="row">
          <label class="select"><span class="select-label">同步频率</span><select id="sync-every"><option>每小时</option><option>每天</option><option>手动</option></select>${icon('chevron')}</label>
        </div>
        <div class="row"><button class="btn primary" id="sync-save" type="button">保存修改</button></div>
        <div class="slot" data-slot="settings"></div>
      </section>
    </main>
    ${MODE === 'bar' ? '<section class="statusbar" id="statusbar" aria-label="最近的提示" hidden></section>' : ''}
    <div class="visually-hidden" role="status" id="polite"></div>
    <div class="visually-hidden" role="alert" id="assertive"></div>`);

  const tasksEl = document.getElementById('tasks');
  const addForm = document.getElementById('add-form');
  const addInput = document.getElementById('add-input');
  const addSubmit = document.getElementById('add-submit');
  const syncSave = document.getElementById('sync-save');

  // ---------- 读屏：三种放法都一样，结果读出来，焦点不动（WCAG 4.1.3） ----------
  const announce = (text, urgent = false) => {
    const region = document.getElementById(urgent ? 'assertive' : 'polite');
    region.textContent = '';
    setTimeout(() => { region.textContent = text; }, 50);
  };

  // ---------- 撤销：提示里的「撤销」和 ⌘Z 做同一件事，提示消失后 ⌘Z 也能撤最近一次 ----------
  const undos = []; // { key, run }
  const undo = {
    add(key, run) {
      undo.drop(key);
      undos.push({ key, run });
      if (undos.length > 10) undos.shift();
    },
    drop(key) {
      const index = undos.findIndex((item) => item.key === key);
      if (index >= 0) undos.splice(index, 1);
    },
    run(key) {
      const item = key ? undos.find((entry) => entry.key === key) : undos.at(-1);
      if (!item) return false;
      undo.drop(item.key);
      item.run();
      return true;
    },
  };
  document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() !== 'z' || !(event.metaKey || event.ctrlKey) || event.shiftKey || event.altKey) return;
    // 在输入框里时是撤销打的字，不管。
    if (event.target.closest('input[type="text"], textarea, [contenteditable]')) return;
    if (undo.run()) event.preventDefault();
    else announce('没有能撤销的操作');
  });

  // ---------- 提示：只有这一段因放法而不同 ----------
  // note：{ key, kind: 'success'|'error', text, say, action: { label, run }, back }，text 是纯文字
  const notes = new Map(); // key → note，只给就地那一版用
  const noteHtml = (note) => `<p class="note is-${note.kind}">${kindIcon(note.kind)}<span>${esc(note.text)}</span>${note.action ? `<button type="button" class="btn small" data-note-action>${esc(note.action.label)}</button>` : ''}</p>`;
  const wire = (element, note) => element.querySelector('[data-note-action]')?.addEventListener('click', () => note.action.run());
  const slotOf = (key) => (key.startsWith('task:') ? tasksEl.querySelector(`[data-id="${key.slice(5)}"] [data-slot]`) : document.querySelector(`[data-slot="${key}"]`));
  const toasts = MODE === 'toast' ? window.katachiToasts({ time: TOAST_TIME, icon: kindIcon }) : null;

  const feedback = {
    // 开始一次新操作：就地那一版，上一次成功的提示到这里为止。
    start() {
      if (MODE === 'inline') for (const [key, note] of notes) if (note.kind === 'success') feedback.clear(key);
    },
    show(note) {
      announce(note.say ?? note.text, note.kind === 'error');
      if (MODE === 'toast') toasts.show(note);
      else if (MODE === 'bar') showBar(note);
      else {
        notes.set(note.key, note);
        if (note.key.startsWith('task:')) renderTasks();
        else renderInline(note.key);
      }
    },
    clear(key) {
      if (MODE === 'toast') toasts.clear(key);
      else if (MODE === 'bar') {
        const bar = document.getElementById('statusbar');
        if (bar.dataset.key === key) { bar.hidden = true; bar.innerHTML = ''; delete bar.dataset.key; reserve(); }
      } else if (notes.delete(key)) {
        if (key.startsWith('task:')) renderTasks();
        else renderInline(key);
      }
    },
  };

  function renderInline(key) {
    const slot = slotOf(key);
    if (!slot) return;
    const note = notes.get(key);
    slot.innerHTML = note ? noteHtml(note) : '';
    if (note) wire(slot, note);
  }

  function showBar(note) {
    const bar = document.getElementById('statusbar');
    bar.dataset.key = note.key;
    bar.innerHTML = noteHtml(note);
    wire(bar, note);
    bar.hidden = false;
    reserve();
  }

  // 底部一条不盖住内容：页面底下留出它的高度，键盘走到底下的控件时也滚到它上面（WCAG 2.4.11）。
  function reserve() {
    const bar = document.getElementById('statusbar');
    const height = bar && !bar.hidden ? `${bar.getBoundingClientRect().height}px` : '';
    document.body.style.paddingBlockEnd = height;
    document.documentElement.style.scrollPaddingBlockEnd = height;
  }
  if (MODE === 'bar') new ResizeObserver(reserve).observe(document.getElementById('statusbar'));

  // ---------- 待办 ----------
  function rowHtml(task) {
    const busy = state.pending.has(task.id);
    return `<li class="task${task.done ? ' is-done' : ''}" data-id="${task.id}">
      <div class="task-line">
        <label class="check alone"><input type="checkbox" data-toggle${task.done ? ' checked' : ''}${busy ? ' aria-disabled="true"' : ''} aria-label="做完了：${esc(task.title)}"></label>
        <span class="task-title"${task.lang ? ` lang="${task.lang}"` : ''}>${esc(task.title)}</span>
        ${busy ? `<span class="task-busy t-caption">${icon('spinner', true)}保存中</span>` : ''}
        <button type="button" class="btn small" data-remove${busy ? ' aria-disabled="true"' : ''}>删除</button>
      </div>
      <div class="slot" data-slot></div>
    </li>`;
  }
  // 删掉的那一项：就地那一版在提示还在时留一行放「撤销」，提示没了这一行也去掉。
  const tombstoneHtml = (id) => `<li class="task is-removed" data-id="${id}"><div class="slot" data-slot></div></li>`;

  function renderTasks() {
    // 重画清单时，焦点放回原来那一项的同一个控件，不然会丢到页面外。
    const active = document.activeElement;
    const row = active?.closest?.('#tasks [data-id]');
    const control = row && ['[data-toggle]', '[data-remove]', '[data-note-action]'].find((selector) => active.matches(selector));
    const keep = (task) => !task.removed || (MODE === 'inline' && notes.has(`task:${task.id}`));
    tasksEl.innerHTML = state.tasks.filter(keep).map((task) => (task.removed ? tombstoneHtml(task.id) : rowHtml(task))).join('');
    if (MODE === 'inline') for (const key of notes.keys()) if (key.startsWith('task:')) renderInline(key);
    if (control) tasksEl.querySelector(`[data-id="${row.dataset.id}"] ${control}`)?.focus();
  }
  const toggleOf = (id) => () => tasksEl.querySelector(`[data-id="${id}"] [data-toggle]`);
  const focusTask = (id, what = '[data-toggle]') => tasksEl.querySelector(`[data-id="${id}"] ${what}`)?.focus();
  const neighbour = (id) => {
    const visible = state.tasks.filter((task) => !task.removed || task.id === id);
    const index = visible.findIndex((task) => task.id === id);
    return (visible[index + 1] ?? visible[index - 1])?.id;
  };

  // 勾掉：先改、马上给「撤销」，那一项上写保存中；没存上就改回去，提示换成出错。
  async function toggle(id, done, { fromUndo = false } = {}) {
    const task = state.tasks.find((item) => item.id === id);
    if (!task || state.pending.has(id)) return;
    const key = `task:${id}`;
    feedback.start();
    feedback.clear(key);
    undo.drop(key);
    task.done = done;
    state.pending.add(id);
    renderTasks();
    if (fromUndo) focusTask(id);
    if (done) {
      const run = () => toggle(id, false, { fromUndo: true });
      undo.add(key, run);
      feedback.show({ key, kind: 'success', text: `完成了「${task.title}」`, action: { label: '撤销', run: () => undo.run(key) }, back: toggleOf(id) });
    } else {
      announce(fromUndo ? `已撤销，「${task.title}」改回没做完` : `「${task.title}」改回没做完`);
    }
    try {
      await save();
      state.pending.delete(id);
      renderTasks();
    } catch {
      state.pending.delete(id);
      task.done = !done; // 没存上，改回去
      undo.drop(key);
      renderTasks();
      feedback.show({ key, kind: 'error', text: `没保存上，「${task.title}」${done ? '还没完成' : '还是完成的'}。`, say: `没保存上，「${task.title}」${done ? '还没完成' : '还是完成的'}。可以再试一次。`, action: { label: '再试一次', run: () => toggle(id, done) }, back: toggleOf(id) });
    }
    if (document.activeElement === document.body) focusTask(id);
  }

  // 删除：先删、马上给「撤销」，不弹窗确认。焦点落在下一项；就地那一版落在那一行的「撤销」上。
  async function remove(id) {
    const task = state.tasks.find((item) => item.id === id);
    if (!task || state.pending.has(id) || task.removed) return;
    const key = `task:${id}`;
    feedback.start();
    feedback.clear(key);
    const next = neighbour(id);
    task.removed = true;
    const fallback = () => (next ? toggleOf(next)() : document.getElementById('list-title'));
    undo.add(key, () => restore(id));
    feedback.show({ key, kind: 'success', text: `删除了「${task.title}」`, action: { label: '撤销', run: () => undo.run(key) }, back: fallback });
    renderTasks();
    if (MODE === 'inline') tasksEl.querySelector(`[data-id="${id}"] [data-note-action]`)?.focus();
    else fallback()?.focus();
    try {
      await save();
    } catch {
      if (!task.removed) return; // 已经撤销了
      task.removed = false; // 没删掉，放回去
      undo.drop(key);
      feedback.clear(key);
      renderTasks();
      feedback.show({ key, kind: 'error', text: `没删掉「${task.title}」：网络连接已断开。`, action: { label: '再试一次', run: () => remove(id) }, back: () => tasksEl.querySelector(`[data-id="${id}"] [data-remove]`) });
      if (document.activeElement === document.body) focusTask(id, '[data-remove]');
    }
  }

  // 撤销删除：也是先放回去，再存。
  async function restore(id) {
    const task = state.tasks.find((item) => item.id === id);
    if (!task || !task.removed) return;
    const key = `task:${id}`;
    feedback.clear(key);
    task.removed = false;
    state.pending.add(id);
    renderTasks();
    focusTask(id);
    try {
      await save();
      state.pending.delete(id);
      renderTasks();
      focusTask(id);
      announce(`已撤销，「${task.title}」放回来了`);
    } catch {
      state.pending.delete(id);
      task.removed = true;
      renderTasks();
      feedback.show({ key, kind: 'error', text: `没撤销成，「${task.title}」还是删掉的。`, action: { label: '再试一次', run: () => restore(id) }, back: () => document.getElementById('list-title') });
      if (MODE === 'inline') tasksEl.querySelector(`[data-id="${id}"] [data-note-action]`)?.focus();
      else document.getElementById('list-title').focus();
    }
  }

  // ---------- 加一件：只有一个输入框，空着时禁用 ----------
  addInput.addEventListener('input', () => { addSubmit.disabled = !addInput.value.trim(); });
  addForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const title = addInput.value.trim();
    if (!title || addSubmit.getAttribute('aria-disabled') === 'true') return;
    feedback.start();
    feedback.clear('add');
    addSubmit.setAttribute('aria-disabled', 'true');
    addSubmit.innerHTML = `${icon('spinner', true)}加上中`;
    try {
      await save();
      state.tasks.unshift({ id: `t${state.nextId++}`, title, done: false });
      renderTasks();
      addInput.focus();
      addInput.value = '';
      addSubmit.disabled = true;
      feedback.show({ key: 'add', kind: 'success', text: `加上了「${title}」，在「要做的」最前面。`, back: () => addInput });
    } catch {
      feedback.show({ key: 'add', kind: 'error', text: '没加上：网络连接已断开。字还在，可以再试一次。', action: { label: '再试一次', run: () => addForm.requestSubmit() }, back: () => addInput });
    } finally {
      addSubmit.removeAttribute('aria-disabled');
      addSubmit.textContent = '加上';
      if (document.activeElement === document.body) addInput.focus();
    }
  });

  // ---------- 保存设置 ----------
  syncSave.addEventListener('click', async () => {
    if (syncSave.getAttribute('aria-disabled') === 'true') return;
    feedback.start();
    feedback.clear('settings');
    syncSave.setAttribute('aria-disabled', 'true');
    syncSave.innerHTML = `${icon('spinner', true)}保存中`;
    try {
      await save();
      feedback.show({ key: 'settings', kind: 'success', text: '同步设置已保存。', back: () => syncSave });
    } catch {
      feedback.show({ key: 'settings', kind: 'error', text: '无法保存：网络连接已断开。你的修改仍保留在本页，恢复连接后可以重试。', action: { label: '再试一次', run: () => syncSave.click() }, back: () => syncSave });
    } finally {
      syncSave.removeAttribute('aria-disabled');
      syncSave.textContent = '保存修改';
      if (document.activeElement === document.body) syncSave.focus();
    }
  });

  tasksEl.addEventListener('click', (event) => {
    const row = event.target.closest('[data-id]');
    if (!row) return;
    const busy = event.target.closest('[aria-disabled="true"]');
    if (event.target.matches('[data-toggle]')) {
      // 保存中的勾选框不让再点，但不真禁用，免得焦点丢掉。
      if (busy) { event.preventDefault(); return; }
      toggle(row.dataset.id, event.target.checked);
    } else if (event.target.closest('[data-remove]') && !busy) {
      remove(row.dataset.id);
    }
  });

  // ---------- 顶上的开关 ----------
  const bar = document.getElementById('bar');
  const network = document.createElement('label');
  network.className = 'select small';
  network.innerHTML = `<span class="select-label">网络</span><select id="network">${Object.entries(NETWORK).map(([value, { label }]) => `<option value="${value}">${label}</option>`).join('')}</select>${icon('chevron')}`;
  bar.append(network);
  network.querySelector('select').addEventListener('change', (event) => { state.network = event.target.value; });
  window.addColorControls(bar);

  renderTasks();
})();
