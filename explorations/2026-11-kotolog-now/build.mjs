// 生成第一轮的结构方案。所有方案共用同一份内容，只有结构不同。零依赖。
// 用法：node explorations/2026-11-kotolog-now/build.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const esc = (text) => String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ——— 同一份内容：来自 Kotolog 的原型和界面文案，最长的标题来自内容压力测试集 ———

const DATE = '11月6日 星期五';
const SUMMARY = '今天 6 项，3 项待处理';
const LONG_TITLE = '关于调整第四季度跨部门协作流程以及相关审批权限的补充说明（第二次修订）';
const UNPLANNED_TOTAL = 9;
const WEEK = [['周一', 2, ''], ['周二', 3, ''], ['周三', 4, ''], ['周四', 5, ''], ['周五', 6, 'on'], ['周六', 7, ''], ['周日', 8, '']];
const LANES = [['attention', '待处理'], ['now', '现在'], ['next', '接下来'], ['unplanned', '未安排'], ['recent', '最近活动']];
const SPACE_ORDER = ['研究', '日常', 'Kotolog', '阅读'];
const NAV = ['现在', 'Routine', '助手对话', '日历', '资料库'];

const task = (id, lane, title, space, note, plan, status) => ({ id, lane, kind: 'task', title, space, note, plan, status });
const ITEMS = [
  task('a41', 'attention', '交水电费', '日常', '逾期 3 天', '—', '逾期 3 天'),
  task('b07', 'attention', '整理访谈编码表', '研究', '周三计划，没做完', '周三', '没做完'),
  task('c19', 'attention', '写组会周报', '研究', '周四计划，没做完 · 后天 18:00 截止', '周四', '没做完，后天 18:00 截止'),
  { id: 'e01', lane: 'now', kind: 'event', title: '周会', space: '研究', note: '15:00–16:00', plan: '15:00–16:00', status: '' },
  { id: 'e02', lane: 'now', kind: 'event', title: '牙医复诊', space: '日常', note: '17:30', plan: '17:30', status: '' },
  task('d22', 'now', '回复 TestFlight 的反馈', 'Kotolog', '今天做', '今天', ''),
  task('d31', 'now', '看 expo-file-system 57 的迁移说明', 'Kotolog', '今天做', '今天', ''),
  task('d48', 'now', '读《Thinking in Systems》第 3 章', '阅读', '今天做', '今天', ''),
  task('d55', 'now', LONG_TITLE, '研究', '今天截止', '今天', '今天截止'),
  task('n61', 'next', '发 0.6.2', 'Kotolog', '周一', '周一', ''),
  task('n74', 'next', '准备读书会的问题', '阅读', '周二', '周二', ''),
  task('n83', 'next', '交房租', '日常', '周三截止', '周三', '周三截止'),
  task('u12', 'unplanned', '给爸妈订元旦回家的火车票', '日常', '今天记下', '—', '今天记下'),
  task('u25', 'unplanned', '换掉卧室的灯泡', '日常', '前天记下', '—', '前天记下'),
  task('u36', 'unplanned', '把「任务」视图的想法写成 issue', 'Kotolog', '周三记下', '—', '周三记下'),
  task('u47', 'unplanned', '查一下 Fly 东京机房的价格', 'Kotolog', '上周二记下', '—', '上周二记下'),
  task('u58', 'unplanned', '问房东续租的事', '日常', '上周五记下', '—', '上周五记下'),
  { id: 'l91', lane: 'recent', kind: 'log', title: '周末读书笔记', space: '阅读', note: '今天 09:40', plan: '—', status: '今天 09:40' },
  { id: 'l92', lane: 'recent', kind: 'done', title: '回复 Kim 的邮件', space: '研究', note: '今天 10:12 完成', plan: '—', status: '今天 10:12 完成' },
];
const inLane = (lane) => ITEMS.filter((item) => item.lane === lane);
const laneCount = (lane) => (lane === 'unplanned' ? UNPLANNED_TOTAL : inLane(lane).length);

