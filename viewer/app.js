// 查看器页面的交互。没有这个脚本时，内容仍然可读。
(function () {
  'use strict';

  const channel = (value) => {
    const unit = value / 255;
    return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  };
  const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  const parseColor = (css) => css.match(/[\d.]+/g).slice(0, 3).map(Number);
  const grayFor = (target, round) => {
    const value = target <= 0.0031308 ? 12.92 * target : 1.055 * target ** (1 / 2.4) - 0.055;
    return Math.min(255, Math.max(0, round(value * 255)));
  };

  // 对比度样本：按当前背景算出正好落在下限上的灰色。
  function paintContrast() {
    const background = luminance(parseColor(getComputedStyle(document.body).backgroundColor));
    for (const element of document.querySelectorAll('[data-ratio]')) {
      const ratio = Number(element.dataset.ratio);
      const darker = (background + 0.05) / ratio - 0.05;
      const gray = darker > 0
        ? grayFor(darker, Math.floor)
        : grayFor((background + 0.05) * ratio - 0.05, Math.ceil);
      element.style[element.dataset.ratioProperty || 'color'] = `rgb(${gray}, ${gray}, ${gray})`;
      const foreground = luminance([gray, gray, gray]);
      const actual = (Math.max(background, foreground) + 0.05) / (Math.min(background, foreground) + 0.05);
      const label = element.closest('.contrast-item')?.querySelector('[data-ratio-label]');
      if (label) label.textContent = `实际 ${actual.toFixed(2)}:1`;
    }
  }

  // 窗口尺寸类：标出当前窗口落在哪一类。
  function paintRulers() {
    for (const ruler of document.querySelectorAll('[data-ruler]')) {
      const axis = ruler.dataset.ruler;
      const size = axis === 'width' ? window.innerWidth : window.innerHeight;
      const stops = JSON.parse(ruler.dataset.stops);
      const current = stops.filter((stop) => size >= stop.from).pop();
      const marker = ruler.querySelector('.ruler-marker');
      marker.hidden = false;
      marker.style.left = `${Math.min(size / Number(ruler.dataset.max), 1) * 100}%`;
      const output = document.querySelector(`[data-ruler-output="${axis}"]`);
      if (output) output.textContent = `当前窗口 ${size} px，属于 ${current ? current.label : '未知'}。`;
    }
  }

  const press = (buttons, active) => {
    for (const button of buttons) button.setAttribute('aria-pressed', String(button === active));
  };

  // 比较方案：把页面按选定宽度渲染，再缩放到可用空间。
  function layoutBench(bench) {
    const width = Number(bench.dataset.width);
    const height = Number(bench.dataset.height) || 800;
    for (const box of bench.querySelectorAll('.frame-box')) {
      const frame = box.querySelector('iframe');
      box.style.maxWidth = `${width}px`;
      const scale = Math.min(1, box.clientWidth / width);
      frame.style.width = `${width}px`;
      frame.style.height = `${height}px`;
      frame.style.transform = `scale(${scale})`;
      box.style.height = `${Math.round(height * scale)}px`;
    }
  }

  for (const bench of document.querySelectorAll('[data-bench]')) {
    const widthButtons = bench.querySelectorAll('[data-width]:not([data-bench])');
    for (const button of widthButtons) {
      button.addEventListener('click', () => {
        bench.dataset.width = button.dataset.width;
        bench.dataset.height = button.dataset.height;
        press(widthButtons, button);
        layoutBench(bench);
      });
    }
    const stack = bench.querySelector('[data-stack]');
    if (stack) {
      stack.addEventListener('click', () => {
        const on = stack.getAttribute('aria-pressed') !== 'true';
        stack.setAttribute('aria-pressed', String(on));
        bench.classList.toggle('is-stacked', on);
        layoutBench(bench);
      });
    }
    const gray = bench.querySelector('[data-gray]');
    if (gray) {
      gray.addEventListener('click', () => {
        const on = gray.getAttribute('aria-pressed') !== 'true';
        gray.setAttribute('aria-pressed', String(on));
        bench.classList.toggle('is-gray', on);
      });
    }
    layoutBench(bench);
    new ResizeObserver(() => layoutBench(bench)).observe(bench);
  }

  // 内容压力：切换宽度和单行截断。
  const stress = document.querySelector('[data-stress]');
  if (stress) {
    const widthButtons = document.querySelectorAll('[data-stress-width]');
    for (const button of widthButtons) {
      button.addEventListener('click', () => {
        stress.style.width = button.dataset.stressWidth ? `${button.dataset.stressWidth}px` : '';
        press(widthButtons, button);
      });
    }
    const truncate = document.querySelector('[data-stress-truncate]');
    truncate.addEventListener('click', () => {
      const on = truncate.getAttribute('aria-pressed') !== 'true';
      truncate.setAttribute('aria-pressed', String(on));
      stress.classList.toggle('is-truncated', on);
    });
  }

  // 目录：标出当前章节。
  const sections = [...document.querySelectorAll('section[id]')];
  const links = new Map([...document.querySelectorAll('.side a')].map((link) => [link.getAttribute('href').slice(1), link]));
  function paintNavigation() {
    const line = window.innerHeight * 0.2;
    let current = sections[0];
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= line) current = section;
    }
    for (const [id, link] of links) {
      if (id === current?.id) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  }
  let scheduled = false;
  window.addEventListener('scroll', () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      paintNavigation();
    });
  }, { passive: true });

  paintContrast();
  paintRulers();
  paintNavigation();
  window.addEventListener('resize', () => {
    paintRulers();
    paintNavigation();
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', paintContrast);
}());
