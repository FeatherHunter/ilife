// #1207 analysis 批次 2（18 件 413 键）：词条层＋语言链的接线证明。
//
// 口径 honesty（先写清楚再断言）：
//   · 本批 18 件场景全部改成 buildScene()／sceneXxx(language) 工厂（照 #1204 的 write/scene-* 形状），
//     静态导出 sceneXxx 仍在（模块加载时按 zh 建一次，未进语言上下文时逐字节不变）；
//   · 取词一律经 entries 的 m()，语言由 sceneFor(key, kind, language) 显式传下去，
//     values() 在渲染期取词，故深层文案跟渲染语言上下文走（read.ts 传 currentRenderLanguage()）；
//   · 备注标签／方向判别值（#借出／#未还／#分期／#退款…）是用户数据，按 ADR-0004 留在源码里不迁，
//     故英文场景里仍会出现这些中文标签——这是数据，不是漏译。
import { before, after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolve, MissingParamError, runWithLanguage } from '../../base-entries/dist/index.js';
import { SKILL_BILL_CATALOG } from '../dist/entries/index.js';
import { sceneFor } from '../dist/analysis/scene.js';
import { viewAnalysisOverview } from '../dist/analysis/read.js';
import { openBillDb, closeBillDb } from '../dist/fetch/db.js';
import { seedBillDb } from './helpers/bill-seed.mjs';

const PREFIX = 'skill-bill.analysis-scene-';
const OVERVIEW = 'bill.analysis.overview';
const COMPARE = 'bill.analysis.compare';
const TREND = 'bill.analysis.trend';

/** 18 件：[分析命令, kind, 场景件名]（compare|category 住 scene-cat-compare，与 trend|category 不同件）。 */
const SCENES = [
  [TREND, 'activity', 'activity'],
  [TREND, 'anomaly', 'anomaly'],
  [TREND, 'category', 'cat-trend'],
  [TREND, 'debt', 'debt'],
  [TREND, 'distribution', 'distribution'],
  [TREND, 'insight', 'insight'],
  [TREND, 'installment', 'installment'],
  [TREND, 'refund', 'refund'],
  [TREND, 'reimburse', 'reimburse'],
  [COMPARE, 'category', 'cat-compare'],
  [COMPARE, 'period', 'period-compare'],
  [COMPARE, 'range', 'range-compare'],
  [OVERVIEW, 'category', 'category'],
  [OVERVIEW, 'ledger', 'ledger'],
  [OVERVIEW, 'monthly', 'monthly'],
  [OVERVIEW, 'overview', 'overview'],
  [OVERVIEW, 'stats', 'stats'],
  [OVERVIEW, 'structure', 'structure'],
];

const ZH = SKILL_BILL_CATALOG.zh;
const EN = SKILL_BILL_CATALOG.en;
const names = (text) => [...text.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g)].map((x) => x[1]);
const ourKeys = () => Object.keys(ZH).filter((k) => k.startsWith(PREFIX));

let db = null;
before(() => {
  const dir = mkdtempSync(join(tmpdir(), 't1207-db-'));
  db = openBillDb(seedBillDb(dir));
});
after(() => { if (db !== null) closeBillDb(db); });

describe('#1207 analysis 批次 2：词条＋语言链', () => {
  it('键面：413 键、18 个场景标题各一条、zh／en 同 key 且英文列无空串', () => {
    const keys = ourKeys();
    assert.equal(keys.length, 413);
    assert.deepEqual(Object.keys(EN).filter((k) => k.startsWith(PREFIX)).sort(), keys.slice().sort());
    for (const [, , slug] of SCENES) assert.ok(keys.includes(PREFIX + slug + '.title'), '缺场景标题键：' + slug);
    for (const k of keys) assert.ok(EN[k].length > 0, '英文缺译：' + k);
  });

  it('占位符集合逐条相等（中文列 ↔ 英文列）', () => {
    for (const k of ourKeys()) {
      assert.deepEqual(names(EN[k]).sort(), names(ZH[k]).sort(), '占位符不一致：' + k);
    }
  });

  it('全键可求值：中英各一份、无残留花括号；缺参抛 MissingParamError', () => {
    for (const k of ourKeys()) {
      const ps = Object.fromEntries(names(ZH[k]).map((n) => [n, '1']));
      const zh = resolve(SKILL_BILL_CATALOG, 'zh', k, ps);
      const en = resolve(SKILL_BILL_CATALOG, 'en', k, ps);
      assert.ok(zh.length > 0 && en.length > 0, '空串：' + k);
      assert.ok(!zh.includes('{') && !en.includes('{'), '占位符未替换：' + k);
      if (names(ZH[k]).length > 0) {
        assert.throws(() => resolve(SKILL_BILL_CATALOG, 'zh', k, {}), MissingParamError, '缺参应抛：' + k);
        assert.throws(() => resolve(SKILL_BILL_CATALOG, 'en', k, {}), MissingParamError, '缺参应抛（en）：' + k);
      }
    }
  });

  it('语言链：sceneFor(key, kind, language) 按语言重建，未识别语言回退 zh 且不返空串', () => {
    for (const [key, kind, slug] of SCENES) {
      const zhTitle = ZH[PREFIX + slug + '.title'];
      const enTitle = EN[PREFIX + slug + '.title'];
      const zh = sceneFor(key, kind, 'zh');
      const en = sceneFor(key, kind, 'en');
      const zz = sceneFor(key, kind, 'zz');
      assert.equal(zh.title, zhTitle, 'zh 标题应取中文列：' + slug);
      assert.equal(en.title, enTitle, 'en 标题应取英文列：' + slug);
      assert.equal(zz.title, zhTitle, '未识别语言应回退中文列：' + slug);
      assert.ok(en.title.length > 0 && zz.title.length > 0, '标题空串：' + slug);
      assert.equal(en.family, zh.family, '形态族不应随语言变：' + slug);
    }
  });

  it('渲染期深层文案跟语言上下文走（真库 2026-05 月度页）', () => {
    const zh = runWithLanguage('zh', () => viewAnalysisOverview({ kind: 'monthly', month: '2026-05' }, db));
    const en = runWithLanguage('en', () => viewAnalysisOverview({ kind: 'monthly', month: '2026-05' }, db));
    const zz = runWithLanguage('zz', () => viewAnalysisOverview({ kind: 'monthly', month: '2026-05' }, db));
    assert.ok(zh.html.includes('看月度'), '中文页应有中文标题');
    assert.ok(en.html.includes('Monthly'), '英文页应有英文标题');
    assert.ok(en.html.includes('yuan'), '英文页应取英文单位');
    // 本票只迁 18 件场景；页头 h1／copy 区由 analysis/copyTextAnalysis.ts 供词（不在本票清单），
    // 故不断言整页无中文，只断言**本票件自己出的深层文案**已按语言切换。
    assert.ok(en.html.includes('Category ranking'), '英文页的分类排行卡应取英文列（scene-monthly.c017）');
    assert.ok(zh.html.includes('分类排行'), '中文页的分类排行卡应取中文列');
    assert.ok(en.html.includes(EN[PREFIX + 'monthly.c006']), '英文页口径行应逐字取英文列（scene-monthly.c006）');
    assert.ok(zh.html.includes(ZH[PREFIX + 'monthly.c006']), '中文页口径行应逐字取中文列');
    assert.equal(zz.html, zh.html, '未识别语言应与 zh 逐字节一致（回退链不返空串）');
  });
});