function detailHtml(item) {
  const extra = item.id === 'c19'
    ? '<h3>子任务</h3><ul class="plain"><li>已完成：汇总本周实验结果</li><li>未完成：写下周计划</li></ul><h3>关联记录</h3><p>编码会：主题合并成 5 类，前天 15:10</p>'
    : '<p class="muted">还没有正文。</p>';
  const actions = item.kind === 'task' ? '<button type="button" class="btn">今天做</button><button type="button" class="btn">改期</button><button type="button" class="btn">完成</button>' : '';
  return `<div class="detail"><h2>${esc(item.title)}</h2><p class="muted">${esc(item.space)} · ${esc(item.note)}</p><div class="actions">${actions}<button type="button" class="btn" data-close>关闭</button></div>${extra}</div>`;
}

// ——— 共用的外壳 ———

const BASE_CSS = `
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:#fff;color:#111;font:14px/1.5 system-ui,-apple-system,"PingFang SC","Noto Sans CJK SC","Microsoft YaHei",sans-serif;overflow-wrap:anywhere}
button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer;text-align:left}
a{color:inherit;text-decoration:none}
:focus-visible{outline:2px solid #111;outline-offset:2px}
h1,h2,h3,p{margin:0}ul{margin:0;padding:0;list-style:none}
.muted{color:#595959}
.check{flex:none;display:grid;place-items:center;width:28px;height:28px}
.check i{display:block;width:16px;height:16px;border:1.5px solid #595959;border-radius:50%}
.mark{flex:none;display:grid;place-items:center;width:28px;height:28px;color:#595959}
.is-done .check i{background:#111;border-color:#111}
.is-done .title{text-decoration:line-through;color:#595959}
.btn{display:inline-flex;align-items:center;min-height:32px;padding:2px 12px;border:1px solid #8a8a8a;border-radius:6px;background:#fff;white-space:nowrap}
.btn.solid{background:#111;border-color:#111;color:#fff}
.actions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
.detail h2{font-size:18px;font-weight:600}
.detail h3{margin:16px 0 4px;font-size:13px;color:#595959;font-weight:500}
.field{display:flex;align-items:center;min-height:36px;padding:4px 12px;border:1px solid #8a8a8a;border-radius:8px;color:#595959;background:#fff}
`;

const BASE_JS = (mode, details) => `
const DETAILS=${JSON.stringify(details).replace(/</g, '\\u003c')};
const slot=document.getElementById('detail');
const initial=slot?slot.innerHTML:'';
function closeDetail(){
  document.querySelectorAll('.is-selected').forEach((n)=>n.classList.remove('is-selected'));
  document.querySelectorAll('.inline-detail').forEach((n)=>n.remove());
  document.body.classList.remove('has-detail');
  if(slot)slot.innerHTML=initial;
}
function openDetail(row){
  const was=row.classList.contains('is-selected');
  closeDetail();
  if(was&&'${mode}'==='inline')return;
  row.classList.add('is-selected');
  if('${mode}'==='inline'){
    const box=document.createElement('div');box.className='inline-detail';box.innerHTML=DETAILS[row.dataset.id];row.after(box);
  }else{
    slot.innerHTML=DETAILS[row.dataset.id];document.body.classList.add('has-detail');
  }
}
document.addEventListener('click',(event)=>{
  const check=event.target.closest('.check');
  if(check){const row=check.closest('[data-id]');const on=row.classList.toggle('is-done');check.setAttribute('aria-pressed',String(on));return;}
  if(event.target.closest('[data-close]')){closeDetail();return;}
  const open=event.target.closest('.open');
  if(open)openDetail(open.closest('[data-id]'));
});
`;

const page = (title, css, body, js) => `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>${BASE_CSS}${css}</style>
</head>
<body>
${body}
<script>${js}</script>
</body>
</html>
`;

