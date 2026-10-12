// 原型页机器自查：无头 Chrome + CDP。分三段：装错误收集 → 跑交互 → 读断言。
import { spawn } from 'node:child_process';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const FILE = 'D:/ilife/docs/skills/skill-bill/t1278-原型-26条-讨论台-v1.html';
const port = 9336;
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, '--allow-file-access-from-files', '--window-size=1280,900', '--no-first-run', '--no-default-browser-check', '--user-data-dir=' + process.env.TEMP + '/cdp-t1278b', 'file:///' + FILE], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let id = 0;
function rpc(ws, method, params = {}) {
  return new Promise((res, rej) => {
    const mid = ++id;
    const on = (ev) => { const m = JSON.parse(ev.data); if (m.id === mid) { ws.removeEventListener('message', on); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); } };
    ws.addEventListener('message', on);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
}
async function ev(ws, expr) {
  const r = await rpc(ws, 'Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval failed: ' + expr.slice(0, 80));
  return r.result.value;
}
let list = [];
for (let i = 0; i < 40; i++) { await sleep(500); try { list = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()); if (list.some((t) => t.type === 'page')) break; } catch {} }
const page = list.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
await rpc(ws, 'Runtime.enable');
await sleep(1500);
await ev(ws, `window.__errs=[];window.addEventListener('error',function(e){window.__errs.push(String(e.message))});1`);

const out = await ev(ws, `(() => {
  const out=[]; const q=(s)=>document.querySelector(s); const qa=(s)=>Array.from(document.querySelectorAll(s));
  out.push('styles=' + qa('style').length + ' items=' + qa('.item').length + ' toc=' + qa('.toc a').length + ' demos=' + qa('.demo').length);
  const st={}; qa('.item .pill').forEach(p=>{const t=p.textContent.trim(); st[t]=(st[t]||0)+1;}); out.push('status=' + JSON.stringify(st));
  out.push('missing_quote=' + qa('.item').filter(c=>!c.querySelector('.quote')||!c.querySelector('.quote').textContent.trim()).length);
  out.push('missing_read=' + qa('.item').filter(c=>!c.querySelector('.say')||!c.querySelector('.fix')).length);
  out.push('missing_img=' + qa('.item').filter(c=>!c.querySelector('.imgs img')).length);
  out.push('missing_ticket=' + qa('.item').filter(c=>!c.querySelector('.who').textContent.trim()).length);
  out.push('jump_targets=' + JSON.stringify(qa('.item a.jump').map(a=>a.getAttribute('href')).filter(h=>!document.querySelector(h)).length));
  return out;
})()`);

