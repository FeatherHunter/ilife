/** T558 · 锁周结构禁委派层守卫探针（本票自写，不碰门探针）。
 *
 * 做法：用真出口 buildPlanEditorDoc 重出两份样张（锁周 openWeek=2／母版周 openWeek=0），
 * 在 headless Chrome 里绕过控件合成派发，断言结构面：
 * 锁周 add-train／pick-slot／set-slot 三路都不改变结构；母版周同一套派发照常生效。
 * add-train 守卫与 pick-slot 守卫是 e656ee64 既有（本票不冒领）；本票只补 set-slot。
 * 退出码：全断言过 exit 0，否则 exit 1。用法一律经加锁包装器：
 * node tooling/run-locked.mjs --ticket 558 --run-id <标识> -- node docs/skills/skill-calorie/t558-lock-probe.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { states } from './t554-plan-editor-fixtures.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..', '..');
const OUT = join(ROOT, '.scratch/t558/probe');
const DIST = join(ROOT, 'packages/skill-calorie/dist');
const CHROME = process.env.PE_CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

mkdirSync(OUT, { recursive: true });

const INPAGE = `
(function(){
  var R = { ok: false, errors: [], facts: {} };
  function q(s){ return document.querySelector(s); }
  function qa(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function sessCount(){ return qa('.pe-sess').length; }
  function slotpickCount(){ return qa('.pe-slotpick').length; }
  function firstSlot(){
    var on = q('.pe-sess .pe-slot.is-on');
    return on ? on.textContent.replace(/\\s+/g,' ').trim() : null;
  }
  function click(el){
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  }
  try {
    var root = q('#pe-root');
    var isLocked = !!q('.pe-sess.is-locked') || /只改参数/.test(document.body.textContent);
    R.facts.isLocked = isLocked;
    R.facts.weekbar = (q('.pe-week-t') || {}).textContent || null;
    // A1: add-train（disabled 钮合成派发）
    var at = q('[data-act="add-train"]');
    R.facts.addTrainDisabled = at ? !!at.disabled : null;
    var s0 = sessCount(), p0 = slotpickCount();
    if (at) { try { click(at); } catch(e){ R.errors.push('add-train click: '+e); } }
    R.facts.addTrain = { before: s0, after: sessCount(), pickBefore: p0, pickAfter: slotpickCount() };
    // A2: pick-slot（锁周无 picker 钮，造一颗假钮直派委派层——真绕过）
    var s1 = sessCount();
    var fake = document.createElement('button');
    fake.setAttribute('data-act', 'pick-slot');
    fake.setAttribute('data-d', '0');
    fake.setAttribute('data-slot', '上午');
    root.appendChild(fake);
    try { click(fake); } catch(e){ R.errors.push('pick-slot click: '+e); }
    if (fake.parentNode) fake.parentNode.removeChild(fake);
    R.facts.pickSlot = { before: s1, after: sessCount() };
    // A3: set-slot（点一颗非当前时段胶囊）
    var chips = qa('.pe-sess:first-child .pe-slot, .pe-sess .pe-slot');
    var cur = firstSlot();
    var other = null;
    for (var i = 0; i < chips.length; i++){
      var t = chips[i].textContent.replace(/\\s+/g,' ').trim();
      if (t !== cur) { other = chips[i]; break; }
    }
    R.facts.setSlotChipDisabled = other ? !!other.disabled : null;
    R.facts.setSlotBefore = cur;
    if (other) { try { click(other); } catch(e){ R.errors.push('set-slot click: '+e); } }
    R.facts.setSlotAfter = firstSlot();
    R.facts.setSlotChanged = (R.facts.setSlotBefore !== R.facts.setSlotAfter);
    R.facts.sessAfterAll = sessCount();
    R.ok = true;
  } catch(e){ R.errors.push(String((e && e.stack) || e)); }
  document.body.innerHTML = '<pre id="t558-json">' + JSON.stringify(R).replace(/</g, '\\u003c') + '</pre>';
})();
`;

const docs = await import(pathToFileURL(join(DIST, 'render', 'planEditorDocs.js')).href);
const ST = states();
const cases = {
  'locked': ST['03-锁住的周'],
  'master': ST['02-母版周'],
};
const readings = {};
for (const [name, state] of Object.entries(cases)) {
  const doc = docs.buildPlanEditorDoc(state, { key: 'calorie.view.plan-wizard', command: 'calorie-cmd-read calorie.view.plan-wizard' });
  const page = join(OUT, name + '.html');
  writeFileSync(page, doc + '<script>\n' + INPAGE + '\n</script>', 'utf8');
  const args = ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--allow-file-access-from-files', '--user-data-dir=' + join(OUT, 'chrome-profile'),
    '--window-size=1280,900', '--virtual-time-budget=6000', '--dump-dom', pathToFileURL(page).href];
  let out = '';
  try {
    out = execFileSync(CHROME, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    out = String((e && e.stdout) || '');
  }
  const m = /<pre id="t558-json">([\s\S]*?)<\/pre>/.exec(out);
  readings[name] = m ? JSON.parse(m[1].replace(/\\u003c/g, '<')) : { ok: false, errors: ['no t558-json'] };
}
writeFileSync(join(OUT, 'readings.json'), JSON.stringify(readings, null, 2), 'utf8');

const L = readings.locked?.facts || {};
const M = readings.master?.facts || {};
const ck = [];
const push = (id, title, ok, reading) => ck.push({ id, title, ok: ok === true, reading });
push('L1', '锁周 add-train 绕过派发结构不变（段数不变＋选时段层不出）',
  L.addTrain && L.addTrain.before === L.addTrain.after && L.addTrain.pickBefore === L.addTrain.pickAfter && L.addTrain.pickAfter === 0,
  '段数 ' + L.addTrain?.before + '→' + L.addTrain?.after + '；选时段层 ' + L.addTrain?.pickBefore + '→' + L.addTrain?.pickAfter);
push('L2', '锁周 pick-slot 假钮直派结构不变（段数不变）',
  L.pickSlot && L.pickSlot.before === L.pickSlot.after,
  '段数 ' + L.pickSlot?.before + '→' + L.pickSlot?.after);
push('L3', '锁周 set-slot 绕过派发时段不变（本票守卫）',
  L.setSlotChanged === false,
  '时段 ' + L.setSlotBefore + '→' + L.setSlotAfter + '（胶囊 disabled=' + L.setSlotChipDisabled + '）');
push('M1', '母版周 add-train 同派发照常生效（选时段层出现）',
  M.addTrain && M.addTrain.pickAfter === 1,
  '选时段层 ' + M.addTrain?.pickBefore + '→' + M.addTrain?.pickAfter);
push('M2', '母版周 pick-slot 假钮直派照常生效（段数＋1）',
  M.pickSlot && M.pickSlot.after === M.pickSlot.before + 1,
  '段数 ' + M.pickSlot?.before + '→' + M.pickSlot?.after);
push('M3', '母版周 set-slot 同派发照常生效（时段改变）',
  M.setSlotChanged === true,
  '时段 ' + M.setSlotBefore + '→' + M.setSlotAfter);

let pass = 0;
for (const c of ck) {
  process.stdout.write((c.ok ? 'PASS ' : 'RED  ') + ' ' + c.id + ' ' + c.title + '\n        读数：' + c.reading + '\n');
  if (c.ok) pass++;
}
process.stdout.write('RESULT: ' + pass + '/' + ck.length + '\n');
process.exit(pass === ck.length ? 0 : 1);