const details = Object.fromEntries(ITEMS.map((item) => [item.id, detailHtml(item)]));
const checkButton = (item) => (item.kind === 'event' || item.kind === 'log'
  ? `<span class="mark" aria-hidden="true">${item.kind === 'event' ? '◇' : '✎'}</span>`
  : `<button type="button" class="check" aria-pressed="${item.kind === 'done'}" aria-label="完成 ${esc(item.title)}"><i></i></button>`);
const doneClass = (item) => (item.kind === 'done' ? ' is-done' : '');
const KIND_TAG = { task: '待办', done: '待办', event: '日程', log: '记录' };
const week = WEEK.map(([day, date, on]) => `<div class="day ${on}"><span>${day}</span><b>${date}</b></div>`).join('');

// ——— A 现状：按紧急程度分段的单列卡片（对照组） ———

const aRow = (item) => `<article class="row${doneClass(item)}" data-id="${item.id}">
  <span class="tag">${KIND_TAG[item.kind]}</span>${checkButton(item)}
  <button type="button" class="open"><span class="title">${esc(item.title)}</span><span class="meta">${esc(item.note)}<span>${esc(item.space)}</span></span></button>
  ${['next', 'unplanned'].includes(item.lane) ? '<button type="button" class="btn pill">今天做</button>' : ''}
</article>`;

const aLane = ([lane, name]) => `<section><h2>${name}<span class="muted">${laneCount(lane)}</span></h2>${inLane(lane).map(aRow).join('')}${lane === 'unplanned' ? `<p class="more muted">查看全部 ${UNPLANNED_TOTAL} 项</p>` : ''}</section>`;

const A_CSS = `
.app{display:grid;grid-template-columns:230px minmax(380px,580px) minmax(0,1fr);min-height:100vh}
.side{position:sticky;top:0;display:flex;flex-direction:column;gap:12px;height:100vh;padding:16px 12px;overflow:auto;background:#f4f4f4;border-right:1px solid #d9d9d9}
.brand{font-size:20px;font-weight:600}
.nav a,.spaces a{display:flex;align-items:center;min-height:32px;padding:2px 10px;border-radius:8px}
.nav a.on{background:#333;color:#fff}
.side h3{display:flex;justify-content:space-between;padding:0 10px;font-size:13px;font-weight:500;color:#595959}
.side .who{margin-top:auto;padding:8px 10px;border-top:1px solid #d9d9d9}
.list{min-width:0;padding:20px 20px 96px;border-right:1px solid #d9d9d9}
.topbar{display:none;align-items:center;gap:8px;margin-bottom:12px}
.topbar .field{flex:1}
h1{font-size:26px;font-weight:500;line-height:1.3}
.week{position:sticky;top:0;z-index:1;display:grid;grid-template-columns:repeat(7,1fr);padding:8px 0;margin-top:8px;background:#fff;text-align:center;font-size:12px;color:#595959}
.day b{display:block;width:30px;height:30px;margin:2px auto 0;border-radius:50%;font-size:15px;font-weight:500;line-height:30px;color:#111}
.day.on b{background:#111;color:#fff}
.capture{margin-top:8px}
section{margin-top:20px}
section h2{display:flex;justify-content:space-between;font-size:15px;font-weight:600}
section h2 .muted{font-weight:400}
.row{display:flex;align-items:center;gap:6px;min-height:54px;margin-top:8px;padding-right:10px;overflow:hidden;background:#fff;border:1px solid #cfcfcf;border-radius:10px}
.row.is-selected{border:2px solid #111}
.tag{align-self:stretch;display:flex;align-items:center;justify-content:center;width:26px;background:#ececec;font-size:12px;line-height:1.1;writing-mode:vertical-rl}
.open{display:flex;flex:1;align-items:center;gap:12px;min-width:0;min-height:52px}
.title{flex:1;min-width:0;overflow:hidden;font-weight:600;text-overflow:ellipsis;white-space:nowrap}
.meta{display:flex;flex:none;gap:10px;max-width:60%;color:#595959;font-size:13px}
.pill{min-height:30px;padding:2px 10px;border-radius:15px;font-size:13px}
.more{padding:8px 10px}
.panel{position:sticky;top:0;height:100vh;padding:24px;overflow:auto}
.agent{display:flex;flex-direction:column;height:100%}
.agent h2{font-size:15px;font-weight:600}
.agent .hero{margin:auto;text-align:center}
.agent .hero h3{font-size:16px;font-weight:600}
.close-only{display:none}
.ask{position:fixed;right:12px;bottom:12px;left:12px;z-index:2;display:none}
@media (max-width:1099px){
  .app{grid-template-columns:minmax(0,1fr)}
  .side{display:none}
  .list{width:100%;max-width:720px;margin:0 auto;border-right:0}
  .topbar,.ask{display:flex}
  .panel{display:none}
  .has-detail .panel{position:fixed;inset:auto 0 0;z-index:3;display:block;height:auto;max-height:80vh;padding:20px 16px;background:#fff;border-top:2px solid #111}
  .ask .field{flex:1;background:#fff}
}
@media (max-width:599px){
  h1{font-size:22px}
  .list{padding:12px 12px 88px}
  .open{flex-direction:column;align-items:flex-start;gap:2px;padding:6px 0}
  .title{flex:none;width:100%;white-space:normal}
  .meta{flex-wrap:wrap;max-width:100%}
}
`;

