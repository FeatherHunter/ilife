/** #343 · 代表唤醒词门的**负向证据**（生成器对该字段的拦截有鉴别力）。
 *
 * 背景（票面原话）：各能力 `commands.ts` 的文件头都写着代表唤醒词「必须是真唤醒词」，
 * 但**没有任何一处校验它**——`gen-cli.mjs` 的注释只写「`wakeWord` 可缺（缺了速查表退回命令名）」，
 * 缺了静默退回、写错了静默上屏。本件钉住落地后的那条门：`checkWakeWords()` 的判据必须
 * **能分辨**下面四类，而不是「永远绿」或「永远红」。
 *
 * 判据（正反一条，源＝路由声明的编译产物）：声明里的 `wakeWord` 必须能**路由回它自己那个键**。
 *   · 正向：词必须真的存在一条 exec 路由（不存在＝幽灵词，用户说它什么也拿不到）；
 *   · 反向：词必须落在**本键自己的 wake 词集**里（不在＝它把人领到别的键）。
 * **口径纠正**（总工实测，本件按此写）：判据**不是**「词 ∈ `WAKE_ASSETS`（436 条）」——那张表是冻结
 * SoT 场景词，各票有意新拟的入口词（`list:'new'`／`list:'repair'`，如 `看目标配置`／`看目标推荐`）
 * 故意不写进去，按 ∈436 判会一次点出几十条合法声明（落地即假红）。`#367` 的 `ROUTE-SAMEKEY off=7`
 * 与本题的 7 条违规逐条同源（6 条路由别键 ＋ 1 条幽灵词），互为交叉印证。
 *
 * 五条用例：
 *  ① 扫描面：各能力目录 ＋ 未搬迁场景分片的声明条数＝生成物注册表键数（少扫一处即红）；
 *  ② 真（绿）：真实树上 0 违规；登记位 0 条（#651 起唯一登记行消除：`卡路里HELP` 已有本命令路由）；
 *  ③ 假（红）：合成夹具上幽灵词必被报出／路由别键必被报出／本键词不报／缺字段只读数不判红；
 *  ④ 登记位钉死：登记行换词即当违规报出；登记行已修好即报陈化（**只许变短**）；
 *  ⑤ 真出口接线：`node scripts/gen-cli.mjs --check` exit 0 且 stdout 含 `WAKE-WORD GATE PASS`
 *     （判据写进生成器而没接线，本件当场红——纯函数全绿也拦不住这处漏接）。
 *
 * 负向对照（机器读数见 `docs/skills/skill-calorie/t343-代表词门-证据.md`）：在某个 `commands.ts` 里
 * 故意写一个假词 ⇒ `gen-cli.mjs --check` 失败并点名键／词／文件；逐字节还原 ⇒ 全绿。
 *
 * 运行：`node tooling/run-locked.mjs --ticket 343 -- node --test packages/skill-calorie/test/wakeword-gate-343.test.mjs`
 * 前提：读 `dist/`（须先 `tsc -b packages/skill-calorie`）；⑤ 另需内容印记新鲜（即 `pnpm build` 之后的样子）。
 * 只读：本件不写任何文件（⑤ 只跑 `--check` 模式，不落盘）。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { checkWakeWords } from '../scripts/gen-cli.mjs';
import { loadDecls } from '../scripts/gen-routes.mjs';
import { REGISTRY } from '../dist/cli/registry.js';

const PKG = join(import.meta.dirname, '..');
const SRC = join(PKG, 'src');
const DIST = join(PKG, 'dist');
const GEN = join(PKG, 'scripts', 'gen-cli.mjs');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';

/** 能力目录（判据：目录里既有 `commands.ts` 又有它的编译产物——与生成器的扫描面同口径）。 */
const DIRS = readdirSync(SRC, { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(join(SRC, e.name, 'commands.ts')))
  .map((e) => e.name)
  .sort();

/** 逐件读编译后的声明数组（生成器读的就是这一份事实；恰好一个数组，形状一）。 */
async function declsOf(distPath, from) {
  const mod = await import(pathToFileURL(distPath).href);
  const arrays = Object.entries(mod).filter(([, v]) => Array.isArray(v));
  assert.equal(arrays.length, 1, from + ' 的声明数组不是恰好一个');
  return arrays[0][1].map((s) => ({ ...s, from }));
}

/** 扫描面＝生成器的两个权威源：各能力目录 ＋ 未搬迁场景分片（`index.ts`／`types.ts` 只给类型）。 */
async function scanEntries() {
  const out = [];
  const per = [];
  for (const name of DIRS) {
    const list = await declsOf(join(DIST, name, 'commands.js'), name);
    per.push(name + '=' + list.length);
    out.push(...list);
  }
  const legacyDir = join(DIST, 'cli', 'legacy');
  const legacyFiles = existsSync(legacyDir)
    ? readdirSync(legacyDir).filter((f) => f.endsWith('.js') && f !== 'index.js' && f !== 'types.js').sort()
    : [];
  for (const f of legacyFiles) {
    const list = await declsOf(join(legacyDir, f), 'legacy/' + f);
    if (list.length === 0) continue;
    per.push('legacy/' + f + '=' + list.length);
    out.push(...list);
  }
  return { entries: out, per };
}

const SCAN = await scanEntries();
const ROUTES = await loadDecls();

/* ------------------------------ ① 扫描面 ------------------------------ */
test('#343 ① 扫描面覆盖两个权威源（声明条数＝注册表键数）', () => {
  const regKeys = Object.keys(REGISTRY);
  const keys = SCAN.entries.map((e) => e.key);
  const missing = regKeys.filter((k) => !keys.includes(k));
  assert.ok(DIRS.length >= 10, '能力目录少于 10 个（扫描面缩了？）：' + DIRS.join('、'));
  assert.deepEqual(missing, [], '注册表里有键在声明的扫描面上找不到定义地：' + missing.join('、'));
  assert.equal(new Set(keys).size, keys.length, '同一个键在扫描面上被声明了两次');
  console.log('SCAN dirs=' + DIRS.length + ' ' + SCAN.per.join(' ') + ' keys=' + keys.length +
    ' registry=' + regKeys.length + ' routes=' + ROUTES.length);
});

/* ------------------------------ ② 真（绿） ------------------------------ */
test('#343 ② 真实树：代表唤醒词 0 条违规（幽灵词／路由别键都没有）', () => {
  const r = checkWakeWords({ entries: SCAN.entries, decls: ROUTES });
  for (const v of r.violations) {
    console.log('VIOLATION ' + v.entry.from + ' ' + v.entry.key + '「' + v.entry.wakeWord + '」→[' + v.targets.join('|') + ']');
  }
  for (const h of r.registeredHit) {
    console.log('REGISTERED ' + h.entry.from + ' ' + h.entry.key + '「' + h.entry.wakeWord + '」owner=' + h.reg.owner);
  }
  assert.deepEqual(r.violations.map((v) => v.entry.key), [], '当刻树上仍有代表唤醒词路由不回本键（修法：改成该键自己的 wake 词，或删掉该字段）');
  assert.deepEqual(r.stale.map((s) => s.reg.key), [], '登记位陈化：登记行已不违规，请从 WAKE_GATE_REGISTERED 删行');
  const withWord = SCAN.entries.filter((e) => typeof e.wakeWord === 'string' && e.wakeWord !== '').length;
  console.log('WAKE-GATE real withWord=' + withWord + ' blank=' + r.blank.length +
    ' registered=' + r.registeredHit.length + ' violations=0 routes=' + r.routeHit);
  assert.ok(withWord >= 100, '带代表词的声明太少（判据被架空了？）：' + withWord);
});

/* ------------------------------ ③ 假（红）：夹具鉴别力 ------------------------------ */
test('#343 ③ 合成夹具：幽灵词必报／路由别键必报／本键词不报／缺字段只读数', () => {
  const decls = [
    { list: 'wake', kind: 'exec', key: 'calorie.a', wakeWord: '看甲' },
    { list: 'wake', kind: 'exec', key: 'calorie.b', wakeWord: '看乙' },
    { list: 'new', kind: 'exec', key: 'calorie.b', wakeWord: '看乙新' },
    { list: 'wake', kind: 'non-exec', wakeWord: '别的域的词', bucket: 'out-of-scope', reason: '不在本域' },
  ];
  const entries = [
    { from: 'x', key: 'calorie.a', wakeWord: '看甲' },      // 本键的真词：不报
    { from: 'x', key: 'calorie.b', wakeWord: '看乙新' },     // 本键的新拟入口词：不报（口径纠正后它合法）
    { from: 'x', key: 'calorie.b', wakeWord: '看甲' },       // 路由到别的键：必报
    { from: 'x', key: 'calorie.a', wakeWord: '不存在的词' },  // 幽灵词：必报
    { from: 'x', key: 'calorie.c', wakeWord: undefined },    // 缺字段：只读数
  ];
  const r = checkWakeWords({ entries, decls, registered: [] });
  assert.deepEqual(r.violations.map((v) => v.entry.wakeWord), ['看甲', '不存在的词'],
    '夹具上的违规集与预期不符（判据失明或误报）');
  assert.deepEqual(r.violations[0].targets, ['calorie.a'], '路由别键那一条没报出它实际会把用户领到哪个键');
  assert.deepEqual(r.violations[1].targets, [], '幽灵词那一条不该有路由目标');
  assert.deepEqual(r.blank.map((b) => b.key), ['calorie.c'], '缺字段没进读数（或进了违规）');
  assert.ok(r.keysOfWord.has('看乙') && r.keysOfWord.has('看乙新'), '新拟入口词没进词表（口径纠正被改回去了？）');
  console.log('SELFTEST fixture violations=' + r.violations.length + ' blank=' + r.blank.length + ' words=2');
});

/* ------------------------------ ④ 登记位：只许变短 ------------------------------ */
test('#343 ④ 登记位钉死三元组：换词即报，修好即报陈化', () => {
  // 登记位按 `目录|键|词` 三元组生效（不是按目录或按键）：
  const ghost = { list: 'new', kind: 'exec', key: 'calorie.help.center', wakeWord: '看身材照HELP' };
  const reg = [{ from: 'photo', key: 'calorie.help.center', wakeWord: '卡路里HELP', owner: '夹具', why: '夹具' }];
  const held = checkWakeWords({ entries: [{ from: 'photo', key: 'calorie.help.center', wakeWord: '卡路里HELP' }], decls: [ghost], registered: reg });
  assert.deepEqual(held.violations, [], '登记行没被豁免（登记位失效）');
  assert.equal(held.registeredHit.length, 1, '登记命中没被计数');
  const drifted = checkWakeWords({ entries: [{ from: 'photo', key: 'calorie.help.center', wakeWord: '换了个词' }], decls: [ghost], registered: reg });
  assert.deepEqual(drifted.violations.map((v) => v.entry.wakeWord), ['换了个词'],
    '登记键换了词仍被豁免（登记表没钉住词面）');
  assert.equal(drifted.stale.length, 1, '登记行换词后没同时报陈化');
  const fixed = checkWakeWords({ entries: [{ from: 'photo', key: 'calorie.help.center', wakeWord: '看身材照HELP' }], decls: [ghost], registered: reg });
  assert.deepEqual(fixed.violations, [], '修好之后仍被判违规');
  assert.equal(fixed.stale.length, 1, '登记行已不违规却没报陈化（登记表只许变短）');
  console.log('SELFTEST registered held=1 drift=1 stale=1');
});

/* ------------------------------ ⑤ 真出口接线 ------------------------------ */
test('#343 ⑤ 生成期接线：gen-cli.mjs --check 跑到本门且放行', () => {
  const r = spawnSync(NODE_BIN, [GEN, '--check'], { cwd: PKG, encoding: 'utf8' });
  const out = String(r.stdout) + String(r.stderr);
  assert.ok(/WAKE-WORD GATE/.test(out), '生成器没跑到代表唤醒词门（判据没接线？）输出尾部：' + out.slice(-600));
  assert.ok(/WAKE-WORD GATE PASS/.test(out), '生成器跑到本门但没放行：' + out.slice(-800));
  assert.equal(r.status, 0, 'gen-cli.mjs --check 未 exit 0（status=' + r.status + '）：' + out.slice(-600));
  console.log('WIRING gen-cli.mjs --check exit=0 且含 WAKE-WORD GATE PASS');
});
