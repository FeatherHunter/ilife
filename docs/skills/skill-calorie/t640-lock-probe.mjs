/** T640 · 锁周守卫补齐探针（复用 T558 底盘 L1-L3/M1-M3，一字不动；新增 L4/L5/L6/M4/M5/M6）。
 *
 * 落库点结论（见证据件 §二）：
 * - del-train（约359行 splice）＝落库点，加守卫。
 * - del-move（约384行 splice）＝落库点，加守卫。
 * - pick（约373-382行 push）＝落库点（picker确认真正落库处），加守卫。
 * - add-move（约365行，只置 picker/query/filt＋render，无 splice/push）＝只开选择层不落库，不加守卫。
 * - set-tstart/set-tend/set-sets/set-reps/set-load/set-min/toggle-mode＝参数面，负责人已裁不跟锁走，禁碰。
 *
 * 做法：真出口 buildPlanEditorDoc 重出两份样张（锁周 openWeek=2／母版周 openWeek=0），
 * headless Chrome 里绕过控件合成派发：
 * 锁周 L1-L6 全部结构不变；母版周 M1-M3 照常（T558原样）＋M4/M5/M6 照常（本票新增）。
 * 退出码：全断言过 exit 0，否则 exit 1。用法一律经加锁包装器：
 * node tooling/run-locked.mjs --ticket 640 --run-id <标识> -- node docs/skills/skill-calorie/t640-lock-probe.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { states } from './t554-plan-editor-fixtures.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..', '..');
const OUT = join(ROOT, '.scratch/t640/probe');
const DIST = join(ROOT, 'packages/skill-calorie/dist');
const CHROME = process.env.PE_CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

mkdirSync(OUT, { recursive: true });

const INPAGE = `
(function(){
  var R = { ok: false, errors: [], facts: {} };
  function q(s){ return document.querySelector(s); }
  function qa(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function sessCount(){ return qa('.pe-sess').length; }
  function moveCount(){ return qa('.pe-move').length; }
  function slotpickCount(){ return qa('.pe-slotpick').length; }
  function sheetCount(){ return qa('.pe-sheet').length; }
  function firstSlot(){
    var on = q('.pe-sess .pe-slot.is-on');
    return on ? on.textContent.replace(/\\s+/g,' ').trim() : null;
  }
  function click(el){
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  }
  function fakeClick(act, attrs){
    var root = q('#pe-root');
    var b = document.createElement('button');
    b.setAttribute('data-act', act);
    for (var k in attrs) b.setAttribute(k, attrs[k]);
    root.appendChild(b);
    try { click(b); } catch(e){ R.errors.push(act + ' click: ' + e); }
    if (b.parentNode) b.parentNode.removeChild(b);
  }
  try {
    var root = q('#pe-root');
    var isLocked = !!q('.pe-sess.is-locked') || /只改参数/.test(document.body.textContent);
    R.facts.isLocked = isLocked;
    R.facts.weekbar = (q('.pe-week-t') || {}).textContent || null;
    // A1: add-train（disabled 钮合成派发，T558原样）
    var at = q('[data-act="add-train"]');
    R.facts.addTrainDisabled = at ? !!at.disabled : null;
    var s0 = sessCount(), p0 = slotpickCount();
    if (at) { try { click(at); } catch(e){ R.errors.push('add-train click: '+e); } }
    R.facts.addTrain = { before: s0, after: sessCount(), pickBefore: p0, pickAfter: slotpickCount() };
    // A2: pick-slot（锁周无 picker 钮，造假钮直派，T558原样）
    var s1 = sessCount();
    fakeClick('pick-slot', { 'data-d': '0', 'data-slot': '上午' });
    R.facts.pickSlot = { before: s1, after: sessCount() };
    // A3: set-slot（点一颗非当前时段胶囊，T558原样）
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
    // A4: del-train（本票；锁周真钮不渲染，用假钮直派委派层——真绕过）
    var d0 = sessCount();
    fakeClick('del-train', { 'data-d': '0', 'data-s': '0' });
    R.facts.delTrain = { before: d0, after: sessCount() };
    // A5: del-move（本票；锁周真钮换成锁图标，用假钮直派）
    var m0 = moveCount();
    fakeClick('del-move', { 'data-d': '0', 'data-s': '0', 'data-m': '0' });
    R.facts.delMove = { before: m0, after: moveCount() };
    // A6: pick 确认路径（本票；先 add-move 开层，再 pick 落子，两步都合成派发；
    // 为证 add-move 只开层不动库，单记开层前后段数/动作数）
    var k0 = moveCount(), sk0 = sessCount(), sh0 = sheetCount();
    fakeClick('add-move', { 'data-d': '0', 'data-s': '0' });
    R.facts.addMove = { sessBefore: sk0, sessAfter: sessCount(), moveBefore: k0, moveAfter: moveCount() };
    R.facts.pickSheet = { before: sh0, after: sheetCount() };
    var row = q('.pe-lib-row');
    var nm = row ? row.getAttribute('data-name') : '悍马机卧推';
    if (row) { try { click(row); } catch(e){ R.errors.push('pick click: '+e); } }
    else { fakeClick('pick', { 'data-name': nm }); }
    R.facts.pick = { before: k0, after: moveCount(), name: nm };
    R.facts.sessAfterAll = sessCount();
    R.ok = true;
  } catch(e){ R.errors.push(String((e && e.stack) || e)); }
  document.body.innerHTML = '<pre id="t640-json">' + JSON.stringify(R).replace(/</g, '\\u003c') + '</pre>';
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
  const m = /<pre id="t640-json">([\s\S]*?)<\/pre>/.exec(out);
  readings[name] = m ? JSON.parse(m[1].replace(/\\u003c/g, '<')) : { ok: false, errors: ['no t640-json'] };
}
writeFileSync(join(OUT, 'readings.json'), JSON.stringify(readings, null, 2), 'utf8');

const L = readings.locked?.facts || {};
const M = readings.master?.facts || {};
const ck = [];
const push = (id, title, ok, reading) => ck.push({ id, title, ok: ok === true, reading });
// T558底盘（判据一字不动）
push('L1', '锁周 add-train 绕过派发结构不变（段数不变＋选时段层不出）',
  L.addTrain && L.addTrain.before === L.addTrain.after && L.addTrain.pickBefore === L.addTrain.pickAfter && L.addTrain.pickAfter === 0,
  '段数 ' + L.addTrain?.before + '→' + L.addTrain?.after + '；选时段层 ' + L.addTrain?.pickBefore + '→' + L.addTrain?.pickAfter);
push('L2', '锁周 pick-slot 假钮直派结构不变（段数不变）',
  L.pickSlot && L.pickSlot.before === L.pickSlot.after,
  '段数 ' + L.pickSlot?.before + '→' + L.pickSlot?.after);
push('L3', '锁周 set-slot 绕过派发时段不变',
  L.setSlotChanged === false,
  '时段 ' + L.setSlotBefore + '→' + L.setSlotAfter + '（胶囊 disabled=' + L.setSlotChipDisabled + '）');
// 本票新增锁周
push('L4', '锁周 del-train 假钮直派段数不变（本票守卫）',
  L.delTrain && L.delTrain.before === L.delTrain.after,
  '段数 ' + L.delTrain?.before + '→' + L.delTrain?.after);
push('L5', '锁周 del-move 假钮直派动作数不变（本票守卫）',
  L.delMove && L.delMove.before === L.delMove.after,
  '动作数 ' + L.delMove?.before + '→' + L.delMove?.after);
push('L6', '锁周 picker确认 pick 落子动作数不变（本票守卫）',
  L.pick && L.pick.before === L.pick.after,
  '动作数 ' + L.pick?.before + '→' + L.pick?.after + '（名=' + L.pick?.name + '，层 ' + L.pickSheet?.before + '→' + L.pickSheet?.after + '）');
push('L7', '锁周 add-move 只开层不动库（段数/动作数不变，不加守卫的机器依据）',
  L.addMove && L.addMove.sessBefore === L.addMove.sessAfter && L.addMove.moveBefore === L.addMove.moveAfter,
  '段数 ' + L.addMove?.sessBefore + '→' + L.addMove?.sessAfter + '；动作数 ' + L.addMove?.moveBefore + '→' + L.addMove?.moveAfter);
// T558底盘母版周（判据一字不动）
push('M1', '母版周 add-train 同派发照常生效（选时段层出现）',
  M.addTrain && M.addTrain.pickAfter === 1,
  '选时段层 ' + M.addTrain?.pickBefore + '→' + M.addTrain?.pickAfter);
push('M2', '母版周 pick-slot 假钮直派照常生效（段数＋1）',
  M.pickSlot && M.pickSlot.after === M.pickSlot.before + 1,
  '段数 ' + M.pickSlot?.before + '→' + M.pickSlot?.after);
push('M3', '母版周 set-slot 同派发照常生效（时段改变）',
  M.setSlotChanged === true,
  '时段 ' + M.setSlotBefore + '→' + M.setSlotAfter);
// 本票新增母版周（同派发照常生效）
push('M4', '母版周 del-train 同派发照常生效（段数－1）',
  M.delTrain && M.delTrain.after === M.delTrain.before - 1,
  '段数 ' + M.delTrain?.before + '→' + M.delTrain?.after);
push('M5', '母版周 del-move 同派发照常生效（动作数－1）',
  M.delMove && M.delMove.after === M.delMove.before - 1,
  '动作数 ' + M.delMove?.before + '→' + M.delMove?.after);
push('M6', '母版周 picker确认 pick 同派发照常生效（动作数＋1）',
  M.pick && M.pick.after === M.pick.before + 1,
  '动作数 ' + M.pick?.before + '→' + M.pick?.after + '（名=' + M.pick?.name + '）');
push('M7', '母版周 add-move 同样只开层不动库（段数/动作数不变）',
  M.addMove && M.addMove.sessBefore === M.addMove.sessAfter && M.addMove.moveBefore === M.addMove.moveAfter,
  '段数 ' + M.addMove?.sessBefore + '→' + M.addMove?.sessAfter + '；动作数 ' + M.addMove?.moveBefore + '→' + M.addMove?.moveAfter);

let pass = 0;
for (const c of ck) {
  process.stdout.write((c.ok ? 'PASS ' : 'RED  ') + ' ' + c.id + ' ' + c.title + '\n        读数：' + c.reading + '\n');
  if (c.ok) pass++;
}
process.stdout.write('RESULT: ' + pass + '/' + ck.length + '\n');
process.exit(pass === ck.length ? 0 : 1);