const aBody = `<div class="app">
<aside class="side" aria-label="导航">
  <div class="brand">Kotolog</div><div class="field">搜索或快速前往…</div>
  <nav class="nav">${NAV.map((name, index) => `<a href="#" class="${index === 0 ? 'on' : ''}">${name}</a>`).join('')}</nav>
  <div style="display:flex;justify-content:space-between;align-items:center;padding:0 10px"><span class="muted">草稿 0</span><button type="button" class="btn solid">新建 +</button></div>
  <h3>Space<span>+</span></h3><nav class="spaces"><a href="#">Personal</a>${SPACE_ORDER.map((name) => `<a href="#">${name}</a>`).join('')}</nav>
  <div class="who">コトちゃん<br><span class="muted">没在跑任务</span></div>
</aside>
<main class="list">
  <div class="topbar"><button type="button" class="btn" aria-label="打开导航">≡</button><div class="field">搜索</div><button type="button" class="btn" aria-label="新建">+</button></div>
  <h1>${DATE}</h1><p class="muted">${SUMMARY}</p>
  <div class="week">${week}</div>
  <div class="field capture">加个待办，比如「明天 交周报」</div>
  ${LANES.map(aLane).join('')}
</main>
<aside class="panel" id="detail" aria-label="详情"><div class="agent"><h2>Agent · コトちゃん</h2><div class="hero"><h3>想让 Agent 帮你做什么？</h3><p class="muted">点左边的一行，这里会变成它的详情。</p></div><div class="field">询问当前 Context，或请 Agent 准备变更…</div></div></aside>
<div class="ask"><div class="field">问コトちゃん…</div></div>
</div>`;

// ——— B 按项目分组：工作按项目切换，今天的日程和记录放在旁边 ———

const bRow = (item) => `<article class="row${doneClass(item)}" data-id="${item.id}">${checkButton(item)}<button type="button" class="open"><span class="title">${esc(item.title)}</span><span class="meta">${esc(item.note)}</span></button></article>`;

function bSpace(space) {
  const mine = ITEMS.filter((item) => item.space === space && item.kind === 'task');
  const focus = mine.filter((item) => ['attention', 'now'].includes(item.lane));
  const next = mine.filter((item) => item.lane === 'next');
  const unplanned = mine.filter((item) => item.lane === 'unplanned');
  const later = next.length + unplanned.length;
  const decide = focus.filter((item) => item.lane === 'attention').length;
  const heading = [`今天 ${focus.length - decide} 项`, decide ? `待处理 ${decide} 项` : ''].filter(Boolean).join(' · ');
  return `<section><div class="space-head"><h2>${space}</h2><span class="muted">${heading}</span><button type="button" class="btn add">+ 加到${space}</button></div>
    ${focus.map(bRow).join('')}
    ${later ? `<details><summary>${[next.length ? `接下来 ${next.length}` : '', unplanned.length ? `没安排 ${unplanned.length}` : ''].filter(Boolean).join(' · ')}</summary>${[...next, ...unplanned].map(bRow).join('')}</details>` : ''}
  </section>`;
}

