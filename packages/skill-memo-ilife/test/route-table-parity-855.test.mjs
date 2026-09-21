/** #855 · 路由切表差分回归：旧实现（直读手写 `WAKE_TABLE`）与新实现（读生成物 `WAKE_ROUTES`）逐条同结果。
 *
 * 为什么非有它不可：`src/triggers/routing.ts` **不在生成器 targets 里**（改它 `pnpm gen:check` 不报红），
 * 唯一兜住它的就是本件；`src/triggers/wakewords.ts` 的注释点名了这一支。
 *
 * 旧算法是切表前 `policy/wakewords.ts` 里 `routeWakeword` 的**逐字拷贝**（数据取现值的手写表），
 * 故本件判的是「换数据源没换语义」，不是「照新实现再写一遍」。
 *
 * 判据：
 *   ① 手写表每一词：满槽位 → 同键、同参数；有 `needs` 的缺槽位 → 同错码、同报文；
 *   ② 整句语料（含空串与无命中句）同上；
 *   ③ 生成表相对手写表新增的词＝在册名单（加词必须是有意改这张名单，闭眼加词即红）；
 *   ④ 同词多行只在册一处（`备忘改分类`），且按 `order` 先到先得（全表最长匹配、同长并列取声明序）。
 *
 * 跑：`node --test test/route-table-parity-855.test.mjs`（读 `dist/`，先 `pnpm build`）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WAKE_TABLE } from '../dist/triggers/wakewords.js';
import { routeWakeword } from '../dist/triggers/routing.js';
import { WAKE_ROUTES } from '../dist/triggers/routes.generated.js';

/** 切表前旧实现的逐字拷贝（只把 `throw {}` 换成带 `code` 的 `Error`，报文一字不改）。 */
function routeOld(text, ctx = {}) {
  if (typeof text !== 'string' || text.length === 0) throw Object.assign(new Error('唤醒词为空'), { code: 'POLICY_NO_MATCH' });
  const SORTED = [...WAKE_TABLE].sort((a, b) => b.phrase.length - a.phrase.length);
  const hit = SORTED.find((e) => text.includes(e.phrase));
  if (!hit) throw Object.assign(new Error('无命中唤醒词：' + text), { code: 'POLICY_NO_MATCH' });
  for (const s of hit.needs || []) {
    if (ctx[s] === undefined || ctx[s] === null || ctx[s] === '') {
      throw Object.assign(new Error('缺槽位 ' + s + '：' + hit.phrase), { code: 'POLICY_MISSING_SLOT' });
    }
  }
  const o = {};
  for (const k of hit.needs || []) o[k] = ctx[k];
  return { key: hit.key, params: { ...(hit.preset || {}), ...o } };
}

/** 满槽位取值：手写表 `needs` 用到的全部槽位名各给一个真值。 */
const FULL = { id: 1, start: '2026-07-01', end: '2026-07-07', remind_at: '2026-10-01 09:00', remindAt: '2026-10-01 09:00' };

function run(fn, text, ctx) {
  try {
    return { ok: true, ...fn(text, ctx) };
  } catch (e) {
    return { ok: false, code: e?.code ?? String(e), message: e?.message ?? '' };
  }
}

/** 同结果＝同成败；成则同键同参（参数按键名排序比字符串，避开键序）；败则同错码同报文。 */
function assertSame(text, ctx, note) {
  const a = run(routeOld, text, ctx);
  const b = run(routeWakeword, text, ctx);
  const at = note ?? JSON.stringify(text) + ' ctx=' + JSON.stringify(ctx);
  assert.equal(b.ok, a.ok, at + '：成败不一致，旧=' + JSON.stringify(a) + ' 新=' + JSON.stringify(b));
  if (a.ok) {
    assert.equal(b.key, a.key, at + '：键不一致，旧=' + a.key + ' 新=' + b.key);
    assert.equal(JSON.stringify(b.params), JSON.stringify(a.params), at + '：参数不一致');
  } else {
    assert.equal(b.code, a.code, at + '：错码不一致，旧=' + a.code + ' 新=' + b.code);
    assert.equal(b.message, a.message, at + '：错报文不一致，旧=' + a.message + ' 新=' + b.message);
  }
}

/** 生成表词面（去重、保序）。 */
const routeWords = [...new Set(WAKE_ROUTES.map((r) => r.wakeWord))];
const tableWords = new Set(WAKE_TABLE.map((e) => e.phrase));

describe('#855 · 路由切表差分回归（手写表 31 词 ⊆ 生成表，语义逐字一致）', () => {
  it('① 手写表每一词满槽位同结果', () => {
    for (const e of WAKE_TABLE) {
      const ctx = {};
      for (const n of e.needs || []) ctx[n] = FULL[n] ?? 'x';
      assertSame(e.phrase, ctx, '手写表词 ' + JSON.stringify(e.phrase) + '（满槽位）');
    }
  });

  it('② 有 needs 的词缺槽位同错码同报文', () => {
    for (const e of WAKE_TABLE.filter((x) => (x.needs || []).length)) {
      assertSame(e.phrase, {}, '手写表词 ' + JSON.stringify(e.phrase) + '（缺槽位）');
    }
  });

  it('③ 整句语料（含空串与无命中句）同结果', () => {
    const corpus = [
      '帮我搜备忘跑步', '记一条开会', '记心愿学琴', '进入批量改分类向导', '打开冰箱', '',
      '备忘录 HELP', '这句话里一个唤醒词都没有',
    ];
    for (const t of corpus) assertSame(t, { ...FULL }, '语料 ' + JSON.stringify(t));
  });

  it('④ 手写表的词一个都没在生成表里丢掉', () => {
    const lost = [...tableWords].filter((w) => !routeWords.includes(w));
    assert.deepEqual(lost, [], '切表丢了这些词（旧行为会变）：' + lost.join('、'));
  });

  it('⑤ 生成表相对手写表新增的词＝在册 8 词（加词须有意改本名单）', () => {
    const added = routeWords.filter((w) => !tableWords.has(w));
    assert.deepEqual(added, [
      '查情绪', '记备忘', '改备忘', '备忘改分类', '备忘改子分类', '记情绪', '删情绪', '改情绪',
    ], '新增词面变了：请逐个核对它们服务哪张 HELP 场景卡，再改本名单');
  });

  it('⑥ 同词多行只在册一处，且按 order 先到先得', () => {
    const seen = new Map();
    for (const r of WAKE_ROUTES) seen.set(r.wakeWord, (seen.get(r.wakeWord) ?? 0) + 1);
    const dup = [...seen].filter(([, n]) => n > 1).map(([w]) => w);
    assert.deepEqual(dup, ['备忘改分类'],
      '同词多行变了：新加的一份是「词面重复」（同长并列时声明序在前的赢，后一条永远路由不到），要么删它、要么改词');
    const rows = WAKE_ROUTES.filter((r) => r.wakeWord === '备忘改分类');
    const first = rows.reduce((a, b) => (a === null || b.order < a.order ? b : a), null);
    assert.equal(run(routeWakeword, '备忘改分类', { ...FULL }).key, first.key,
      '同词并列胜出者不再是 order 最小那条（声明序变了？）');
  });
});
