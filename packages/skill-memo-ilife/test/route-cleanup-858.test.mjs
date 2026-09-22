/**
 * #858 · 路由表清理四问实施 —— 验收探针（口径 `t837b-路由清理口径.md`，裁定 #842 四条全 A）。
 *
 * 一个接缝：**技能唯一出口**（`dist/cli/cmd_read.js`，argv＋JSON＋退出码）；两个注入点是
 * 临时库（配置项 `db.dir`）与远端挡板（PATH 首位的 `lark-cli`）。HELP 资产与 SKILL.md 速查块
 * 按**产物文本**读（构建期注入物，不是源码）。
 *
 * 七条对应票面 Testing Decisions 的七个面：
 *   ① 速查块：一场景一行，行数＝场景数（30），别名与退役词都不在；
 *   ② 别名：全部退出速查块，但仍在 HELP 资产 `aliases` 里、**12 条条条**按词可路由（撤的是行不是词）；
 *   ③ 废弃提醒：短语无命中，能力仍在 `memo.remove {mode:"abandon"}`（真出口跑，笔记保留）；
 *   ④ 统计命令：按键报未知键，形状表与速查块里都没有它；
 *   ⑤ 飞书授权：短语无命中，两诊断档不被拒，退役三支报错指去安装指引；
 *   ⑥ 说明句：SKILL.md 那两句已改（别名住 HELP 资产／总表只列主名）；
 *   ⑦ 生成链自检绿（`gen-cli.mjs --check`）。
 *
 * 跑法（**cwd 必须是包目录**，出口依赖包内 `node_modules` 的 junction 依赖）：
 *   cd packages/skill-memo-ilife
 *   node ../../node_modules/typescript/bin/tsc -b .
 *   node --test test/route-cleanup-858.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { envelope, makeSeam } from '../../../tooling/contract-seam.mjs';
import { mkMemoConfig, stubPathEnv } from './helpers/config-base.mjs';
import { WAKE_ROUTES } from '../dist/triggers/routes.generated.js';
import { MEMO_HELP_GROUPS } from '../dist/help/sceneData.js';
import { MEMO_KEY_SHAPES } from '../dist/render/index.js';
import { buildHelpLookup } from '../dist/help/index.js';
import { routeWakeword } from '../dist/triggers/routing.js';

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKILL = readFileSync(join(PKG, 'SKILL.md'), 'utf8');
const skillLines = SKILL.split('\n');

/** SKILL.md 速查块（`HELP-AUTO` 标记之间）里的数据行，逐行给出第一列（唤醒词）。 */
function quickRefRows() {
  const si = skillLines.findIndex((l) => l.includes('HELP-AUTO-START'));
  const ei = skillLines.findIndex((l) => l.includes('HELP-AUTO-END'));
  assert.ok(si >= 0 && ei > si, 'SKILL.md 缺 HELP 速查标记块');
  return skillLines.slice(si + 1, ei)
    .filter((l) => l.startsWith('| ') && !l.startsWith('| 唤醒词') && !l.startsWith('|---'))
    .map((l) => l.split('|')[1].trim());
}

/** HELP 资产的场景：`{ id, wake_word, aliases }`（别名住资产、渲染时剥离）。 */
function sceneAssets() {
  const out = [];
  for (const g of MEMO_HELP_GROUPS) for (const sub of g.subgroups) for (const sc of sub.scenes) out.push(sc);
  return out;
}

function seam(prefix) { return makeSeam('memo', { prefix }); }

/** 满槽位上下文：喂运行期路由用（哪条记录需要什么槽位就全给上）。 */
const FULL = { id: 1, start: '2026-07-01', end: '2026-07-07', remind_at: '2026-10-01 09:00', remindAt: '2026-10-01 09:00', content: '取牛奶', note_id: 1 };
/** 跑一次出口：退出码 ＋ 回执 ＋ stderr 一次取齐（断言只读这三处）。 */
function run(s, key, params) {
  const home = mkMemoConfig({ db: { dir: s.dbPath } }, 't858-cfg-');
  const r = s.runNew(key, params, { extraEnv: stubPathEnv(home, s.stub.dir) });
  let env = null;
  try { env = envelope(r); } catch { env = null; }
  return { exit: r.status, env, stderr: String(r.stderr || ''), stdout: String(r.stdout || '') };
}