const B_CSS = `
.app{display:grid;grid-template-columns:72px minmax(0,1fr);min-height:100vh}
.rail{position:sticky;top:0;display:flex;flex-direction:column;gap:4px;height:100vh;padding:12px 6px;background:#f4f4f4;border-right:1px solid #d9d9d9}
.rail a{display:flex;align-items:center;justify-content:center;min-height:44px;padding:2px;border-radius:8px;font-size:12px;text-align:center}
.rail a.on{background:#333;color:#fff}
.rail .brand{font-weight:600;font-size:13px;text-align:center;padding:6px 0}
.content{display:grid;grid-template-columns:minmax(0,1fr) 300px;grid-template-rows:auto 1fr;gap:0 32px;align-content:start;max-width:1180px;width:100%;padding:20px 28px 40px;margin:0 auto;grid-template-areas:"head aside" "main aside"}
.head{grid-area:head;display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
h1{font-size:26px;font-weight:500;line-height:1.3}
.head .actions{margin:0;flex:none}
.main{grid-area:main;min-width:0}
.aside{grid-area:aside;display:flex;flex-direction:column;gap:20px;align-self:start;position:sticky;top:20px}
.decide{margin-top:12px;padding:8px 12px;background:#f0f0f0;border-radius:8px}
.decide a{text-decoration:underline;text-underline-offset:2px}
section{margin-top:24px}
.space-head{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;padding-bottom:6px;border-bottom:2px solid #111}
.space-head h2{font-size:17px;font-weight:600}
.space-head .add{margin-left:auto;min-height:28px;padding:0 8px;font-size:13px}
.row{display:flex;align-items:center;gap:6px;min-height:42px;border-bottom:1px solid #e0e0e0}
.row.is-selected{background:#f0f0f0}
.open{display:flex;flex:1;align-items:center;gap:12px;min-width:0;min-height:40px;padding:4px 4px 4px 0}
.title{flex:1;min-width:0}
.meta{flex:none;max-width:45%;color:#595959;font-size:13px;text-align:right}
.inline-detail{padding:4px 12px 16px 34px;background:#f0f0f0;border-bottom:1px solid #e0e0e0}
details summary{display:list-item;min-height:32px;padding:6px 0;color:#595959;cursor:pointer}
.week{display:grid;grid-template-columns:repeat(7,1fr);text-align:center;font-size:12px;color:#595959}
.day b{display:block;width:26px;height:26px;margin:2px auto 0;border-radius:50%;font-size:14px;font-weight:500;line-height:26px;color:#111}
.day.on b{background:#111;color:#fff}
.block h2{margin-bottom:6px;font-size:14px;font-weight:600}
.block li{display:flex;gap:10px;padding:4px 0;border-top:1px solid #e0e0e0}
.block li span:first-child{flex:none;width:92px;color:#595959;font-size:13px}
.tabs{display:none}
@media (max-width:1099px){
  .app{grid-template-columns:minmax(0,1fr)}
  .rail{display:none}
  .content{display:flex;flex-direction:column;max-width:720px;padding:12px 16px 88px}
  .aside{display:contents}
  .head{order:1}.today{order:2;margin-top:12px}.main{order:3}.end{order:4;margin-top:24px}
  .tabs{position:fixed;right:0;bottom:0;left:0;z-index:2;display:grid;grid-template-columns:repeat(5,1fr);background:#fff;border-top:1px solid #8a8a8a}
  .tabs a{display:flex;align-items:center;justify-content:center;min-height:52px;font-size:12px;text-align:center}
  .tabs a.on{font-weight:700;text-decoration:underline;text-underline-offset:3px}
}
@media (max-width:599px){
  h1{font-size:22px}
  .open{flex-direction:column;align-items:flex-start;gap:0;padding:6px 0}
  .title{flex:none;width:100%}
  .meta{max-width:100%;text-align:left}
}
`;

