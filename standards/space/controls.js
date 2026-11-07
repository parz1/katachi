// 间距样例顶部的开关：疏密、圆角。开关只改根元素上的属性，样例本身不用知道。
window.addSpaceControls = (bar) => {
  const root = document.documentElement;
  const select = (label, id, options, value, apply) => {
    const wrap = document.createElement('label');
    wrap.className = 't-caption';
    wrap.textContent = `${label} `;
    const element = document.createElement('select');
    element.className = 't-caption';
    element.id = id;
    for (const [option, text] of options) element.add(new Option(text, option));
    element.value = value;
    element.addEventListener('change', () => apply(element.value));
    wrap.append(element);
    bar.append(wrap);
  };
  select('疏密', 'density', [['compact', '紧'], ['regular', '常规'], ['loose', '松']], root.dataset.density ?? 'regular', (value) => {
    root.dataset.density = value;
  });
  select('圆角', 'radius', [['none', '直角'], ['regular', '小'], ['large', '大']], root.dataset.radius ?? 'regular', (value) => {
    root.dataset.radius = value;
  });
};
