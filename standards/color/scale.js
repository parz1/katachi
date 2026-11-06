// 色阶一览。每一格下面的数字是实际算出来的、在页面背景上的对比度，再写明够不够当文字或边框。切换明暗和强调色时重新算。
(() => {
  'use strict';
  const SCALES = [['gray', '灰'], ['red', '红：错误'], ['amber', '琥珀：警告'], ['green', '绿：成功'], ['sand', '沙：纸和墨'], ['hue', '强调色']];
  const GROUPS = [['背景', 2], ['控件底色', 3], ['边框', 3], ['实心底色', 2], ['文字', 2]];
  const STEPS = Array.from({ length: 12 }, (_, index) => index + 1);

  const main = document.createElement('main');
  const cells = (scale) => STEPS.map((step) => `<td><span class="chip" data-scale="${scale}" data-step="${step}" style="background:var(--color-${scale}-${step})"></span><span class="ratio t-caption"></span><span class="can t-caption"></span></td>`).join('');
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
    <p class="legend t-caption">上面一行是 Radix 给每一级定的用途。数字是这一级在第 1 级上的对比度，按 WCAG 算。4.5 以上写「文字」，能当文字；3 以上写「边框」，能当控件边框；再低的只能当背景和装饰。所以灰的第 7、8 级不用作控件边框，控件边框用第 10 级。</p>`;
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
    for (const chip of document.querySelectorAll('.chip')) {
      const first = document.querySelector(`[data-scale="${chip.dataset.scale}"][data-step="1"]`);
      const value = ratio(rgb(getComputedStyle(chip).backgroundColor), rgb(getComputedStyle(first).backgroundColor));
      const [number, can] = [chip.nextElementSibling, chip.nextElementSibling.nextElementSibling];
      number.textContent = chip.dataset.step === '1' ? '' : value.toFixed(2);
      can.textContent = value >= 4.5 ? '文字' : value >= 3 ? '边框' : '';
    }
  }

  window.addColorControls(document.getElementById('bar'), { accents: true, onChange: measure });
  measure();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', measure);
})();
