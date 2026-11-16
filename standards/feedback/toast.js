// katachi「浮在底部」提示的 Web 参考实现，规则见 ../feedback.md。不依赖框架，可以整个复制进产品。
// 先引入 controls.css 和 feedback.css。读屏的播报区由页面自己放（role="status" 和 role="alert"），这里不管。
//
//   const toasts = window.katachiToasts({ icon: (kind) => '<svg …>' });
//   toasts.show({ key: 'task:t4', kind: 'success', text: '删除了「设置」', action: { label: '撤销', run: undo }, back: () => 出事的控件 });
//   toasts.clear('task:t4');
//
// - 成功的过几秒消失，鼠标停在上面或焦点在里面时先不消失；出错的留到关掉或解决，带「关闭」。
// - 同一个 key 只留最新的一条，最多叠 3 条。提示不抢焦点。
// - Esc 关掉最新的一条，焦点不动：提示盖住了焦点时，按 Esc 就能露出来（WCAG 2.4.11）。
// - 提示在的时候，页面底下留出它占的高度，获得焦点的控件滚到它上面，不被盖住。
window.katachiToasts = ({ time = 5000, max = 3, icon = () => '' } = {}) => {
  const stack = document.createElement('section');
  stack.className = 'toasts';
  stack.setAttribute('aria-label', '提示');
  document.body.append(stack);
  const esc = (text) => String(text).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);
  const backs = new WeakMap(); // 每条提示关掉时焦点回到哪

  // 提示占住的高度：从最上面那条到窗口底边。
  const reserve = () => {
    const height = stack.children.length ? `${Math.ceil(window.innerHeight - stack.getBoundingClientRect().top)}px` : '';
    document.body.style.paddingBlockEnd = height;
    document.documentElement.style.scrollPaddingBlockEnd = height;
  };
  const uncover = () => {
    const active = document.activeElement;
    if (!active || active === document.body || stack.contains(active) || !stack.children.length) return;
    if (active.getBoundingClientRect().bottom > stack.getBoundingClientRect().top) active.scrollIntoView({ block: 'nearest' });
  };
  const remove = (toast) => {
    toast.remove();
    reserve();
  };

  const clear = (key) => {
    const toast = stack.querySelector(`.toast[data-key="${CSS.escape(key)}"]`);
    if (toast) remove(toast);
  };

  const show = ({ key, kind, text, action, back }) => {
    clear(key);
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.dataset.key = key;
    const buttons = [
      action ? `<button type="button" class="btn small" data-note-action>${esc(action.label)}</button>` : '',
      kind === 'error' ? '<button type="button" class="btn small" data-note-close>关闭</button>' : '',
    ].join('');
    toast.innerHTML = `<p class="note is-${kind}">${icon(kind)}<span>${esc(text)}</span>${buttons ? `<span class="note-actions">${buttons}</span>` : ''}</p>`;
    toast.querySelector('[data-note-action]')?.addEventListener('click', () => action.run());
    toast.querySelector('[data-note-close]')?.addEventListener('click', () => {
      remove(toast);
      back?.()?.focus();
    });
    backs.set(toast, back);
    stack.append(toast);
    while (stack.children.length > max) stack.firstElementChild.remove();
    reserve();
    uncover();
    if (kind !== 'success') return;
    let left = time;
    let started = 0;
    let timer;
    const run = () => {
      started = Date.now();
      timer = setTimeout(() => {
        // 消失时焦点在里面的话，先放回出事的地方。
        if (toast.contains(document.activeElement)) back?.()?.focus();
        remove(toast);
      }, left);
    };
    const pause = () => {
      clearTimeout(timer);
      left = Math.max(0, left - (Date.now() - started));
    };
    const held = () => toast.matches(':hover, :focus-within');
    toast.addEventListener('mouseenter', pause);
    toast.addEventListener('focusin', pause);
    toast.addEventListener('mouseleave', () => { if (!held()) run(); });
    toast.addEventListener('focusout', () => setTimeout(() => { if (!held()) run(); }));
    run();
  };

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !stack.lastElementChild || event.defaultPrevented) return;
    const newest = stack.lastElementChild;
    const inside = newest.contains(document.activeElement);
    remove(newest);
    if (inside) backs.get(newest)?.()?.focus();
  });
  window.addEventListener('resize', reserve);

  return { show, clear, element: stack };
};
