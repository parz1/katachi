// 阶梯、角色和形状的实际大小。数字都从页面上量出来，不手写，tokens 变了这里跟着变。
(() => {
  'use strict';
  const STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const ROLES = [
    ['part', '一个东西的几部分'],
    ['near', '挨着的小东西'],
    ['inset', '控件和行的左右留白'],
    ['item', '一组里的项'],
    ['group', '组和组'],
    ['section', '大区块'],
    ['page', '内容到窗口边缘'],
  ];
  const DENSITIES = [['compact', '紧'], ['regular', '常规'], ['loose', '松']];
  const RADII = [['none', '直角'], ['regular', '小（默认）'], ['large', '大']];

  const main = document.createElement('main');
  main.className = 'sheet';
  main.innerHTML = `
    <div class="bar t-caption" id="bar"><span>${document.title}</span></div>
    <section>
      <h2 class="t-ui">阶梯</h2>
      <div class="sheet-wrap"><table class="t-ui"><tbody>
        ${STEPS.map((step) => `<tr><th class="name" scope="row"><code class="t-mono">space.${step}</code></th><td class="ruler-cell"><span class="ruler" style="inline-size:var(--space-${step})"></span></td><td><span class="size t-caption" data-size="--space-${step}"></span></td></tr>`).join('')}
      </tbody></table></div>
    </section>
    <section>
      <h2 class="t-ui">角色在三种疏密下指向哪一级</h2>
      <div class="sheet-wrap"><table class="t-ui">
        <thead><tr><th class="name" scope="col">角色</th>${DENSITIES.map(([, label]) => `<th scope="col">${label}</th>`).join('')}</tr></thead>
        <tbody>
          ${ROLES.map(([role, meaning]) => `<tr><th class="name" scope="row"><code class="t-mono">space.${role}</code><span class="size t-caption">${meaning}</span></th>${DENSITIES.map(([density]) => `<td data-density="${density}"><span class="ruler" style="inline-size:var(--space-${role})"></span><span class="size t-caption" data-size="--space-${role}" data-step></span></td>`).join('')}</tr>`).join('')}
        </tbody>
      </table></div>
    </section>
    <section>
      <h2 class="t-ui">控件高度</h2>
      <div class="specimens">
        ${DENSITIES.map(([density, label]) => `<div class="specimen" data-density="${density}"><h3 class="t-caption">${label} <span data-size="--size-control"></span></h3><input class="t-ui" type="text" aria-label="${label}的输入框" value="设计资产 Settings"><div class="actions"><button class="t-ui primary" type="button">保存修改</button><button class="t-ui" type="button">取消</button></div></div>`).join('')}
      </div>
    </section>
    <section>
      <h2 class="t-ui">圆角</h2>
      <div class="specimens">
        ${RADII.map(([radius, label]) => `<div class="specimen" data-radius="${radius}"><h3 class="t-caption">${label}：控件 <span data-size="--radius-control"></span>，面 <span data-size="--radius-panel"></span></h3><div class="shape-panel"><div class="actions"><button class="t-ui primary" type="button">保存修改</button><button class="t-ui" type="button">取消</button></div></div></div>`).join('')}
      </div>
    </section>
    <section>
      <h2 class="t-ui">描边</h2>
      <div class="specimens">
        <div class="specimen"><h3 class="t-caption">分割线和控件边框 <span data-size="--stroke-thin"></span></h3><div class="stroke-line" style="border-block-start-width:var(--stroke-thin)"></div></div>
        <div class="specimen"><h3 class="t-caption">焦点环和当前项的标记 <span data-size="--stroke-thick"></span></h3><div class="stroke-line" style="border-block-start-width:var(--stroke-thick)"></div></div>
      </div>
    </section>`;
  document.body.append(main);

  // 量出 CSS 变量在这个元素上算出来是多少，所以 data-density 和 data-radius 都算数。
  const measure = (element, variable) => {
    const probe = document.createElement('span');
    probe.style.cssText = `position:absolute;visibility:hidden;inline-size:var(${variable})`;
    element.append(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    return Math.round(width * 100) / 100;
  };
  const ladder = new Map(STEPS.map((step) => [measure(main, `--space-${step}`), step]));
  for (const element of main.querySelectorAll('[data-size]')) {
    const px = measure(element.parentElement, element.dataset.size);
    const step = element.hasAttribute('data-step') ? `，第 ${ladder.get(px)} 级` : '';
    element.textContent = `${px}px${step}`;
  }
  window.addColorControls(document.getElementById('bar'));
})();
