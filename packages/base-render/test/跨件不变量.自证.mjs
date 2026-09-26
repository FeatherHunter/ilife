/** 「跨件不变量」判据的**反例自证**（先例：各件判据的变异轮；这里不改仓内源码，改的是**临时副本**）。
 *
 *  为什么要有它：一条横切判据最要紧的不是「今天绿」，而是「**它到底抓不抓得住**」。本脚本对
 *  `test/跨件不变量.test.mjs` 的五条不变量各做一次**故障注入**——把 `dist/` 拷到
 *  `.scratch/<票号>/跨件不变量-自证/<n>/dist`（**仓内 `src/**` 一个字节都不动**），在副本上把
 *  某一件的实现改坏一处，再拿 `ILIFE_CROSS_DIST=<副本>` 跑整条门，断言**那一处当场变红**、
 *  并把红读数原文打出来。改坏的方式照着这一批实测出来的病来（不是随便改一行）：
 *
 *   ① 非有限数：把 `calendar-month` 的深浅档校验改成「坏数照收」；
 *   ② 键盘语汇：往 `progress-list` 的一枚**可见文字**里塞一句「（按方向键排序）」；
 *   ③ 未知键：把 `kanban-columns` 的 `assertKeys()` 调用点掐掉（未知键静默吞掉）；
 *   ④ 静档：把 `kanban-columns` **运行时段**里的 `is-picked` 改名——渲染期照旧写、运行时段再不碰它
 *      （这正是本批实测的那一条：运行时段从不写 `is-picked`）；
 *   ④b 真机：把 `kanban-columns` 运行时段的 `click` 委派第一行掐掉（真指针点下去什么也不发生
 *      ＝「点一下拿起整条通路是坏的」）；
 *   ⑤ 逐条对账：给 `gap-band` 的第 2 枚纵轴刻度加 30px 位移（首末不动、中间那枚漂走的老写法）。
 *
 *  跑法（经 `node tooling/run-locked.mjs --ticket 950 -- …` 排队；本脚本自己起 `node --test`）：
 *    `node packages/base-render/test/跨件不变量.自证.mjs`
 *  收尾读数：`SELF-PROOF n/6 …` ＋ 每个自证的红读数原文；**6 条全 PASS 才算这条门的自证成立**。
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const REPO = join(PKG, '..', '..');
const GATE = join(HERE, '跨件不变量.test.mjs');
const SOURCE_DIST = join(PKG, 'dist');
const WORK = join(REPO, '.scratch', '950', '跨件不变量-自证');

/** 每一条自证：改哪个文件、把哪段原文换成哪段、红了之后该出现哪一行。 */
const MUTATIONS = [
  {
    id: '① 非有限数一律拒',
    file: 'components/calendar-month/model.js',
    from: '!CALENDAR_MONTH_LEVELS.includes(value)',
    to: 'false && !CALENDAR_MONTH_LEVELS.includes(value)',
    what: '把 calendar-month 的深浅档校验改成「坏数照收」',
    expect: /^① 红 calendar-month｜/m,
  },
  {
    id: '② 用户可见文本零键盘语汇',
    file: 'components/progress-list/render.js',
    from: "esc(row.label) + '</span>'",
    to: "esc(row.label) + '（按方向键排序）' + '</span>'",
    what: '往 progress-list 的一枚可见文字里塞一句「（按方向键排序）」',
    expect: /^② 红 progress-list｜/m,
  },
  {
    id: '③ 未知键一律拒',
    file: 'components/kanban-columns/model.js',
    from: '\n    assertKeys(raw, ',
    to: '\n    void (0) && assertKeys(raw, ',
    all: true,
    what: '把 kanban-columns 的 assertKeys() 调用点全掐掉（未知键静默吞掉）',
    expect: /^③ 红 kanban-columns｜/m,
  },
  {
    id: '④ 静档：运行时段与渲染期写同一套类名',
    file: 'components/kanban-columns/runtime.js',
    from: '"is-picked"',
    to: '"is-picked-x"',
    all: true,
    what: '把 kanban-columns 运行时段里的 is-picked 改名（渲染期照旧写、运行时段再不碰它）',
    expect: /^④ 红 kanban-columns｜is-picked/m,
  },
  {
    id: '④b 真机：真指针点一下',
    file: 'components/kanban-columns/runtime.js',
    from: 'doc.addEventListener("click",function(e){',
    to: 'doc.addEventListener("click",function(e){ return;',
    what: '把 kanban-columns 运行时段的 click 委派掐掉（真指针点下去什么也不发生）',
    expect: /点完之后状态\*\*一点没变\*\*/,
  },
  {
    id: '⑤ 位置／长度逐条对账',
    file: 'components/gap-band/style.js',
    from: "'  transform: translateY(50%);',",
    /* 注入的是**一条完整规则**：先把当前那条规则闭上，插进自己这条，再把原规则重新打开
       （样式段是「一串字符串 join(LF)」拼出来的，直接往后插会把新规则塞进上一条规则的**体内**——
       2026-09 首跑实测：那样浏览器整条都不认，自证就假绿了）。 */
    to: "'  transform: translateY(50%);',\n        '}',\n        '.ilife-page-ui .ilife-block-gap-band-ytick:nth-child(2) { transform: translateY(50%) translateY(30px); }',\n        '.ilife-page-ui .ilife-block-gap-band-ytick {',",
    what: '给 gap-band 的第 2 枚纵轴刻度加 30px 位移（首末不动、中间那枚漂走的老写法）',
    /* 钉的是**A 支**那一行（值 → 位置直线）：它就是这一批实测「只量了首末两枚、中间那枚偏到 67px」的正对口径；
       B 支（逐条兑现）同一处也会红，两行都在读数里。 */
    expect: /(^⑤ 红 gap-band｜.*｜值 8 的中心[^\n]*)/m,
  },
];

