// 色阶一览。每一格下面的数字是实际算出来的对比度，低于下限的标 ✗。切换数值来源和明暗时重新算。
(() => {
  'use strict';
  const SCALES = [['gray', '灰'], ['red', '红：错误'], ['amber', '琥珀：警告'], ['green', '绿：成功'], ['hue', '强调色']];
  const GROUPS = [['背景', 2], ['控件底色', 3], ['边框', 3], ['实心底色', 2], ['文字', 2]];
  const STEPS = Array.from({ length: 12 }, (_, index) => index + 1);

  const main = document.createElement('main');
  const cells = (scale) => STEPS.map((step) => `<td><span class="chip" data-scale="${scale}" data-step="${step}" style="background:var(--color-${scale}-${step})"></span><span class="ratio t-caption"></span></td>`).join('');
  main.innerHTML = `
    <div class="bar t-caption" id="bar"><span id="status">${document.title}</span></div>
    <div class="scale-wrap" tabindex="0" role="region" aria-label="12 级色阶和对比度">
      <table class="scale t-caption">
        <thead>
          <tr><th class="name" scope="col"></th>${GROUPS.map(([label, span]) => `<th colspan="${span}" scope="colgroup">${label}</th>`).join('')}</tr>
          <tr><th class="name" scope="col">级</th>${STEPS.map((step) => `<th scope="col">${step}</th>`).join('')}</tr>
        </thead>
        <tbody>${SCALES.map(([scale, label]) => `<tr><th class="name" scope="row">${label}</th>${cells(scale)}</tr>`).join('')}</tbody>
      </table>
    </div>
    <p class="tally t-ui" id="tally"></p>
    <p class="legend t-caption">第 7、8 级：在第 1–3 级上最低的对比度，下限 3。第 9、10 级：配文字的对比度，下限 4.5。第 11、12 级：在第 1–5 级上最低的对比度，下限 4.5。其余几级没有下限。</p>
    <p class="legend t-caption">Radix 第 9、10 级配的文字按它的说明：琥珀配深色，其余配白色。</p>`;
  document.body.append(main);

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const rgb = (css) => {
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = css;
    context.fillRect(0, 0, 1, 1);
    return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
  };
  const linear = (value) => {
    const unit = value / 255;
    return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  };
  const luminance = ([r, g, b]) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  const ratio = (one, other) => {
    const [light, dark] = [luminance(one), luminance(other)].sort((x, y) => y - x);
    return (light + 0.05) / (dark + 0.05);
  };

  function measure() {
    const root = document.documentElement;
    const radix = root.dataset.values === 'radix';
    const colorOf = (scale, step) => rgb(getComputedStyle(document.querySelector(`[data-scale="${scale}"][data-step="${step}"]`)).backgroundColor);
    // 实心底色配的文字：自己生成的用 on-solid；Radix 按它自己的说明。
    const solidText = (scale) => {
      if (!radix) return colorOf('gray', 1);
      const isAmber = scale === 'amber' || (scale === 'hue' && root.dataset.hueName === 'amber');
      return isAmber ? colorOf('gray', 12).map((value, index) => (luminance(colorOf('gray', 12)) > 0.5 ? colorOf('gray', 1)[index] : value)) : [255, 255, 255];
    };
    let failing = 0;
    for (const chip of document.querySelectorAll('.chip')) {
      const { scale } = chip.dataset;
      const step = Number(chip.dataset.step);
      const own = rgb(getComputedStyle(chip).backgroundColor);
      const label = chip.nextElementSibling;
      let value = null;
      let floor = 0;
      if (step === 7 || step === 8) {
        value = Math.min(...[1, 2, 3].map((base) => ratio(own, colorOf(scale, base))));
        floor = 3;
      } else if (step === 9 || step === 10) {
        value = ratio(own, solidText(scale));
        floor = 4.5;
      } else if (step >= 11) {
        value = Math.min(...[1, 2, 3, 4, 5].map((base) => ratio(own, colorOf(scale, base))));
        floor = 4.5;
      }
      if (value === null) {
        label.textContent = '';
        label.className = 'ratio t-caption';
        continue;
      }
      const fails = value < floor;
      if (fails) failing += 1;
      label.textContent = `${value.toFixed(2)}${fails ? ' ✗' : ''}`;
      label.className = `ratio t-caption${fails ? ' fail' : ''}`;
    }
    const checked = SCALES.length * 6;
    document.getElementById('tally').textContent = failing
      ? `${checked} 格有下限，其中 ${failing} 格低于下限。`
      : `${checked} 格有下限，全部过线。`;
    document.getElementById('tally').dataset.failing = failing;
  }

  window.addColorControls(document.getElementById('bar'), { values: true, hues: true, onChange: measure });
  measure();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', measure);
})();
