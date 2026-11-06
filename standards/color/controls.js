// 颜色样例顶部的开关：明暗、强调色。开关只改根元素，样例本身不用知道。
window.addColorControls = (bar, { accents = false, onChange = () => {} } = {}) => {
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

  if (!accents) return;
  // 蓝色只是开始时的举例，不是推荐。
  const SCALES = {
    blue: ['蓝'], indigo: ['靛'], iris: ['鸢尾'], violet: ['堇'], purple: ['紫'], plum: ['李紫'], pink: ['粉'],
    crimson: ['绯红', '错误'], ruby: ['宝石红', '错误'], red: ['红', '错误'], tomato: ['番茄', '错误'],
    orange: ['橙', '警告'], amber: ['琥珀', '警告'], yellow: ['黄', '警告'],
    lime: ['青柠'], grass: ['草绿', '成功'], green: ['绿', '成功'], jade: ['玉', '成功'], teal: ['青绿'], mint: ['薄荷'], cyan: ['青'], sky: ['天蓝'],
    brown: ['棕'], bronze: ['青铜'], gold: ['金'],
  };
  const accent = select('强调色', 'accent', Object.entries(SCALES).map(([name, [label]]) => [name, `${label} ${name}`]));
  const note = document.createElement('span');
  note.className = 'note';
  note.id = 'accent-note';
  bar.append(note);
  accent.addEventListener('change', () => {
    root.dataset.accent = accent.value;
    const near = SCALES[accent.value][1];
    note.textContent = near ? `这条色阶和${near}的颜色相近，状态要靠文字和图标分开。` : '';
    onChange();
  });
};