describe('#858 路由表清理四问实施', () => {
  it('① 速查块＝一场景一行：行数＝场景数（30），每场景恰一行、别名与退役词都不在', () => {
    const rows = quickRefRows();
    const scenes = sceneAssets();
    const mains = new Set(scenes.map((s) => s.wake_word));
    assert.equal(scenes.length, 30, 'HELP 场景数变了');
    assert.equal(new Set(scenes.map((s) => s.id)).size, 30, 'HELP 场景 id 不唯一');
    assert.equal(mains.size, 29, '场景主名唯一词数变了（`备忘改分类` 服务两张卡）');
    assert.equal(rows.length, scenes.length, '速查块行数 ≠ 场景数（一场景一行）：' + JSON.stringify(rows));
    for (const w of rows) assert.ok(mains.has(w), w + ' 不是场景主名（别名或退役词混进来了）');
    // `备忘改分类` 那两张卡各占一行（命令不同），其余词一行。
    const shared = [...mains].filter((w) => scenes.filter((s) => s.wake_word === w).length > 1);
    assert.deepEqual(shared, ['备忘改分类'], '共用主名的场景变了');
    for (const w of rows) {
      const want = scenes.filter((s) => s.wake_word === w).length;
      assert.equal(rows.filter((x) => x === w).length, want, w + ' 的行数 ≠ 它服务的场景数');
    }
    // 表里的每一行都能在路由声明里找到对应记录；不共词的每一行按词真能路由回自己那个键。
    const hits = buildHelpLookup();
    assert.equal(hits.length, rows.length, 'buildHelpLookup() 的条数与注入块不一致');
    for (const h of hits) {
      const rec = WAKE_ROUTES.find((r) => r.wakeWord === h.phrase && r.key === h.key);
      assert.ok(rec !== undefined, h.phrase + ' → ' + h.key + ' 在路由声明里找不到对应记录');
      if (shared.includes(h.phrase)) continue; // 共词那一格见下（运行期并列取 order 最小那条）
      assert.equal(routeWakeword(h.phrase, FULL).key, h.key, h.phrase + ' 的速查键与路由结果不一致');
    }
    // 共词那一格（批量）：运行期并列按 `order` 先到先得 ⇒ 裸词走单条那条；批量格由它的**别名**到达。
    assert.equal(routeWakeword('备忘改分类', FULL).key, 'memo.update', '裸词「备忘改分类」的运行期胜出者变了');
    assert.equal(routeWakeword('批量改分类', {}).key, 'memo.batch', '别名「批量改分类」接不回批量那一格');
    // 每个有词面的键都要在速查面有行（与 `t855-验收-命令自治.mjs` 的 ⑤ 面判据同款）。
    const rowKeys = new Set(hits.map((h) => h.key));
    for (const k of new Set(WAKE_ROUTES.map((r) => r.key))) {
      assert.ok(rowKeys.has(k), '键 ' + k + ' 有词面、但速查面没有行（SKILL.md 那张表会漏词）');
    }
  });

  it('② 别名退出速查块，但仍住 HELP 资产且**条条**按词可路由（撤的是行不是词）', () => {
    const rows = new Set(quickRefRows());
    const aliases = sceneAssets().flatMap((s) => s.aliases || []);
    assert.equal(aliases.length, 12, 'HELP 资产的别名条数变了（生成器另有形状断言，此处是现场读数）');
    for (const w of aliases) {
      assert.ok(!rows.has(w), '别名 ' + w + ' 仍在速查块里（#842 Q③：总表只列主名）');
      assert.ok(sceneAssets().some((s) => (s.aliases || []).includes(w)), w + ' 不在任何场景的 aliases 里（词被撤掉了）');
      // #858 独立复核翻出的缺口：三条未接线的别名（初始化／新手／完成打卡）会被下面这个循环**空转豁免**，
      // 故这里先钉「12 条一条不少地能路由」，再逐条比键（缺词面即当场红）。
      const r = WAKE_ROUTES.find((x) => x.wakeWord === w);
      assert.ok(r !== undefined, '别名 ' + w + ' 在路由表里没有词面（HELP 资产登记了、命令面接不住）');
      const ctx = {}; for (const n of (r.needs || [])) ctx[n] = 'x';
      assert.equal(routeWakeword(w, ctx).key, r.key, '别名 ' + w + ' 路由不到 ' + r.key);
    }
    // 现场抽查票面点名的四条长式／新词（老侧的口径：长式是历史漂移，新仓收成别名）。
    for (const w of ['记一条', '添加笔记', '查提醒', '改情绪日记']) {
      assert.ok(aliases.includes(w), '抽查别名不在 HELP 资产里：' + w);
      assert.ok(!rows.has(w), '抽查别名仍在速查块里：' + w);
    }
  });

  it('③ 废弃提醒短语无命中；废弃分支按键可用且笔记保留（真出口）', () => {
    assert.throws(() => routeWakeword('废弃提醒', {}), (e) => e.code === 'POLICY_NO_MATCH',
      '「废弃提醒」应已退役（#842 Q②：并入看提醒的已废弃说明后撤行）');
    assert.ok(!quickRefRows().includes('废弃提醒'), '速查块里还有「废弃提醒」那一行');
    const s = seam('t858-abandon-');
    const created = run(s, 'memo.create', { title: '废弃用笔记', category: '备忘' });
    assert.equal(created.exit, 0, '建笔记失败：' + created.stderr);
    const id = Number(created.env.data.message.replace('已记一条：', ''));
    const rem = run(s, 'memo.reminder', { note_id: id, content: '要废弃的提醒', remind_at: '2030-01-01 09:00' });
    assert.equal(rem.exit, 0, '建提醒失败：' + rem.stderr);
    const rid = Number(rem.env.data.id);
    const abandoned = run(s, 'memo.remove', { mode: 'abandon', id: rid });
    assert.equal(abandoned.exit, 0, '废弃分支不可用（能力该保留）：' + abandoned.stderr);
    assert.match(String(abandoned.env.data.message), /笔记保留/);
    assert.equal(run(s, 'memo.detail', { id }).exit, 0, '废弃后笔记必须还在');
    assert.ok(!run(s, 'memo.remind', {}).env.data.items.some((x) => x.id === rid), '废弃后不该再出现在有效提醒里');
    assert.ok(run(s, 'memo.remind', { status: 'dismissed' }).env.data.items.some((x) => x.id === rid), '废弃后该出现在已废弃视图里');
  });

  it('④ 统计命令整条退役：按键报未知键，形状表与速查块里都没有它', () => {
    // 先读**静态面**（形状表 / SKILL.md）：这一层在「只把键加回形状表」的变异下就要红，
    // 不能排在真出口那一步之后（#858 独立复核指出：旧序会让形状表那条断言执行不到）。
    assert.ok(!Object.prototype.hasOwnProperty.call(MEMO_KEY_SHAPES, 'memo.stats'), '形状表里还留着 memo.stats');
    assert.ok(!Object.values(MEMO_KEY_SHAPES).includes('stat'), 'memo 的形状表里还留着 stat 形（只有 stats 用过它）');
    assert.ok(!SKILL.includes('memo.stats'), 'SKILL.md 里还提到 memo.stats');
    assert.ok(!/统计/.test(SKILL.split('---')[1] || ''), 'frontmatter 的能力面里还写着「统计」');
    // 再读真出口那一步。
    const s = seam('t858-stats-');
    const r = run(s, 'memo.stats', {});
    assert.equal(r.exit, 3, '退役后按键应报未知键（exit 3），实得 ' + r.exit);
    assert.match(r.stderr, /未知联动 key/);
  });

  it('⑤ 飞书授权短语无命中；两诊断档不被拒，退役三支指去安装指引', () => {
    assert.throws(() => routeWakeword('飞书授权', {}), (e) => e.code === 'POLICY_NO_MATCH');
    const s = seam('t858-auth-');
    assert.equal(run(s, 'memo.auth', { step: 'status' }).exit, 0, '只读档 status 应可用');
    assert.equal(run(s, 'memo.auth', { step: 'diag', dryRun: true }).exit, 0, '只读档 diag（dryRun 零写）应可用');
    for (const step of ['init', 'qr', 'poll']) {
      const r = run(s, 'memo.auth', { step });
      assert.equal(r.exit, 2, step + ' 是已退役的引导支，应报参数错（exit 2），实得 ' + r.exit);
      assert.match(r.stderr, /lark\.prompt/, step + ' 的报错须指去复制安装指引（lark.prompt）');
    }
  });

  it('⑥ 说明句已改：别名住 HELP 资产、总表只列主名', () => {
    assert.ok(SKILL.includes('只住 HELP 资产的 `aliases`'), 'SKILL.md 缺「别名住 HELP 资产」那句');
    assert.ok(!SKILL.includes('住上一节索引块'), 'SKILL.md 还留着「别名住上一节索引块」的旧说法');
    assert.ok(SKILL.includes('场景主名'), 'SKILL.md 的速查表说明句没改（仍按唤醒词计数）');
  });

  it('⑦ 生成链自检绿：gen-cli --check（生成物 == 生成器输出）', () => {
    assert.ok(existsSync(join(PKG, 'scripts', 'gen-cli.mjs')), '缺生成器');
    const r = spawnSync(process.execPath, [join(PKG, 'scripts', 'gen-cli.mjs'), '--check'], { cwd: PKG, encoding: 'utf8' });
    assert.equal(r.status, 0, 'GEN-CHECK 非 0：\n' + String(r.stdout) + String(r.stderr));
  });
});
