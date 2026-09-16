#!/usr/bin/env node
/** 416 · 查询 17 词接线对账（正例 exit 0＋`RESULT 17/17`；反例 exit 非 0＋点名）。
 *
 * 用法：
 *   node docs/skills/skill-bill/t416-reconcile-query.mjs                      # 正例：17 行五段全对即 0
 *   node docs/skills/skill-bill/t416-reconcile-query.mjs --check-phrase <词>  # 反例探针：无接线词即非 0 并点名
 *
 * 只读 `packages/skill-bill/dist`（须先构建），不跑命令、不落盘、不碰库。
 * 五段＝词→key→SKILL 行→HELP 卡→CLI（与 test/t416-query-wiring.test.mjs 同口径，双实现互核）。
 */
import { WAKE_TABLE, routeWakeword, buildHelpLookup, BILL_KEY_SHAPES } from '../../../packages/skill-bill/dist/index.js';
import { WAKE_GROUPS, WAKE_ASSETS } from '../../../packages/skill-bill/dist/triggers/wake-assets.js';

const CANON = [
  '查今天', '查昨天', '查某天', '查最近', '查账单',
  '查周', '查月', '查区间', '查分类', '查账户', '查账本',
  '搜备注', '查标签', '查欠款', '查待报销', '查分期',
  '查账单详情',
];

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

const FULL_CTX = {
  id: 1, date: '2026-09-06', start: '2026-09-01', end: '2026-09-30',
  category: '餐饮', account: '支付宝', ledger: '生活', q: '午饭', tag: '旅行',
};

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

function executableReason(key, cli) {
  const at = cli.indexOf('--params ');
  if (at < 0) {
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

function buildQueryWire() {
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

const argv = process.argv.slice(2);

if (argv[0] === '--check-phrase') {
  const word = argv[1] ?? '';
  let hit = false;
  try {
    routeWakeword(word, FULL_CTX);
    hit = buildQueryWire().some((r) => r.phrase === word && r.reason === '');
  } catch {
    hit = false;
  }
  if (hit) {
    console.log('PHRASE-OK：' + word);
    process.exit(0);
  }
  console.log('PHRASE-NO-WIRE：' + word);
  process.exit(2);
}

const rows = buildQueryWire();
for (const r of rows) {
  console.log(
    (r.reason === '' ? 'OK ' : 'NG ')
    + r.phrase + ' → ' + r.key + ' ' + JSON.stringify(r.params)
    + ' ｜ SKILL[' + r.shape + '] ' + r.cli
    + ' ｜ HELP[' + (r.helpSceneId === '' ? '缺卡' : r.helpSceneId) + ']'
    + (r.reason === '' ? '' : ' ｜ REASON：' + r.reason),
  );
}
const ok = rows.filter((r) => r.reason === '').length;
console.log('RESULT ' + ok + '/' + rows.length);
if (ok !== rows.length || rows.length !== 17) process.exit(1);
