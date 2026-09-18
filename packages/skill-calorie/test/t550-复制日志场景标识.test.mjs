// #550 复制日志第 1 段「场景标识」守门测试：卡路里侧的场景键归一（`src/shared/sceneEnvelope.ts`）。
//
// 背景：公共层 `base-render/src/text.ts:298` 的场景标识算式是 `skill ＋ '.' ＋ key`；卡路里这侧
// 78 处信封装配位里 **50 处**把整键（`calorie.view.plan`）当 key 交进信封，于是日志第 1 段印成
// `calorie.calorie.view.plan（stat）`——用户按「复制日志」抄回 AI 的是一个**不存在的命令键**
// （这一段不上屏，机检与肉眼原先都照不到）。
//
// 修法（编排者 2026-09-15 裁定 (c)）：卡路里侧**每一次 `buildLogText` 调用点**先把信封过一遍
// 归一器剥掉一层前缀，公共层一字不动（公共层的冻结测试因此不受影响）。
//
// 覆盖：
//   ① 归一器三条性质：带前缀剥一层（返回副本、不就地改入参）／不带前缀**返回入参那一只对象**
//      （合规方下游逐字节不变）／边界（空 skill、非字符串、同名无点、只有技能名）原样；
//   ② 负向断言（票面硬要求）：`key` 已带前缀的输入走日志漏斗，产物里 `calorie.calorie.` **0 次**；
//   ③ 冻结串：合规写法（兄弟技能 `pageIdentity` 口径 `record.add`）的日志六段逐字节不变；
//   ④ 四个调用点里的两条漏斗（`shared/copyArea.ts` 的日志位、`render/planCopyBlock.ts` 的日志位）
//      都接上了归一——只接一处时本件必红。
//
// 变异自证：把 `src/shared/sceneEnvelope.ts` 的剥离那一步改回原样（`return envelope`）并重编，
// ②④ 必红；逐字节还原后必绿。
import { test } from 'node:test';
import { strict as assert } from 'node:assert';

import { copyArea, copyLog } from '../dist/shared/copyArea.js';
import { sceneEnvelope } from '../dist/shared/sceneEnvelope.js';
import { planCopyBlock } from '../dist/workout/planCopyBlock.js';
import { buildLogText } from '../../base-render/dist/index.js';

/** 卡路里侧的真形状（`src/render/*Docs.ts` 逐页装的那只信封）。 */
const envelopeOf = (over = {}) => ({
  version: '0.1.0', skill: 'calorie', shape: 'stat', key: 'calorie.view.plan',
  data: { metrics: { plannedSessions: 3 } }, ...over,
});

/** 子串出现次数（不用正则：票面记过「把正则当字面量」的坑）。 */
const countOf = (haystack, needle) => haystack.split(needle).length - 1;

/* ── ① 归一器 ─────────────────────────────────────────────── */

test('#550 归一器：key 带前缀时剥一层，且不就地改入参', () => {
  const env = envelopeOf();
  const out = sceneEnvelope(env);
  assert.notEqual(out, env, '带前缀时必须返回副本，不得就地改写调用方的信封');
  assert.equal(out.key, 'view.plan', '剥掉的是「skill ＋ 点」这一层');
  assert.equal(env.key, 'calorie.view.plan', '入参对象本身必须原样');
  assert.equal(out.skill, 'calorie');
  assert.equal(out.shape, 'stat');
  assert.equal(out.version, '0.1.0');
  assert.equal(out.data, env.data, 'data 位引用不变：数据位一行不碰');
  assert.deepEqual(Object.keys(out).sort(), Object.keys(env).sort(), '字段一个不多一个不少');
});

test('#550 归一器：key 不带前缀（合规写法）返回入参那一只对象', () => {
  for (const key of ['view.plan', 'today', 'record.add', '记身材照', '']) {
    const env = envelopeOf({ key });
    assert.equal(sceneEnvelope(env), env, `key='${key}' 时必须返回同一只对象（下游逐字节不变）`);
  }
});

test('#550 归一器：边界原样返回（空 skill／非字符串／只有技能名／前缀差一字）', () => {
  const cases = [
    envelopeOf({ skill: '' }),
    envelopeOf({ key: 'calorie' }),
    envelopeOf({ skill: 42, key: null }),
    envelopeOf({ key: 'calo.view.plan' }),
    envelopeOf({ key: 'view.plan' }),
  ];
  for (const env of cases) {
    assert.equal(sceneEnvelope(env), env, `skill=${JSON.stringify(env.skill)}／key=${JSON.stringify(env.key)} 必须原样返回`);
  }
});

/* ── ② 负向断言（票面硬要求：`key` 已带前缀 → 0 次） ───────── */

test('#550 负向断言：key 已带前缀时，copyArea 日志漏斗产物里 calorie.calorie. 出现 0 次', () => {
  const envelope = envelopeOf();
  const html = copyArea({
    data: { envelope },
    log: { envelope, copyLog: copyLog({ command: 'calorie-cmd-read calorie.view.plan', actionAt: '2026-09-15 19:00', version: '0.1.0' }) },
  });
  assert.equal(countOf(html, 'calorie.calorie.'), 0, '双前缀必须 0 次');
  assert.equal(countOf(html, 'calorie.view.plan（stat）'), 1, '场景标识回到整名，恰一次');
  assert.ok(countOf(html, 'calorie.view.plan') >= 1, '数据位的整键仍在（数据位一字不动）');
  assert.ok(html.includes('calorie-cmd-read calorie.view.plan'), '日志第 4 段命令原文照旧逐字');
});

test('#550 负向断言：key 已带前缀时，planCopyBlock 日志漏斗产物里 calorie.calorie. 出现 0 次', () => {
  const envelope = envelopeOf({ shape: 'list', key: 'calorie.view.plan', data: { items: [{ a: 1 }] } });
  const html = planCopyBlock({
    envelope,
    log: copyLog({ command: 'calorie-cmd-read calorie.view.plan', actionAt: '2026-09-15 19:00', version: '0.1.0' }),
  });
  assert.equal(countOf(html, 'calorie.calorie.'), 0, '双前缀必须 0 次');
  assert.equal(countOf(html, 'calorie.view.plan（list）'), 1, '场景标识回到整名，恰一次');
});

/* ── ③ 合规调用方：日志六段逐字节不变 ─────────────────────── */

test('#550 合规写法（key 不带前缀）的日志六段逐字节不变（兄弟技能口径）', () => {
  const envelope = { version: '0.1.0', skill: 'bill', shape: 'receipt', key: 'record.add', data: { ok: true, message: 'm' } };
  const log = buildLogText({ envelope: sceneEnvelope(envelope), copyLog: { thinking: 'x' } });
  assert.deepEqual(log.split('\n'), [
    '场景标识', 'bill.record.add（receipt）',
    'AI 思考链', 'x',
    '数据结构', '(未知)',
    '调用链', '(未知)',
    '时间戳版本', '(未知)',
    '异常', '(未知)',
  ], '合规方（bill.record.add）那一行与六段形状逐字节不变');
});
