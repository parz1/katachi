// 样例页的行为。按 standards/interaction.md 实现，内容是示例数据，不连服务器。
// 外观都在各方向的变量里，这里不写颜色和尺寸。
(() => {
  'use strict';

  const ITEMS = [
    { id: 't1', kind: 'task', title: '交水电费', space: '日常', group: 'overdue', when: '逾期 2 天', late: true, body: '电费单在信箱里，这个月用了 186 度。网上缴费就行。' },
    { id: 't2', kind: 'task', title: '核对论文 B 的前提条件', space: '研究', group: 'overdue', when: '昨天计划，没做完', late: true, body: '重点看第 4 节的假设 2 和 3，和我们的实验设置对一遍。', subtasks: [{ text: '读第 4 节', done: true }, { text: '列出和实验设置的差异', done: false }] },
    { id: 'e1', kind: 'event', title: '实验室例会', space: '研究', group: 'today', when: '10:00–11:00', readOnly: true, body: '这个日程来自 Google 日历，这里只能看。要改时间，请到 Google 日历里改。' },
    { id: 't3', kind: 'task', title: '写组会周报', space: '研究', group: 'today', when: '今天 17:00 截止', body: '三段：上周做了什么、卡在哪、下周计划。', subtasks: [{ text: '整理实验 3 的数据', done: true }, { text: '写下周计划', done: false }] },
    { id: 't4', kind: 'task', title: '用 Claude 和 Codex 在 3 个 iOS 项目里复用 Design Tokens', space: '研究', group: 'today', when: '今天', body: '升级到 v2.4.0 后，API 的默认超时从 30 秒改为 10 秒。如果你在 CI 中调用 /v1/sync，请检查 retry 配置；请求过多时会返回 HTTP 429，并在 Retry-After 中给出等待时间（单位：秒）。' },
    { id: 't5', kind: 'task', title: '关于调整第四季度跨部门协作流程以及相关审批权限的补充说明（第二次修订）', space: '日常', group: 'next', when: '周一', body: '这个版本把原本分散在三个页面的同步设置合并到了一处。旧数据会在首次启动时自动迁移，迁移期间可以继续浏览，但暂时不能编辑。如果迁移失败，应用会保留原始数据并提示你重试，不会覆盖任何内容。' },
    { id: 't6', kind: 'task', title: 'Supplementary Notes on Revising the Cross-Department Collaboration Process and Related Approval Permissions for Q4', space: '阅读', group: 'next', when: 'Nov 12', body: 'This release consolidates sync settings that used to live on three separate screens. https://example.com/projects/2026/design-assets/exports/final/review-round-3/representative-page-1440x900.png?download=true&version=12' },
    { id: 't7', kind: 'task', title: '读《Thinking in Systems》第 3 章', space: '阅读', group: 'next', when: '后天', body: '第 3 章讲反馈回路。正反馈和负反馈的例子值得再看一遍。' },
    { id: 'l1', kind: 'log', title: '实验 3 的样本重新编号了', space: '研究', group: 'recent', when: '08:55', body: '旧编号和新编号的对照表放在共享文件夹里。' },
  ];
  const GROUPS = [['overdue', '需要处理'], ['today', '今天'], ['next', '接下来'], ['recent', '最近']];
  const SPACES = ['全部', '研究', '日常', '阅读', '旅行'];
  const KIND = { task: '待办', event: '日程', log: '记录' };
  const DATE_WORD = /(下周[一二三四五六日]|周[一二三四五六日]|今天|明天|后天)/;
  const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform);

  const root = document.documentElement;
  const token = (name) => getComputedStyle(root).getPropertyValue(`--${name}`).trim();
  const ms = (name) => parseFloat(token(name));
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const element = (tag, props = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (key === 'class') node.className = value;
      else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
      else if (key in node && key !== 'list') node[key] = value;
      else node.setAttribute(key, value);
    }
    node.append(...children.filter((child) => child !== null && child !== undefined));
    return node;
  };

  const state = { items: new Map(), space: '全部', view: 'ready', failSave: false, selected: new Set(), anchor: null };

  // 页面骨架

  const app = document.getElementById('sample');
  const groupsEl = element('div', { class: 'groups' });
  const stateEl = element('div', { class: 'state', hidden: true });
  const subEl = element('p', { class: 'sub' });
  const workspace = element('main', { class: 'main' });
  const pageLayer = element('div', { class: 'page-layer' });
  const feedback = element('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
  const bulk = element('div', { class: 'bulk', hidden: true });
  const navEl = element('nav', { class: 'nav', 'aria-label': '空间' });

  function buildControls() {
    const select = element('select', { 'aria-label': '页面状态', onchange: () => setView(select.value) });
    for (const [value, label] of [['ready', '正常'], ['loading', '加载中'], ['empty', '首次使用（空）'], ['error', '读取失败']]) {
      select.append(element('option', { value }, label));
    }
    const fail = element('input', { type: 'checkbox', onchange: () => { state.failSave = fail.checked; } });
    state.controls = select;
    return element('div', { class: 'sample-controls' },
      element('strong', {}, document.body.dataset.name ?? '样例'),
      element('label', {}, '状态 ', select),
      element('label', {}, fail, ' 保存会失败'));
  }

  // 变形：只追踪移动的对象和它的标题，周围的行用 FLIP 让位。不支持或减少动态时直接切换。

  function springEasing(duration) {
    if (!CSS.supports('transition-timing-function', 'linear(0, 1)')) return token('object-motion-easing-fallback');
    const damping = ms('object-motion-damping');
    const seconds = duration / 1000;
    const natural = 6.2 / (damping * seconds);
    const damped = natural * Math.sqrt(1 - damping * damping);
    const points = [];
    for (let step = 0; step <= 60; step += 1) {
      const t = (step / 60) * seconds;
      const x = 1 - Math.exp(-damping * natural * t) * (Math.cos(damped * t) + ((damping * natural) / damped) * Math.sin(damped * t));
      points.push(step === 60 ? 1 : Math.round(x * 10000) / 10000);
    }
    return `linear(${points.join(', ')})`;
  }

  const visibleHomes = () => [...groupsEl.querySelectorAll('.home')];
  const topsOf = () => new Map(visibleHomes().map((home) => [home, home.getBoundingClientRect().top]));
  function flip(tops, timing, skip = () => false) {
    for (const home of visibleHomes()) {
      if (skip(home)) continue;
      const before = tops.get(home);
      if (before === undefined) continue;
      const delta = before - home.getBoundingClientRect().top;
      if (Math.abs(delta) > 0.5) home.animate({ transform: [`translateY(${delta}px)`, 'none'] }, timing);
    }
  }
  // 列表变化（完成、归档、改日期）时各行滑到新位置。
  function slideRows(update) {
    if (reducedMotion()) { update(); return; }
    const tops = topsOf();
    update();
    const duration = ms('object-motion-slide');
    flip(tops, { duration, easing: springEasing(duration) });
  }

  const NAMES = ['object-morph-0', 'object-morph-1'];
  let named = [];
  let currentMorph = null;
  function setName(object, name) {
    object.style.viewTransitionName = name ?? '';
    object.querySelector('[data-part="title"]').style.viewTransitionName = name ? `${name}-title` : '';
    if (name) named.push(object);
  }
  function clearNames() {
    const objects = named;
    named = [];
    objects.forEach((object) => setName(object, null));
  }
  function measure(object) {
    const style = getComputedStyle(object);
    const title = getComputedStyle(object.querySelector('[data-part="title"]'));
    return { radius: style.borderTopLeftRadius, shadow: style.boxShadow, fontSize: parseFloat(title.fontSize) };
  }
  function morph(update, objects, duration) {
    if (typeof document.startViewTransition !== 'function' || reducedMotion() || document.visibilityState === 'hidden') {
      update();
      return;
    }
    currentMorph?.skipTransition();
    clearNames();
    const pieces = objects.slice(0, NAMES.length);
    const tops = topsOf();
    const start = pieces.map(measure);
    const end = [];
    const easing = springEasing(duration);
    pieces.forEach((object, index) => setName(object, NAMES[index]));
    root.style.setProperty('--morph-duration', `${duration}ms`);
    root.style.setProperty('--morph-ease', easing);
    const transition = document.startViewTransition(() => {
      clearNames();
      update();
      pieces.forEach((object, index) => {
        setName(object, NAMES[index]);
        end[index] = measure(object);
      });
    });
    currentMorph = transition;
    transition.ready.then(() => {
      const timing = { duration, easing };
      pieces.forEach((_, index) => {
        root.animate(
          { borderRadius: [start[index].radius, end[index].radius], boxShadow: [start[index].shadow, end[index].shadow] },
          { ...timing, pseudoElement: `::view-transition-group(${NAMES[index]})` },
        );
        const ratio = end[index].fontSize / start[index].fontSize;
        if (Math.abs(ratio - 1) < 0.02) return;
        root.animate({ transform: ['none', `scale(${ratio})`] }, { ...timing, fill: 'both', pseudoElement: `::view-transition-old(${NAMES[index]}-title)` });
        root.animate({ transform: [`scale(${1 / ratio})`, 'none'] }, { ...timing, fill: 'both', pseudoElement: `::view-transition-new(${NAMES[index]}-title)` });
      });
      flip(tops, timing, (home) => pieces.some((object) => object.closest('.home') === home || itemOf(object).home === home));
    }).catch(() => {});
    transition.finished.catch(() => {}).finally(() => {
      if (currentMorph !== transition) return;
      currentMorph = null;
      clearNames();
    });
  }

  // 反馈

  function notify(message, undo) {
    const note = element('div', { class: 'note' }, element('span', {}, message));
    const remove = () => { clearTimeout(timer); note.remove(); };
    if (undo) {
      note.append(element('button', { type: 'button', class: 'note-action', onclick: () => { remove(); undo(); } }, '撤销'));
    }
    feedback.replaceChildren(note);
    const timer = setTimeout(remove, ms(undo ? 'interaction-feedback-undo' : 'interaction-feedback-toast'));
    return note;
  }
  function flash(item) {
    item.object.classList.remove('landed');
    void item.object.offsetWidth;
    item.object.classList.add('landed');
  }

  // 一个对象一个元素，换形态时搬到另一个位置。

  const itemOf = (node) => state.items.get(node.closest('[data-id]').dataset.id);
  const short = (title) => (title.length > 14 ? `${title.slice(0, 14)}…` : title);

  function buildObject(item) {
    const titleEl = element('span', { 'data-part': 'title' }, item.title);
    const metaEl = element('span', { class: 'meta' });
    const head = element('button', { type: 'button', class: 'head-button' }, titleEl, metaEl);
    const check = item.kind === 'task'
      ? element('button', { type: 'button', class: 'check', role: 'checkbox', 'aria-checked': 'false', 'aria-label': `完成「${item.title}」`, onclick: () => toggleDone(item) })
      : element('span', { class: 'kind' }, KIND[item.kind]);
    const places = element('div', { class: 'places' });
    const saveEl = element('span', { class: 'save', 'data-save': 'saved' }, '已保存');
    const dateButton = element('button', { type: 'button', class: 'field-button', onclick: (event) => openDatePopover(event.currentTarget, item) });
    const editor = element('textarea', { class: 'editor', rows: 1, placeholder: item.readOnly ? '' : '写点什么…', 'aria-label': `「${item.title}」的正文`, value: item.body, readOnly: Boolean(item.readOnly), oninput: () => edited(item) });
    const subtasks = (item.subtasks ?? []).map((subtask) => element('li', {}, element('label', { class: 'subtask' },
      element('input', { type: 'checkbox', checked: subtask.done, onchange: (event) => { subtask.done = event.target.checked; } }),
      element('span', {}, subtask.text))));
    const fields = element('div', { class: 'fields' },
      element('span', {}, item.space),
      item.readOnly ? element('span', {}, `${item.when} · 只读`) : dateButton,
      item.readOnly ? null : saveEl);
    const body = element('div', { class: 'body' }, fields, editor, subtasks.length ? element('ul', { class: 'subtasks' }, ...subtasks) : null);
    const object = element('article', { class: 'object', 'data-form': 'bar', 'data-id': item.id },
      element('div', { class: 'head' }, check, head, places), body);
    const away = element('button', { type: 'button', class: 'away', onclick: () => flash(item) }, element('span', { class: 'away-title' }, item.title), element('span', { class: 'away-label' }));
    const home = element('li', { class: 'home', 'data-id': item.id }, object, away);
    Object.assign(item, { object, home, head, titleEl, metaEl, check, places, saveEl, dateButton, editor, bodyEl: body });
    updateMeta(item);
    return item;
  }

  function updateMeta(item) {
    item.metaEl.replaceChildren(
      element('span', { class: item.late ? 'late' : '' }, item.when),
      element('span', { class: 'space' }, item.space),
    );
    item.dateButton.textContent = `计划：${item.when}`;
    item.check?.setAttribute?.('aria-checked', String(Boolean(item.done)));
    item.object.toggleAttribute('data-done', Boolean(item.done));
  }

  const BACK_LABEL = { bar: '缩回列表', card: '缩回卡片' };
  function placesOf(item, form) {
    const button = (label, onclick, keys) => element('button', { type: 'button', class: 'place', onclick, ...(keys ? { 'aria-keyshortcuts': keys } : {}) }, label);
    const more = button('更多', (event) => openMenu(event.currentTarget, item));
    more.setAttribute('aria-haspopup', 'menu');
    if (form === 'card') return [button('长成整页', () => go(item, 'page'), 'Meta+Enter Control+Enter'), more];
    if (form === 'page') return [button(BACK_LABEL[item.from], () => go(item, item.from), 'Escape'), more];
    return [];
  }

  function place(item, form) {
    const { object, home, bodyEl, head } = item;
    if (object.dataset.form !== 'bar') bodyEl.dataset.scroll = bodyEl.scrollTop;
    object.dataset.form = form;
    (form === 'page' ? pageLayer : home).prepend(object);
    bodyEl.scrollTop = Number(bodyEl.dataset.scroll ?? 0);
    home.classList.toggle('is-away', form === 'page');
    home.querySelector('.away-label').textContent = form === 'page' ? '在页里' : '';
    if (form === 'page') {
      head.removeAttribute('aria-expanded');
      head.setAttribute('aria-disabled', 'true');
      head.tabIndex = -1;
    } else {
      head.setAttribute('aria-expanded', String(form === 'card'));
      head.removeAttribute('aria-disabled');
      head.tabIndex = 0;
    }
    item.places.replaceChildren(...placesOf(item, form));
    const pageOpen = pageLayer.childElementCount > 0;
    workspace.inert = pageOpen;
    navEl.inert = pageOpen;
    root.toggleAttribute('data-page-open', pageOpen);
    if (form !== 'bar') resizeEditor(item);
  }

  function go(item, form) {
    const was = item.object.dataset.form;
    if (was === form) return;
    if (form === 'page') item.from = was;
    const displaced = form === 'card' ? [...groupsEl.querySelectorAll('.object[data-form="card"]')].map(itemOf) : [];
    const duration = was === 'page' || form === 'page' ? ms('object-motion-page') : ms('object-motion-inline');
    closePop();
    morph(() => {
      displaced.forEach((other) => place(other, 'bar'));
      place(item, form);
      item.head.focus({ preventScroll: true });
    }, [item.object, ...displaced.map((other) => other.object)], duration);
  }

  function resizeEditor(item) {
    item.editor.style.height = 'auto';
    item.editor.style.height = `${item.editor.scrollHeight + 2}px`;
  }

  // 编辑和保存：停止输入后自动保存，失败时文字留在原处。

  const SAVE_LABEL = { dirty: '未保存', saving: '保存中', saved: '已保存' };
  function setSave(item, value) {
    item.saveEl.dataset.save = value;
    if (value === 'failed') {
      item.saveEl.replaceChildren('没保存上 · ', element('button', { type: 'button', class: 'link', onclick: () => saveNow(item) }, '重试'));
    } else {
      item.saveEl.textContent = SAVE_LABEL[value];
    }
  }
  function edited(item) {
    resizeEditor(item);
    setSave(item, 'dirty');
    clearTimeout(item.saveTimer);
    item.saveTimer = setTimeout(() => saveNow(item), ms('interaction-save-idle'));
  }
  function saveNow(item) {
    setSave(item, 'saving');
    clearTimeout(item.saveTimer);
    item.saveTimer = setTimeout(() => {
      if (state.failSave) { setSave(item, 'failed'); return; }
      item.body = item.editor.value;
      setSave(item, 'saved');
    }, 500);
  }

  // 列表

  function render() {
    const visible = [...state.items.values()].filter((item) => !item.archived && (state.space === '全部' || item.space === state.space));
    const sections = GROUPS.map(([key, label]) => {
      const rows = visible.filter((item) => item.group === key);
      if (!rows.length) return null;
      const list = element('ul', { class: 'list' }, ...rows.map((item) => item.home));
      return element('section', { class: 'group' }, element('h2', {}, label, ' ', element('span', { class: 'count' }, String(rows.length))), list);
    }).filter(Boolean);
    groupsEl.replaceChildren(...sections);
    const open = visible.filter((item) => item.kind === 'task' && !item.done).length;
    subEl.textContent = `11月7日 星期六 · 还有 ${open} 件要做`;
    for (const button of navEl.querySelectorAll('[data-space]')) {
      const current = button.dataset.space === state.space;
      if (current) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    }
    renderState(visible);
  }

  function renderState(visible) {
    clearTimeout(state.loadingTimer);
    const show = (...children) => { stateEl.hidden = false; groupsEl.hidden = true; stateEl.replaceChildren(...children); };
    stateEl.hidden = true;
    groupsEl.hidden = false;
    if (state.view === 'loading') {
      show();
      stateEl.hidden = true;
      state.loadingTimer = setTimeout(() => {
        stateEl.hidden = false;
        stateEl.replaceChildren(element('p', {}, '正在读取…'));
      }, ms('interaction-loading-delay'));
    } else if (state.view === 'error') {
      show(element('p', { class: 'state-title' }, '读不到事项'),
        element('p', {}, '网络断开了。已经写下的内容还在这台设备上，不会丢。'),
        element('button', { type: 'button', class: 'btn', onclick: () => { setView('loading'); state.loadingTimer2 = setTimeout(() => setView('ready'), 1000); } }, '重试'));
    } else if (state.view === 'empty') {
      show(element('p', { class: 'state-title' }, '今天还没有事项'),
        element('p', {}, '在上面写一条，按回车就记下了。'));
    } else if (!visible.length) {
      show(element('p', { class: 'state-title' }, `「${state.space}」里还没有事项`),
        element('button', { type: 'button', class: 'btn', onclick: () => { state.space = '全部'; render(); } }, '看全部'));
    }
  }

  function setView(view) {
    state.view = view;
    if (state.controls) state.controls.value = view;
    render();
  }

  // 完成、归档、删除、改日期：能撤销的直接做。

  function toggleDone(item) {
    clearTimeout(item.doneTimer);
    if (item.done) {
      item.done = false;
      updateMeta(item);
      if (item.before) {
        const { group, when, late } = item.before;
        item.before = null;
        slideRows(() => { Object.assign(item, { group, when, late }); updateMeta(item); render(); });
      }
      return;
    }
    item.done = true;
    updateMeta(item);
    item.doneTimer = setTimeout(() => {
      item.before = { group: item.group, when: item.when, late: item.late };
      if (item.object.dataset.form === 'card') place(item, 'bar');
      slideRows(() => { Object.assign(item, { group: 'recent', when: '刚刚', late: false }); updateMeta(item); render(); });
      notify(`已完成「${short(item.title)}」`, () => toggleDone(item));
    }, ms('object-motion-done-pause'));
  }

  function focusNeighbor(item) {
    const heads = visibleHeads();
    const index = heads.indexOf(item.head);
    return heads[index + 1] ?? heads[index - 1] ?? null;
  }
  function archive(items) {
    const next = items.length === 1 ? focusNeighbor(items[0]) : null;
    slideRows(() => {
      for (const item of items) {
        if (item.object.dataset.form !== 'bar') place(item, 'bar');
        item.archived = true;
      }
      render();
    });
    next?.focus({ preventScroll: true });
    clearSelection();
    notify(items.length === 1 ? `已归档「${short(items[0].title)}」` : `已归档 ${items.length} 项`, () => {
      slideRows(() => { items.forEach((item) => { item.archived = false; }); render(); });
      items.forEach(flash);
      items[0].head.focus({ preventScroll: true });
    });
  }
  const deleteBlocked = (item) => (item.subtasks ?? []).some((subtask) => !subtask.done);
  async function deleteForever(item) {
    const count = item.subtasks?.length ?? 0;
    const confirmed = await askConfirm({
      title: `永久删除「${short(item.title)}」？`,
      text: `${count ? `它的 ${count} 个子任务也会一起删除。` : ''}这个操作不能撤销。`,
      action: '永久删除',
    });
    if (!confirmed) return;
    const next = focusNeighbor(item);
    slideRows(() => {
      if (item.object.dataset.form !== 'bar') place(item, 'bar');
      state.items.delete(item.id);
      render();
    });
    next?.focus({ preventScroll: true });
    notify('已永久删除');
  }
  function changeDate(item, group, label) {
    const before = { group: item.group, when: item.when, late: item.late };
    slideRows(() => { Object.assign(item, { group, when: label, late: false }); updateMeta(item); render(); });
    resizeEditor(item);
    flash(item);
    notify(`已改到「${label}」`, () => {
      slideRows(() => { Object.assign(item, before); updateMeta(item); render(); });
      flash(item);
    });
  }

  // 气泡和菜单：Esc 或点外面关闭，焦点回到触发的元素。

  let pop = null;
  function closePop({ focus = true } = {}) {
    if (!pop) return false;
    const { node, anchor } = pop;
    pop = null;
    node.remove();
    if (focus && anchor.isConnected) anchor.focus({ preventScroll: true });
    return true;
  }
  function openPop(anchor, node) {
    closePop({ focus: false });
    node.classList.add('pop');
    document.body.append(node);
    const rect = anchor.getBoundingClientRect();
    const width = node.offsetWidth;
    const height = node.offsetHeight;
    node.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - width - 8))}px`;
    node.style.top = `${rect.bottom + height + 8 > innerHeight ? Math.max(8, rect.top - height - 4) : rect.bottom + 4}px`;
    pop = { node, anchor };
    node.querySelector('button:not([aria-disabled="true"])')?.focus();
  }
  function moveInPop(step) {
    const buttons = [...pop.node.querySelectorAll('button')];
    const index = buttons.indexOf(document.activeElement);
    buttons[(index + step + buttons.length) % buttons.length].focus();
  }
  function openDatePopover(anchor, item) {
    if (pop?.anchor === anchor) { closePop(); return; }
    const choices = [['today', '今天'], ['next', '明天'], ['next', '下周一'], ['next', '不安排']];
    const node = element('div', { role: 'dialog', 'aria-label': '改计划日' },
      ...choices.map(([group, label]) => element('button', { type: 'button', onclick: () => { closePop(); changeDate(item, group, label); } }, label)));
    openPop(anchor, node);
  }
  function openMenu(anchor, item) {
    if (pop?.anchor === anchor) { closePop(); return; }
    const node = element('div', { role: 'menu', 'aria-label': '更多操作' });
    const entry = (label, onclick, options = {}) => element('button', { type: 'button', role: 'menuitem', class: options.danger ? 'danger' : '', onclick }, label);
    if (!item.readOnly) node.append(entry('归档', () => { closePop({ focus: false }); archive([item]); }));
    if (!item.readOnly && deleteBlocked(item)) {
      const blocked = element('button', { type: 'button', role: 'menuitem', 'aria-disabled': 'true', onclick: (event) => event.preventDefault() }, '永久删除');
      node.append(blocked, element('small', {}, '还有没做完的子任务，先做完或归档。'));
    } else if (!item.readOnly) {
      node.append(entry('永久删除', () => { closePop({ focus: false }); deleteForever(item); }, { danger: true }));
    } else {
      node.append(element('small', {}, '外部日程没有可做的操作。'));
    }
    openPop(anchor, node);
  }

  // 对话框：必须先回答的决定。

  const confirmEl = element('dialog', { class: 'confirm' });
  function askConfirm({ title, text, action }) {
    return new Promise((resolve) => {
      const close = (value) => { confirmEl.close(); resolve(value); };
      const cancel = element('button', { type: 'button', class: 'btn', autofocus: true, onclick: () => close(false) }, '取消');
      confirmEl.replaceChildren(
        element('h2', {}, title),
        element('p', {}, text),
        element('div', { class: 'confirm-actions' }, cancel, element('button', { type: 'button', class: 'btn btn-danger', onclick: () => close(true) }, action)),
      );
      confirmEl.oncancel = (event) => { event.preventDefault(); close(false); };
      confirmEl.showModal();
      cancel.focus();
    });
  }

  // 搜索

  const searchInput = element('input', { type: 'search', class: 'search-input', placeholder: '搜索事项', 'aria-label': '搜索事项', autocomplete: 'off' });
  const searchResults = element('div', { class: 'search-results', role: 'listbox', 'aria-label': '搜索结果' });
  const searchEl = element('dialog', { class: 'search' }, searchInput, searchResults);
  let searchTimer;
  let searchIndex = 0;
  function runSearch() {
    const query = searchInput.value.trim().toLowerCase();
    const all = [...state.items.values()].filter((item) => !item.archived);
    const found = query ? all.filter((item) => `${item.title} ${item.body}`.toLowerCase().includes(query)) : all.slice(0, 5);
    searchIndex = 0;
    if (!found.length) {
      searchResults.replaceChildren(element('div', { class: 'search-empty' },
        element('p', {}, `没有找到「${searchInput.value.trim()}」`),
        element('button', { type: 'button', class: 'btn', onclick: () => { searchInput.value = ''; runSearch(); searchInput.focus(); } }, '清除')));
      return;
    }
    searchResults.replaceChildren(
      element('p', { class: 'search-label' }, query ? `${found.length} 个结果` : '最近'),
      ...found.map((item, index) => element('button', {
        type: 'button', class: 'search-item', role: 'option', 'aria-selected': String(index === 0), onclick: () => openResult(item),
      }, element('span', { class: 'search-title' }, item.title), element('span', { class: 'meta' }, item.object.dataset.form === 'page' ? '已打开' : `${item.space} · ${item.when}`))),
    );
  }
  function markResult(step) {
    const options = [...searchResults.querySelectorAll('[role="option"]')];
    if (!options.length) return null;
    searchIndex = (searchIndex + step + options.length) % options.length;
    options.forEach((option, index) => option.setAttribute('aria-selected', String(index === searchIndex)));
    options[searchIndex].scrollIntoView({ block: 'nearest' });
    return options[searchIndex];
  }
  function openSearch() {
    if (searchEl.open) return;
    searchInput.value = '';
    runSearch();
    searchEl.showModal();
    searchInput.focus();
  }
  function openResult(item) {
    searchEl.close();
    if (item.object.dataset.form === 'page') { flash(item); item.head.focus(); return; }
    const pageOpen = pageLayer.firstElementChild;
    if (pageOpen) place(itemOf(pageOpen), itemOf(pageOpen).from);
    if (state.space !== '全部' && item.space !== state.space) { state.space = '全部'; render(); }
    if (item.object.dataset.form === 'bar') go(item, 'card');
    else item.head.focus();
    item.home.scrollIntoView({ block: 'nearest' });
    flash(item);
  }
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(runSearch, ms('interaction-search-debounce'));
  });
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); markResult(1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); markResult(-1); }
    else if (event.key === 'Enter') {
      event.preventDefault();
      clearTimeout(searchTimer);
      runSearch();
      searchResults.querySelector('[aria-selected="true"]')?.click();
    }
  });

  // 记一笔

  function buildCapture() {
    const input = element('input', { type: 'text', class: 'capture-input', placeholder: '记一笔，比如：明天交周报', 'aria-label': '记一笔', autocomplete: 'off' });
    const kind = element('div', { class: 'segmented', role: 'radiogroup', 'aria-label': '记成什么' });
    let chosen = 'task';
    for (const [value, label] of [['task', '待办'], ['log', '记录']]) {
      const button = element('button', { type: 'button', role: 'radio', 'aria-checked': String(value === chosen), onclick: () => {
        chosen = value;
        kind.querySelectorAll('button').forEach((other) => other.setAttribute('aria-checked', String(other === button)));
      } }, label);
      kind.append(button);
    }
    const tag = element('span', { class: 'capture-tag', hidden: true });
    const error = element('p', { class: 'field-error', id: 'capture-error', hidden: true });
    const clearError = () => { error.hidden = true; input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby'); };
    input.addEventListener('input', () => {
      const match = input.value.match(DATE_WORD);
      tag.hidden = !match;
      tag.textContent = match ? match[1] : '';
      if (input.value.trim()) clearError();
    });
    const form = element('form', { class: 'capture', novalidate: true, onsubmit: (event) => {
      event.preventDefault();
      const raw = input.value.trim();
      if (!raw) {
        error.textContent = '先写点内容再记。';
        error.hidden = false;
        input.setAttribute('aria-invalid', 'true');
        input.setAttribute('aria-describedby', 'capture-error');
        input.focus();
        return;
      }
      const match = raw.match(DATE_WORD);
      const title = (match ? raw.replace(match[1], '').trim() : raw) || raw;
      const when = match ? match[1] : (chosen === 'log' ? '刚刚' : '今天');
      const group = chosen === 'log' ? 'recent' : (match && match[1] !== '今天' ? 'next' : 'today');
      const space = state.space === '全部' ? '日常' : state.space;
      const item = buildObject({ id: `n${Date.now()}`, kind: chosen, title, space, group, when, body: '' });
      state.items = new Map([[item.id, item], ...state.items]);
      place(item, 'bar');
      if (state.view !== 'ready') setView('ready');
      slideRows(render);
      flash(item);
      input.value = '';
      tag.hidden = true;
      notify(`已记下「${short(title)}」`, () => {
        slideRows(() => { state.items.delete(item.id); render(); });
      });
      input.focus();
    } },
    element('div', { class: 'capture-row' }, input, tag, kind, element('button', { type: 'submit', class: 'btn btn-primary' }, '记下')),
    error);
    return form;
  }

  // 多选

  function clearSelection() {
    for (const id of state.selected) state.items.get(id)?.object.removeAttribute('data-selected');
    state.selected.clear();
    renderBulk();
  }
  function renderBulk() {
    bulk.hidden = state.selected.size === 0;
    if (bulk.hidden) return;
    const items = [...state.selected].map((id) => state.items.get(id));
    bulk.replaceChildren(
      element('span', {}, `已选 ${items.length} 项`),
      element('button', { type: 'button', class: 'btn', onclick: () => { items.filter((item) => item.kind === 'task' && !item.done).forEach(toggleDone); clearSelection(); } }, '完成'),
      element('button', { type: 'button', class: 'btn', onclick: () => archive(items) }, '归档'),
      element('button', { type: 'button', class: 'btn', onclick: clearSelection }, '取消选择'),
    );
  }
  function toggleSelected(item, range) {
    const ids = visibleHeads().map((head) => itemOf(head).id);
    const targets = range && state.anchor ? ids.slice(Math.min(ids.indexOf(state.anchor), ids.indexOf(item.id)), Math.max(ids.indexOf(state.anchor), ids.indexOf(item.id)) + 1) : [item.id];
    const on = range || !state.selected.has(item.id);
    for (const id of targets) {
      if (on) state.selected.add(id);
      else state.selected.delete(id);
      state.items.get(id).object.toggleAttribute('data-selected', on);
    }
    state.anchor = item.id;
    renderBulk();
  }

  // 键盘

  const visibleHeads = () => [...groupsEl.querySelectorAll('.home:not(.is-away) .head-button')];
  document.addEventListener('keydown', (event) => {
    const meta = event.metaKey || event.ctrlKey;
    if (meta && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openSearch();
      return;
    }
    if (document.querySelector('dialog[open]')) return;
    if (pop) {
      if (event.key === 'Escape') { event.preventDefault(); closePop(); }
      else if (event.key === 'ArrowDown') { event.preventDefault(); moveInPop(1); }
      else if (event.key === 'ArrowUp') { event.preventDefault(); moveInPop(-1); }
      return;
    }
    const object = event.target.closest?.('.object');
    const item = object ? itemOf(object) : null;
    const inField = event.target.matches?.('input, textarea, select');
    if (event.key === 'Escape') {
      if (inField && item) { item.head.focus({ preventScroll: true }); return; }
      if (state.selected.size) { clearSelection(); return; }
      const page = pageLayer.firstElementChild;
      const card = groupsEl.querySelector('.object[data-form="card"]');
      if (page) go(itemOf(page), itemOf(page).from);
      else if (card) go(itemOf(card), 'bar');
      return;
    }
    if (event.key === 'Enter' && meta && item) {
      event.preventDefault();
      go(item, 'page');
      return;
    }
    if (inField || !item) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const heads = visibleHeads();
      const index = heads.indexOf(item.head);
      const next = heads[index + (event.key === 'ArrowDown' ? 1 : -1)];
      if (next) { event.preventDefault(); next.focus(); }
    } else if (event.key === 'Delete' && !item.readOnly) {
      event.preventDefault();
      archive(state.selected.size ? [...state.selected].map((id) => state.items.get(id)) : [item]);
    }
  });
  document.addEventListener('pointerdown', (event) => {
    if (pop && !pop.node.contains(event.target) && !pop.anchor.contains(event.target)) closePop({ focus: false });
  });
  document.addEventListener('click', (event) => {
    const head = event.target.closest('.head-button');
    if (!head) return;
    const item = itemOf(head);
    if (event.metaKey || event.ctrlKey || event.shiftKey) {
      toggleSelected(item, event.shiftKey);
      return;
    }
    const form = item.object.dataset.form;
    if (form === 'bar') go(item, 'card');
    else if (form === 'card') go(item, 'bar');
  });

  // 装配

  for (const data of ITEMS) {
    const item = buildObject({ ...data });
    state.items.set(item.id, item);
    place(item, 'bar');
  }
  navEl.append(...SPACES.map((space) => element('button', { type: 'button', class: 'nav-item', 'data-space': space, onclick: () => { state.space = space; render(); } }, space)));
  const searchButton = element('button', { type: 'button', class: 'btn search-button', 'aria-keyshortcuts': 'Meta+K Control+K', onclick: openSearch }, '搜索 ', element('kbd', {}, IS_MAC ? '⌘K' : 'Ctrl K'));
  workspace.append(
    element('header', { class: 'page-head' }, element('div', {}, element('h1', {}, '今天'), subEl), searchButton),
    buildCapture(), stateEl, groupsEl,
  );
  app.append(buildControls(), element('div', { class: 'app' }, navEl, workspace), pageLayer, bulk, feedback, searchEl, confirmEl);
  render();
})();