const bEvents = inLane('now').filter((item) => item.kind === 'event');
const bBody = `<div class="app">
<nav class="rail" aria-label="导航"><div class="brand">Koto</div>${NAV.map((name, index) => `<a href="#" class="${index === 0 ? 'on' : ''}">${name}</a>`).join('')}</nav>
<div class="content">
  <header class="head"><div><h1>${DATE}</h1><p class="muted">${SUMMARY}</p></div><div class="actions"><button type="button" class="btn">搜索</button><button type="button" class="btn solid">+ 新建</button></div></header>
  <main class="main">
    <p class="decide"><strong>3 项需要决定：</strong>${inLane('attention').map((item) => esc(item.title)).join('、')}。它们留在各自的项目里。</p>
    ${SPACE_ORDER.map(bSpace).join('')}
  </main>
  <aside class="aside" aria-label="今天">
    <div class="today block"><div class="week">${week}</div><h2 style="margin-top:12px">今天的安排</h2><ul>${bEvents.map((item) => `<li><span>${esc(item.note)}</span><span>${esc(item.title)}</span></li>`).join('')}</ul></div>
    <div class="end block"><h2>最近活动</h2><ul>${inLane('recent').map((item) => `<li><span>${esc(item.note)}</span><span>${esc(item.title)}</span></li>`).join('')}</ul><div class="field" style="margin-top:16px">问コトちゃん…</div></div>
  </aside>
</div>
<nav class="tabs" aria-label="导航">${NAV.map((name, index) => `<a href="#" class="${index === 0 ? 'on' : ''}">${name}</a>`).join('')}</nav>
</div>`;

// ——— C 一张表：高密度、键盘优先，一屏看完 ———

const cRow = (item) => `<article class="row${doneClass(item)}" data-id="${item.id}" tabindex="-1">${checkButton(item)}<button type="button" class="open"><span class="title">${esc(item.title)}</span><span class="col space">${esc(item.space)}</span><span class="col plan">${esc(item.plan)}</span><span class="col status">${esc(item.status)}</span></button></article>`;

