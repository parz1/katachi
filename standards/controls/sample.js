// 控件一览的脚本：把 data-icon 换成图标，加上顶上的开关，让「空着的提交按钮」两个例子能操作。
(() => {
  'use strict';
  // agent 画的线条图标：16 格，线宽 1.5，圆头，跟着字号和字的颜色。没有授权限制。图标用哪一套还没定，见 ../controls.md。
  const PATHS = {
    chevron: '<path d="M4.5 6.25L8 9.75l3.5-3.5"/>',
    spinner: '<path d="M8 2a6 6 0 1 1-6 6"/>',
    alert: '<path d="M8 2.25l6.25 11.25H1.75z"/><path d="M8 6.5v3M8 11.5v.25"/>',
    done: '<circle cx="8" cy="8" r="6"/><path d="M5.4 8.2l1.8 1.8 3.4-3.9"/>',
    plus: '<path d="M8 3.5v9M3.5 8h9"/>',
  };
  const icon = (name, spin = false) => `<svg class="icon${spin ? ' spin' : ''}" viewBox="0 0 16 16" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${PATHS[name]}</svg>`;
  for (const node of document.querySelectorAll('[data-icon]')) node.outerHTML = icon(node.dataset.icon, node.dataset.spin !== undefined);

  const bar = document.getElementById('bar');
  window.addSpaceControls(bar);
  window.addColorControls(bar, { accents: true });

  // 例子里的链接只是样子，点了不跳走。
  document.addEventListener('click', (event) => {
    if (event.target.closest('a[href="#"]')) event.preventDefault();
  });

  // 快捷键按系统写。
  const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  for (const node of document.querySelectorAll('.shortcut')) node.textContent = `${mac ? '⌘' : 'Ctrl'} Enter 记下`;

  const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });
  const note = (kind, text, action = '') => `<p class="note is-${kind}">${icon(kind === 'success' ? 'done' : kind === 'pending' ? 'spinner' : 'alert', kind === 'pending')}<span>${text}</span>${action}</p>`;
  const escape = (text) => text.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);

  // 只有一个输入框：空着时禁用，打了字才能点。保存中样子不变，换成转圈和「记下中」，焦点不丢。
  const noteForm = document.getElementById('note-form');
  const noteText = document.getElementById('note-text');
  const noteSubmit = document.getElementById('note-submit');
  const noteStatus = document.getElementById('note-status');
  const busy = (button) => button.getAttribute('aria-disabled') === 'true';
  noteText.addEventListener('input', () => {
    noteSubmit.disabled = !noteText.value.trim();
  });
  noteText.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      noteForm.requestSubmit();
    }
  });
  noteForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = noteText.value.trim();
    if (!text || busy(noteSubmit)) return;
    noteSubmit.setAttribute('aria-disabled', 'true');
    noteSubmit.innerHTML = `${icon('spinner', true)}记下中`;
    noteStatus.innerHTML = '';
    await wait(900);
    noteSubmit.removeAttribute('aria-disabled');
    noteSubmit.textContent = '记下';
    noteStatus.innerHTML = note('success', `记下了「${escape(text)}」`);
    // 先把焦点放回输入框，再清空、禁用按钮，焦点才不会丢。
    noteText.focus();
    noteText.value = '';
    noteSubmit.disabled = true;
  });

  // 要填好几项：按钮一直能点，点了在没填的每一项下面写清缺什么，焦点移到第一个没填的地方。
  const projectForm = document.getElementById('project-form');
  const projectStatus = document.getElementById('project-status');
  const required = [...projectForm.querySelectorAll('[data-missing]')];
  const setError = (field, message) => {
    const hint = document.getElementById(field.getAttribute('aria-describedby'));
    if (message) {
      field.setAttribute('aria-invalid', 'true');
      hint.textContent = message;
      hint.className = 'hint is-error';
      hint.hidden = false;
    } else {
      field.removeAttribute('aria-invalid');
      hint.hidden = true;
    }
  };
  for (const field of required) {
    field.addEventListener('input', () => {
      if (field.value.trim()) setError(field, '');
    });
  }
  projectForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = projectForm.querySelector('[type="submit"]');
    if (busy(submit)) return;
    const missing = required.filter((field) => !field.value.trim());
    for (const field of required) setError(field, missing.includes(field) ? field.dataset.missing : '');
    projectStatus.innerHTML = '';
    if (missing.length) {
      missing[0].focus();
      return;
    }
    submit.setAttribute('aria-disabled', 'true');
    submit.innerHTML = `${icon('spinner', true)}创建中`;
    await wait(900);
    submit.removeAttribute('aria-disabled');
    submit.textContent = '创建项目';
    projectStatus.innerHTML = note('success', `已创建「${escape(required[0].value.trim())}」`);
  });
  projectForm.addEventListener('reset', () => {
    for (const field of required) setError(field, '');
    projectStatus.innerHTML = '';
  });
})();
