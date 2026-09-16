// 416 · 查询 17 词接线：说词→路由 key→SKILL 行→HELP 卡→可执行 CLI，五段对得上。
// 不做真出口断言：不 spawn／不验 exit 码，只静态验“示例带齐必需槽位”（见本件 executableReason）。
// 判据口径：整段匹配禁裸子串（SKILL 行验反引号整段 CLI；HELP 卡验 wake_word 全等；HTML 不在本票）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  WAKE_TABLE, routeWakeword, buildHelpLookup, BILL_KEY_SHAPES,
} from '../dist/index.js';
import { WAKE_GROUPS, WAKE_ASSETS } from '../dist/triggers/wake-assets.js';

const here = dirname(fileURLToPath(import.meta.url));
const skillText = readFileSync(join(here, '..', 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n');

/** 17 词正典（SKILL.md:51-67 表序＝WAKE_TABLE 表序：5 today＋6 range＋5 search＋1 detail）。 */
const CANON = [
  '查今天', '查昨天', '查某天', '查最近', '查账单',
  '查周', '查月', '查区间', '查分类', '查账户', '查账本',
  '搜备注', '查标签', '查欠款', '查待报销', '查分期',
  '查账单详情',
];

/** 词→key 期望（路由＝SKILL 行 key；难行点名：查账单→today 别名，查账单详情→detail）。 */
const EXPECT_KEY = {
  '查今天': 'bill.record.today',
  '查昨天': 'bill.record.today',
  '查某天': 'bill.record.today',
  '查最近': 'bill.record.today',
  '查账单': 'bill.record.today',
  '查周': 'bill.record.range',
  '查月': 'bill.record.range',
  '查区间': 'bill.record.range',
  '查分类': 'bill.record.range',
  '查账户': 'bill.record.range',
  '查账本': 'bill.record.range',
  '搜备注': 'bill.record.search',
  '查标签': 'bill.record.search',
  '查欠款': 'bill.record.search',
  '查待报销': 'bill.record.search',
  '查分期': 'bill.record.search',
  '查账单详情': 'bill.record.detail',
};

/** 词→HELP 场景 id 期望（查询域 17 卡 1:1；难行点名：查账单→query_bills，查账单详情→query_bill_detail）。 */
const EXPECT_SCENE = {
  '查今天': 'query_today',
  '查昨天': 'query_yesterday',
  '查某天': 'query_date',
  '查最近': 'query_recent',
  '查周': 'query_week',
  '查月': 'query_month',
  '查区间': 'query_range',
  '查账单': 'query_bills',
  '查账单详情': 'query_bill_detail',
  '查分类': 'query_category',
  '搜备注': 'query_search',
  '查标签': 'query_tag',
  '查账户': 'query_account',
  '查账本': 'query_ledger',
  '查欠款': 'query_debt',
  '查待报销': 'query_pending_reimburse',
  '查分期': 'query_installment',
};

/** 路由补槽全集（缺槽词也能路由过；只做路由，不 spawn）。 */
const FULL_CTX = {
  id: 1, date: '2026-09-06', start: '2026-09-01', end: '2026-09-30',
  category: '餐饮', account: '支付宝', ledger: '生活', q: '午饭', tag: '旅行',
};

/** 查询域卡：唤醒词恰好一张查询卡（query 域内按唤醒词全等找）。 */
function findQueryScene(phrase) {
  const hits = [];
  for (const g of WAKE_GROUPS) {
    if (g.id !== 'query') continue;
    for (const sub of g.subgroups) {
      for (const s of sub.scenes) {
        if (s.wake_word === phrase) hits.push(s);
      }
    }
  }
  return hits.length === 1 ? hits[0] : null;
}

/** 示例可执行性（静态，不 spawn）：按查询分支验必需槽位带齐。 */
function executableReason(key, cli) {
  const at = cli.indexOf('--params ');
  if (at < 0) {
    // today 无参即今天（查今天／查账单两词 SKILL 示例无参）；其余分支无参即缺槽。
    if (key === 'bill.record.today') return '';
    return '示例缺 --params：' + cli;
  }
  let p;
  try {
    p = JSON.parse(cli.slice(at + '--params '.length).replace(/^'|'$/g, ''));
  } catch {
    return '示例 params 非 JSON：' + cli;
  }
  if (key === 'bill.record.today') {
    if (Object.keys(p).length === 0) return '';
    if (typeof p.date === 'string' && p.date.length > 0) return '';
    if (p.recent === true) {
      if (p.limit === undefined) return '';
      if (Number.isInteger(p.limit) && p.limit >= 1 && p.limit <= 200) return '';
      return '示例 recent limit 越界（1~200）：' + cli;
    }
    return '示例缺 date／recent：' + cli;
  }
  if (key === 'bill.record.range') {
    if (p.range === 'week' || p.range === 'month') return '';
    if (typeof p.start === 'string' && p.start.length > 0 && typeof p.end === 'string' && p.end.length > 0) return '';
    if (typeof p.category === 'string' && p.category.length > 0) return '';
    if (typeof p.account === 'string' && p.account.length > 0) return '';
    if (typeof p.ledger === 'string' && p.ledger.length > 0) return '';
    return '示例缺 range／start+end／category／account／ledger：' + cli;
  }
  if (key === 'bill.record.search') {
    if (typeof p.q === 'string' && p.q.length > 0) return '';
    if (p.kind === 'tag' && typeof p.tag === 'string' && p.tag.length > 0) return '';
    if (p.kind === 'debt' || p.kind === 'reimburse' || p.kind === 'installment') return '';
    return '示例缺 q／tag／kind：' + cli;
  }
  if (key === 'bill.record.detail') {
    if (Number.isInteger(p.id) && p.id > 0) return '';
    return '示例缺 id（正整数）：' + cli;
  }
  return '未知 key：' + key;
}

/** 17 行接线（纯函数；任一来源漂移即该行 reason 非空，调用方判红）。 */
function buildQueryRows() {
  const hits = buildHelpLookup();
  return CANON.map((phrase) => {
    const entry = WAKE_TABLE.find((e) => e.phrase === phrase);
    if (entry === undefined) {
      return { phrase, key: '', params: {}, shape: '', cli: '', helpSceneId: '', reason: '口径层无此词：' + phrase };
    }
    let key;
    let params;
    try {
      const r = routeWakeword(phrase, FULL_CTX);
      key = r.key;
      params = r.params;
    } catch (e) {
      return { phrase, key: entry.key, params: {}, shape: '', cli: '', helpSceneId: '', reason: '路由失败：' + e.message };
    }
    if (key !== entry.key || key !== EXPECT_KEY[phrase]) {
      return { phrase, key, params, shape: '', cli: '', helpSceneId: '', reason: '路由 key 与期望不一致：' + key + '≠' + EXPECT_KEY[phrase] };
    }
    const hit = hits.find((h) => h.phrase === phrase);
    if (hit === undefined) {
      return { phrase, key, params, shape: '', cli: '', helpSceneId: '', reason: 'SKILL 速查缺行：' + phrase };
    }
    if (hit.key !== key) {
      return { phrase, key, params, shape: hit.shape, cli: hit.cli, helpSceneId: '', reason: 'SKILL 行 key 与路由不一致：' + hit.key + '≠' + key };
    }
    const shapeOf = BILL_KEY_SHAPES[key];
    const wantShape = key === 'bill.record.detail' ? 'detail' : 'list';
    if (shapeOf === undefined || shapeOf === '??' || shapeOf !== hit.shape || shapeOf !== wantShape) {
      return { phrase, key, params, shape: hit.shape, cli: hit.cli, helpSceneId: '', reason: '形状对不上：' + String(shapeOf) + '≠' + hit.shape + '（期望 ' + wantShape + '）' };
    }
    if (!hit.cli.startsWith('bill-cmd-read ' + key)) {
      return { phrase, key, params, shape: shapeOf, cli: hit.cli, helpSceneId: '', reason: 'CLI 不含命令名：' + hit.cli };
    }
    const scene = findQueryScene(phrase);
    if (scene === null) {
      const count = WAKE_ASSETS.filter((s) => s.wake_word === phrase).length;
      return { phrase, key, params, shape: shapeOf, cli: hit.cli, helpSceneId: '', reason: 'HELP 查询卡缺位或不唯一（全资产同词 ' + count + ' 张）：' + phrase };
    }
    if (scene.id !== EXPECT_SCENE[phrase]) {
      return { phrase, key, params, shape: shapeOf, cli: hit.cli, helpSceneId: scene.id, reason: 'HELP 卡 id 与期望不一致：' + scene.id + '≠' + EXPECT_SCENE[phrase] };
    }
    const exec = executableReason(key, hit.cli);
    if (exec !== '') {
      return { phrase, key, params, shape: shapeOf, cli: hit.cli, helpSceneId: scene.id, reason: exec };
    }
    return { phrase, key, params, shape: shapeOf, cli: hit.cli, helpSceneId: scene.id, reason: '' };
  });
}

describe('416 · 查询 17 词五段接线', () => {
  it('17 词表：WAKE_TABLE 派生，顺序照 SKILL 51-67，5 today＋6 range＋5 search＋1 detail', () => {
    const got = WAKE_TABLE.filter((e) => e.key === 'bill.record.today' || e.key === 'bill.record.range' || e.key === 'bill.record.search' || e.key === 'bill.record.detail').map((e) => e.phrase);
    assert.deepEqual(got, CANON);
    assert.equal(got.length, 17);
    const keys = got.map((w) => WAKE_TABLE.find((e) => e.phrase === w).key);
    assert.equal(keys.filter((k) => k === 'bill.record.today').length, 5);
    assert.equal(keys.filter((k) => k === 'bill.record.range').length, 6);
    assert.equal(keys.filter((k) => k === 'bill.record.search').length, 5);
    assert.equal(keys.filter((k) => k === 'bill.record.detail').length, 1);
  });

  it('五段对得上：逐词 reason 为空（词→key→SKILL 行→HELP 卡→CLI）', () => {
    const rows = buildQueryRows();
    assert.equal(rows.length, 17);
    for (const r of rows) {
      assert.equal(r.reason, '', r.phrase + ' 接线断了：' + r.reason);
      assert.ok(r.cli.includes('bill-cmd-read ' + r.key), r.phrase);
      assert.ok(r.helpSceneId.length > 0, r.phrase);
      assert.equal(r.helpSceneId, EXPECT_SCENE[r.phrase], r.phrase + ' 的 HELP 卡 id');
    }
    assert.deepEqual(rows.map((r) => r.phrase), CANON);
  });

  it('HELP 卡：在查询域各恰一张卡（wake_word 全等 1:1，prompt 含唤醒词）', () => {
    const queryScenes = WAKE_GROUPS.find((g) => g.id === 'query').subgroups.flatMap((s) => s.scenes);
    assert.equal(queryScenes.length, 17);
    for (const w of CANON) {
      assert.equal(queryScenes.filter((s) => s.wake_word === w).length, 1, w);
    }
    for (const r of buildQueryRows()) {
      const s = queryScenes.find((x) => x.id === r.helpSceneId);
      assert.ok(s, r.phrase + ' 的卡应在查询域');
      assert.equal(s.wake_word, r.phrase, r.phrase);
      assert.ok(s.prompt_template.includes(r.phrase), r.phrase + ' 的卡应读得出唤醒词');
      assert.ok(s.prompt_template.includes('唤醒词'), r.phrase + ' 的卡应标唤醒词');
    }
  });

  it('SKILL.md 联动块含 17 行 CLI（构建期注入新鲜，反引号整段）', () => {
    for (const r of buildQueryRows()) {
      assert.ok(skillText.includes('`' + r.cli + '`'), r.phrase + ' 的 CLI 不在 SKILL.md 联动块');
    }
  });

  it('反向对账：HELP 查询卡逐张回查（卡→词→key→SKILL 行全对）', () => {
    const queryScenes = WAKE_GROUPS.find((g) => g.id === 'query').subgroups.flatMap((s) => s.scenes);
    const rows = buildQueryRows();
    const byPhrase = new Map(rows.map((r) => [r.phrase, r]));
    assert.equal(queryScenes.length, 17);
    for (const s of queryScenes) {
      assert.ok(byPhrase.has(s.wake_word), 'HELP 卡无对应词：' + s.id + '／' + s.wake_word);
      const r = byPhrase.get(s.wake_word);
      assert.equal(r.reason, '', s.id + ' 反向接线断了：' + r.reason);
      assert.equal(r.helpSceneId, s.id, s.wake_word);
      const routed = routeWakeword(s.wake_word, FULL_CTX);
      assert.equal(routed.key, r.key, s.id + ' 反向路由');
    }
  });

  it('最长匹配回归：查账单／查账单详情互不吞词', () => {
    assert.equal(routeWakeword('查账单', FULL_CTX).key, 'bill.record.today');
    assert.equal(routeWakeword('查账单详情', FULL_CTX).key, 'bill.record.detail');
    assert.equal(routeWakeword('帮我查账单详情里的那笔', FULL_CTX).key, 'bill.record.detail');
    // 既有回归（机制同源，不因查询接线漂移）：看分类对比不落入看分类、报销到账不落入记报销。
    assert.equal(routeWakeword('看分类对比', FULL_CTX).key, 'bill.analysis.compare');
    assert.equal(routeWakeword('报销到账', FULL_CTX).key, 'bill.record.add');
    assert.equal(routeWakeword('记报销报销到账', FULL_CTX).key, 'bill.record.add');
    const hit = WAKE_TABLE.find((e) => e.phrase === '报销到账');
    assert.equal(hit.preset.kind, 'reimburse-done');
  });

  it('反例点名：无命中词路由抛错（对账脚本反例的同语义）', () => {
    assert.throws(() => routeWakeword('同步记账到云端', FULL_CTX), /无命中/);
  });
});