const C_CSS = `
.bar{display:flex;align-items:center;gap:16px;min-height:44px;padding:4px 16px;border-bottom:1px solid #8a8a8a}
.bar strong{font-size:15px}
.tabs{display:flex;gap:2px}
.tabs a{display:flex;align-items:center;min-height:32px;padding:2px 8px;border-radius:6px}
.tabs a.on{background:#333;color:#fff}
.bar .field{flex:1;min-height:30px;max-width:420px;margin-left:auto;border-radius:6px}
.bar .btn{min-height:30px}
.sub{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 16px;padding:8px 16px;border-bottom:1px solid #d9d9d9}
h1{font-size:16px;font-weight:600}
.week{display:flex;gap:2px;font-size:13px;color:#595959}
.day{display:flex;gap:2px;padding:0 6px;border-radius:4px}
.day b{font-weight:400;color:#111}
.day.on{background:#111;color:#fff}.day.on b{color:#fff}
.workspace{display:grid;grid-template-columns:minmax(0,1fr) 340px;align-items:start;padding-bottom:44px}
.table{min-width:0;border-right:1px solid #d9d9d9;font-size:13px}
.thead,.open{display:grid;grid-template-columns:minmax(0,1fr) 72px 96px 176px;gap:8px;align-items:center}
.thead{position:sticky;top:0;z-index:1;padding:4px 16px 4px 44px;background:#fff;border-bottom:1px solid #8a8a8a;color:#595959;font-size:12px}
section h2{display:flex;gap:8px;padding:6px 16px 4px;background:#f0f0f0;font-size:12px;font-weight:600}
section h2 span{font-weight:400;color:#595959}
.row{display:flex;align-items:center;gap:0;min-height:32px;padding:0 16px 0 12px;border-bottom:1px solid #ececec}
.row:focus{outline:none}
.row.is-cursor{box-shadow:inset 3px 0 0 #111;background:#f7f7f7}
.row.is-selected{background:#e6e6e6;box-shadow:inset 3px 0 0 #111}
.row .check,.row .mark{width:28px;height:28px}
.open{flex:1;min-width:0;min-height:30px}
.title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.col{min-width:0;overflow:hidden;color:#595959;text-overflow:ellipsis;white-space:nowrap}
.more{padding:4px 16px 4px 40px;color:#595959}
.preview{position:sticky;top:0;max-height:calc(100vh - 44px);padding:16px;overflow:auto}
.keys{position:fixed;right:0;bottom:0;left:0;z-index:2;display:flex;align-items:center;gap:16px;min-height:44px;padding:4px 16px;background:#fff;border-top:1px solid #8a8a8a;font-size:12px;color:#595959}
.keys .field{flex:1;max-width:360px;min-height:30px;margin-left:auto;border-radius:6px;font-size:13px}
.keys kbd{padding:0 4px;border:1px solid #8a8a8a;border-radius:3px;font:inherit;color:#111}
.narrow-actions{display:none}
@media (max-width:1199px){
  .workspace{grid-template-columns:minmax(0,1fr)}
  .table{border-right:0}
  .preview{display:none}
  .has-detail .preview{position:fixed;inset:auto 0 44px;z-index:3;display:block;max-height:70vh;background:#fff;border-top:2px solid #111}
}
@media (max-width:839px){
  .bar .field{display:none}
  .tabs{margin-left:auto}
  .thead,.open{grid-template-columns:minmax(0,1fr) 72px 148px}
  .col.plan,.thead .plan{display:none}
  .keys span{display:none}
}
@media (max-width:599px){
  .bar{gap:8px;padding:4px 12px}
  .tabs{display:none}
  .narrow-actions{display:flex;gap:8px;margin-left:auto}
  .sub{padding:8px 12px}
  .thead{display:none}
  .row{padding:4px 12px 4px 8px}
  .open{grid-template-columns:minmax(0,1fr) auto;gap:0 8px;padding:2px 0}
  .title{grid-column:1 / -1;white-space:normal}
  .col.status:empty{display:none}
  section h2{padding:6px 12px 4px}
  .more{padding-left:36px}
}
`;

const cLane = ([lane, name]) => `<section><h2>${name}<span>${laneCount(lane)}</span></h2>${inLane(lane).map(cRow).join('')}${lane === 'unplanned' ? `<p class="more">查看全部 ${UNPLANNED_TOTAL} 项</p>` : ''}</section>`;

const cBody = `<header class="bar"><strong>Kotolog</strong><nav class="tabs" aria-label="导航">${NAV.map((name, index) => `<a href="#" class="${index === 0 ? 'on' : ''}">${name}</a>`).join('')}</nav><div class="field">/ 搜索或快速前往…</div><div class="narrow-actions"><button type="button" class="btn" aria-label="打开导航">≡</button><button type="button" class="btn">搜索</button></div><button type="button" class="btn solid">+ 新建</button></header>
<div class="sub"><h1>${DATE}</h1><div class="week">${WEEK.map(([day, date, on]) => `<div class="day ${on}"><span>${day.slice(1)}</span><b>${date}</b></div>`).join('')}</div><p class="muted">${SUMMARY}</p></div>
<div class="workspace">
  <main class="table">
    <div class="thead"><span>标题</span><span class="space">项目</span><span class="plan">计划</span><span>状态</span></div>
    ${LANES.map(cLane).join('')}
  </main>
  <aside class="preview" id="detail" aria-label="详情"><p class="muted">选一行看详情。也可以用方向键移动，按 x 完成，回车打开。</p></aside>
</div>
<footer class="keys"><span><kbd>↑</kbd> <kbd>↓</kbd> 移动</span><span><kbd>x</kbd> 完成</span><span><kbd>回车</kbd> 打开</span><span><kbd>/</kbd> 搜索</span><div class="field">问コトちゃん…</div></footer>`;

