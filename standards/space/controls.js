// 间距样例顶部的开关：疏密、圆角。开关只改根元素上的属性，样例本身不用知道。开关是 ../controls/controls.css 的小下拉。
window.addSpaceControls = (bar) => {
  const root = document.documentElement;
  const CHEVRON = '<svg class="icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 6.25L8 9.75l3.5-3.5"/></svg>';
  const select = (label, id, options, value, apply) => {
    const wrap = document.createElement('label');
    wrap.className = 'select small';
    wrap.innerHTML = `<span class="select-label"></span><select id="${id}"></select>${CHEVRON}`;
    wrap.querySelector('.select-label').textContent = label;
    const element = wrap.querySelector('select');
    for (const [option, text] of options) element.add(new Option(text, option));
    element.value = value;
    element.addEventListener('change', () => apply(element.value));
    bar.append(wrap);
  };
  select('疏密', 'density', [['compact', '紧'], ['regular', '常规'], ['loose', '松']], root.dataset.density ?? 'regular', (value) => {
    root.dataset.density = value;
  });
  select('圆角', 'radius', [['none', '直角'], ['small', '小'], ['regular', '大（默认）']], root.dataset.radius ?? 'regular', (value) => {
    root.dataset.radius = value;
  });
};
