// 颜色样例顶部的开关：明暗、数值来源、色相。开关只改根元素，样例本身不用知道。
window.addColorControls = (bar, { values = false, hues = false, onChange = () => {} } = {}) => {
  const root = document.documentElement;
  const select = (label, id, options) => {
    const wrap = document.createElement('label');
    wrap.className = 't-caption';
    wrap.textContent = `${label} `;
    const element = document.createElement('select');
    element.className = 't-caption';
    element.id = id;
    for (const [value, text] of options) element.add(new Option(text, value));
    wrap.append(element);
    bar.append(wrap);
    return element;
  };

  const scheme = select('明暗', 'scheme', [['', '跟随系统'], ['light', '浅色'], ['dark', '深色']]);
  scheme.addEventListener('change', () => {
    root.style.colorScheme = scheme.value;
    onChange();
  });

  if (values) {
    const source = select('数值', 'values', [['', '自己生成'], ['radix', 'Radix 原值']]);
    source.addEventListener('change', () => {
      if (source.value) root.dataset.values = source.value;
      else delete root.dataset.values;
      onChange();
    });
  }

  if (!hues) return;
  // 色相只是举例，不是推荐。Radix 只有固定的几条，这里挑最接近的。
  const HUES = {
    蓝: { hue: 255, name: 'blue' },
    青: { hue: 200, name: 'cyan' },
    绿: { hue: 150, name: 'green', near: '成功' },
    琥珀: { hue: 75, name: 'amber', near: '警告' },
    红: { hue: 27, name: 'red', near: '错误' },
    紫: { hue: 300, name: 'purple' },
  };
  const hue = select('色相', 'hue', Object.keys(HUES).map((name) => [name, name]));
  const note = document.createElement('span');
  note.className = 'note';
  note.id = 'hue-note';
  bar.append(note);
  hue.addEventListener('change', () => {
    const choice = HUES[hue.value];
    root.style.setProperty('--accent-hue', choice.hue);
    root.dataset.hueName = choice.name;
    note.textContent = choice.near ? `这个色相和${choice.near}的颜色相近，状态要靠文字和图标分开。` : '';
    onChange();
  });
};