const act = await ev(ws, `(() => {
  const out=[]; const q=(s)=>document.querySelector(s); const qa=(s)=>Array.from(document.querySelectorAll(s));
  // ── 日期
  q('[data-act="dt-toggle"]').click();
  out.push('cal_open=' + !q('#d-date .dt-cal').hidden + ' days=' + qa('#d-date .dt-d').length);
  q('#d-date [data-act="dt-set"][data-days="-1"]').click();
  out.push('yesterday=' + q('#d-date .dt-val').textContent);
  // ── 时间四段
  q('#d-period [data-act="seg"][data-seg="month"]').click();
  out.push('seg_on=' + q('#d-period [data-act="seg"].on').getAttribute('data-seg') + ' month_shown=' + !q('#d-period [data-body="month"]').hidden + ' day_hidden=' + q('#d-period [data-body="day"]').hidden);
  // ── 单选胶囊
  const en=qa('#d-enum .chip'); en[1].click();
  out.push('one_click=' + qa('#d-enum .chip.on').length + ' val=' + q('#d-enum .chip.on').textContent);
  en[3].click();
  out.push('one_switch=' + qa('#d-enum .chip.on').length + ' val=' + q('#d-enum .chip.on').textContent + ' first_off=' + !en[1].classList.contains('on'));
  const sn=qa('#d-snap .chip'); sn[2].click();
  out.push('snap_one=' + qa('#d-snap .chip.on').length + ' val=' + q('#d-snap .chip.on').textContent);
  // ── 存量枚举：开关 / 新建 / 手填
  const box=q('[data-act="allow"]'), add=q('#d-snap .mini.add');
  out.push('add_visible_checked=' + (add.style.display!=='none'));
  box.checked=true; box.click();
  out.push('off_hidden=' + (add.style.display==='none') + ' cb=' + box.checked);
  box.click();
  out.push('add_back=' + (add.style.display!=='none') + ' cb=' + box.checked);
  out.push('snapnote=' + q('#d-snap .snapnote').textContent.slice(0,18) + '…');
  add.click();
  out.push('create_toast=' + q('#toast').textContent.replace(/\\s+/g,' ').slice(0,44) + ' | out=' + q('#d-snap [data-out]').textContent.slice(0,26));
  const mi=q('#d-snap .manual .fp-input'); mi.value='宠物'; mi.dispatchEvent(new Event('input',{bubbles:true}));
  out.push('manual_out=' + q('#d-snap [data-out]').textContent.slice(0,30));
  // ── 记录引用
  q('[data-act="ref-toggle"]').click();
  out.push('reflist_open=' + !q('#d-ref .reflist').hidden);
  qa('#d-ref .refrow')[1].click();
  out.push('ref_picked=' + q('#d-ref .ref-val').textContent + ' closed=' + q('#d-ref .reflist').hidden);
  // ── 必填缺失
  q('#d-required [data-act="copy"]').click();
  out.push('miss_marked=' + qa('#d-required .hm-missing').length + ' badge=' + q('#d-required [data-badge]').textContent + ' toast=' + q('#toast').textContent.replace(/\\s+/g,' ').slice(0,40));
  qa('#d-required [data-req]').forEach(i=>{i.value='x';});
  q('#d-required [data-act="copy"]').click();
  out.push('all_filled_badge_hidden=' + q('#d-required [data-badge]').hidden + ' toast=' + q('#toast').textContent.replace(/\\s+/g,' ').slice(0,22));
  // ── 长提示 popover
  q('#d-hint [data-act="pop"]').click();
  out.push('pop_open=' + q('#pop').classList.contains('on') + ' len=' + q('#pop').textContent.length);
  // ── 配置场景
  q('#d-config [data-act="cfg-edit"]').click();
  out.push('cfg_edit_open=' + !q('#d-config [data-cfg="edit"]').hidden + ' prefilled=' + (qa('#d-config .cfg-input')[0].value||'').slice(0,22));
  qa('#d-config .cfg-input')[0].value='E:/db/biscuit.db';
  q('#d-config [data-act="cfg-save"]').click();
  out.push('cfg_saved=' + q('#d-config .cfgr b').textContent + ' back_to_view=' + !q('#d-config [data-cfg="view"]').hidden + ' toast=' + q('#toast').textContent.replace(/\\s+/g,' ').slice(0,30));
  // ── 跳转锚点
  q('.toc a[href="#item-18"]').click();
  out.push('hash=' + location.hash + ' in_view=' + (q('#item-18').getBoundingClientRect().top > -50 && q('#item-18').getBoundingClientRect().top < innerHeight));
  // ── 图片与溢出
  const imgs=qa('img');
  out.push('images=' + imgs.length + ' loaded=' + imgs.filter(i=>i.complete&&i.naturalWidth>0).length);
  out.push('overflow=' + (document.documentElement.scrollWidth - innerWidth));
  return out;
})()`);

const errs = await ev(ws, 'window.__errs');
const imgRes = await ev(ws, `(async () => {
  const imgs = [...document.querySelectorAll('img')];
  for (const im of imgs) { im.scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 180)); }
  await new Promise(r => setTimeout(r, 3000));
  const bad = imgs.filter(i => !(i.complete && i.naturalWidth > 0));
  return 'images=' + imgs.length + ' loaded=' + (imgs.length - bad.length) + ' failed=' + JSON.stringify(bad.map(i => decodeURIComponent(i.src.split('/').pop())));
})()`);
console.log(out.join('\n'));
console.log(act.join('\n'));
console.log(imgRes);
console.log('JS_ERRORS=' + JSON.stringify(await ev(ws, 'window.__errs')));
ws.close(); chrome.kill(); process.exit(0);