const C_JS = `
const rows=[...document.querySelectorAll('.row')];
let cursor=-1;
function moveCursor(next){
  rows[cursor]?.classList.remove('is-cursor');
  cursor=Math.max(0,Math.min(rows.length-1,next));
  rows[cursor].classList.add('is-cursor');
  rows[cursor].scrollIntoView({block:'nearest'});
}
document.addEventListener('keydown',(event)=>{
  if(event.key==='ArrowDown'||event.key==='j'){event.preventDefault();moveCursor(cursor+1);}
  else if(event.key==='ArrowUp'||event.key==='k'){event.preventDefault();moveCursor(cursor-1);}
  else if(event.key==='x'&&cursor>=0){rows[cursor].querySelector('.check')?.click();}
  else if(event.key==='Enter'&&cursor>=0&&!event.target.closest('button')){openDetail(rows[cursor]);}
  else if(event.key==='Escape'){closeDetail();}
});
`;

// ——— D 终端草图：按显示列宽排版，中文占 2 列 ———

const WIDE = /[ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿ꀀ-꓏가-힣豈-﫿︰-﹯＀-｠￠-￦]/u;
const segmenter = new Intl.Segmenter('zh', { granularity: 'grapheme' });
const chars = (text) => [...segmenter.segment(text)].map(({ segment }) => segment);
const widthOf = (text) => chars(text).reduce((sum, char) => sum + (WIDE.test(char) ? 2 : 1), 0);
function fit(text, columns) {
  if (widthOf(text) <= columns) return text + ' '.repeat(columns - widthOf(text));
  let out = '';
  for (const char of chars(text)) {
    if (widthOf(out + char) > columns - 1) break;
    out += char;
  }
  return `${out}…${' '.repeat(columns - widthOf(out) - 1)}`;
}
const TERMINAL_MARK = { task: '[ ]', done: '[x]', event: ' * ', log: ' # ' };
const terminalStatus = (item) => {
  if (item.kind === 'event') return item.note;
  if (item.status) return item.status;
  return item.lane === 'next' ? item.plan : '';
};
const terminalRow = (item) => `  ${TERMINAL_MARK[item.kind]} ${item.id}  ${fit(item.title, 34)}  ${fit(item.space, 8)} ${terminalStatus(item)}`.trimEnd();
const terminal = [
  DATE,
  `${SUMMARY}。`,
  ...LANES.flatMap(([lane, name]) => ['', `${name} ${laneCount(lane)}`, ...inLane(lane).map(terminalRow), ...(lane === 'unplanned' ? [`  还有 ${UNPLANNED_TOTAL - inLane(lane).length} 项在各自的空间里`] : [])]),
  '',
  '完成：kotolog task complete <id>   详情：kotolog task view <id> --context',
].join('\n');
// constraint.terminal.columns-default：默认窗口下不能折行。
const TERMINAL_COLUMNS = 80;
const tooWide = terminal.split('\n').filter((line) => widthOf(line) > TERMINAL_COLUMNS);
if (tooWide.length) throw new Error(`终端草图超过 ${TERMINAL_COLUMNS} 列：\n${tooWide.join('\n')}`);

// ——— 写文件 ———

const files = {
  'a-current.html': page('A 现状：按紧急程度分段', A_CSS, aBody, BASE_JS('panel', details)),
  'b-by-space.html': page('B 按项目分组，日程放旁边', B_CSS, bBody, BASE_JS('inline', details)),
  'c-table.html': page('C 一张表，一屏看完', C_CSS, cBody, BASE_JS('panel', details) + C_JS),
  'd-terminal.txt': `${terminal}\n`,
};
for (const [name, content] of Object.entries(files)) writeFileSync(join(HERE, name), content);
console.log(`已生成 ${Object.keys(files).join('、')}`);