/** 递归删除前的**路径守卫**（协议 §2.1.3）：目标必须以本脚本自己的临时根开头，且不落在禁区里。 */
function assertSafeToRemove(target, allowRoot = false) {
  const abs = resolve(target);
  const root = resolve(WORK);
  if (abs !== root && !abs.startsWith(root + '\\') && !abs.startsWith(root + '/')) {
    throw new Error('拒绝删除临时根之外的路径：' + abs);
  }
  if (abs === root && !allowRoot) throw new Error('拒绝删除临时根本身（清场那一步才允许）：' + abs);
  for (const seg of abs.split(/[\\/]/)) {
    if (['node_modules', 'packages', 'docs', 'test', 'tooling', '.git', 'src'].includes(seg)) {
      throw new Error('拒绝删除禁区目录下的路径：' + abs);
    }
  }
}

let pass = 0;
const lines = [];
for (const [i, m] of MUTATIONS.entries()) {
  const box = join(WORK, String(i + 1));
  if (existsSync(box)) { assertSafeToRemove(box); rmSync(box, { recursive: true, force: true }); }
  mkdirSync(box, { recursive: true });
  const dist = join(box, 'dist');
  cpSync(SOURCE_DIST, dist, { recursive: true });
  const file = join(dist, m.file);
  const src = readFileSync(file, 'utf8');
  const hits = src.split(m.from).length - 1;
  if (hits === 0) throw new Error('自证 ' + m.id + '：注入锚点在编译产物里找不到（' + m.file + ' 里的 ' + JSON.stringify(m.from) + '）');
  if (m.all !== true && hits > 1) throw new Error('自证 ' + m.id + '：锚点命中 ' + hits + ' 次（只该 1 次），先看看是不是产物形状变了');
  writeFileSync(file, m.all === true ? src.split(m.from).join(m.to) : src.replace(m.from, m.to), 'utf8');

  const run = spawnSync(process.execPath, ['--test', GATE],
    { encoding: 'utf8', timeout: 600000, maxBuffer: 64 * 1024 * 1024, env: { ...process.env, ILIFE_CROSS_DIST: dist } });
  const out = String(run.stdout === null ? '' : run.stdout) + String(run.stderr === null ? '' : run.stderr);
  const hit = m.expect.exec(out);
  const ok = hit !== null;
  if (ok) pass += 1;
  /* 命中的那一行连同它前后一点上下文：回执里贴的就是这段原文。 */
  const at = hit === null ? -1 : out.indexOf(hit[0]);
  const quote = hit === null ? '（没红：这一条不变量没抓住 ' + m.what + '）'
    : out.slice(Math.max(0, out.lastIndexOf('\n', at) + 1), out.indexOf('\n', at + hit[0].length));
  lines.push('SELF-PROOF ' + (i + 1) + '/6 ' + (ok ? 'PASS' : 'FAIL') + '｜' + m.id + '｜' + m.what
    + '\n    红读数原文：' + (quote.length > 400 ? quote.slice(0, 400) + '…' : quote));
  assertSafeToRemove(dist);
  rmSync(box, { recursive: true, force: true });
}
for (const line of lines) console.log(line);
let cleaned = true;
try {
  if (existsSync(WORK)) { assertSafeToRemove(WORK, true); rmSync(WORK, { recursive: true, force: true }); }
} catch (e) {
  cleaned = false;
  console.error('FAIL: 临时副本没清干净（' + WORK + '）：' + String(e.message));
}
console.log('RESULT: ' + pass + '/' + MUTATIONS.length + ' 条自证成立（每条都要求：改坏之后**那一处当场红**，红读数原文见上）'
  + (cleaned ? '；临时副本已清' : '；**临时副本残留**'));
process.exit(pass === MUTATIONS.length && cleaned ? 0 : 1);
