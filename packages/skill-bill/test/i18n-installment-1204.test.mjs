// #1204 首迁件（write/scene-installment.ts）：词条层＋语言链的接线证明。
//
// 口径 honesty（先写清楚再断言）：记分期采集页线上走 SAY 原型（`sayWords.ts`，#1203 策略件），
// 本件迁入的 28 条里只有 word／kind／family 与 fallback 分支直连；receipt.* 八字段是模板演进后
// 留下的死 spec。回执纸（`receiptPaper.ts`，#1204 第二件）已迁：结论／核对／复制明细整句化，
// 回执页中英各一份可断言；采集页英文整页仍随 SAY 原型票。
import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { recordCollectDoc } from '../dist/write/collect.js';
import { SCENES, sceneFor } from '../dist/write/scene.js';
import { sceneInstallment } from '../dist/write/scene-installment.js';
import { sceneCollect } from '../dist/write/scene-collect.js';
import { resolve } from '../../base-entries/dist/index.js';
import { money2 } from '../dist/write/summaryRow.js';
import { SKILL_BILL_CATALOG } from '../dist/entries/index.js';
import { billEnv } from './helpers/config-base.mjs';

const FIXTURE_TIME = '2026-09-14 12:00:00';

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist', 'cli', 'cmd_read.js');

function collectZh() {
  return recordCollectDoc({
    key: 'bill.record.add',
    params: { kind: 'installment' },
    slots: [],
    missing: [],
    source: 'test',
    actionAt: '2026-09-14 12:00:00',
    today: '2026-09-14',
    recent: [],
  });
}

function cli(db, args) {
  return spawnSync(process.execPath, [bin, ...args], { cwd: here, encoding: 'utf8', env: billEnv(db) });
}

describe('#1204 记分期首迁：词条＋语言链', () => {
  it('词条 zh／en 同 key（166 条＝124 既有＋42 首切 #1206）且英文列无空串', () => {
    const zhKeys = Object.keys(SKILL_BILL_CATALOG.zh).sort();
    const enKeys = Object.keys(SKILL_BILL_CATALOG.en).sort();
    assert.deepEqual(enKeys, zhKeys);
    assert.equal(zhKeys.length, 166);
    for (const k of enKeys) assert.ok(SKILL_BILL_CATALOG.en[k].length > 0, '英文缺译：' + k);
  });

  it('工厂函数按语言取值（直连字段的抽查）：family 中英各一', () => {
    assert.equal(sceneInstallment('zh').family, '特殊收支族');
    assert.equal(sceneInstallment('en').family, 'Special income and expense');
    assert.equal(sceneInstallment().family, '特殊收支族');
  });

  it('落点表 16 行不动：默认取件仍是表里那一行静态件，en 现算', () => {
    const row = SCENES.find((s) => s.kind === 'installment');
    assert.equal(SCENES.length, 16);
    assert.strictEqual(sceneFor({ key: 'bill.record.add', kind: 'installment' }), row);
    const enScene = sceneFor({ key: 'bill.record.add', kind: 'installment' }, 'en');
    assert.equal(enScene.family, 'Special income and expense');
    assert.equal(enScene.kind, 'installment');
  });

  it('默认中文页可渲染（含分期三格中文名 tracer）', () => {
    const html = collectZh();
    assert.ok(html.includes('总额'), '中文页应有「总额」');
  });

  it('CLI 链路：--language zh／en 都 exit 0（英文页整页随 SAY／票据纸票）', () => {
    const db = mkdtempSync(join(tmpdir(), 'bill1204-'));
    const base = ['bill.record.add', '--params', JSON.stringify({ kind: 'installment' })];
    const zh = cli(db, base);
    assert.equal(zh.status, 0, 'zh stderr: ' + zh.stderr);
    const en = cli(db, [...base, '--language', 'en']);
    assert.equal(en.status, 0, 'en stderr: ' + en.stderr);
    const bad = cli(db, [...base, '--language', 'zz']);
    assert.notEqual(bad.status, 0, '未识别语言应非 0');
  });
});

describe('#1204 回执纸迁移：词条＋整句化', () => {
  let receiptPaper;
  before(async () => {
    ({ receiptPaper } = await import('../dist/write/receiptPaper.js'));
  });

  function receiptInput(kind, language) {
    return {
      key: 'bill.record.add',
      params: { kind, category: '餐饮', amount: -12.5, time: FIXTURE_TIME },
      receipt: {
        op: 'add', recordId: 7, summary: 'test', affectedRows: 1,
        writtenFields: ['category'], noChange: false, source: 'test', actionAt: FIXTURE_TIME,
      },
      writtenDetail: 'test',
      detail: [],
      facts: { amount: -12.5, category: '餐饮', account: '现金', ledger: '生活', time: FIXTURE_TIME },
      recent: [],
      word: '记支出',
      kind,
      ...(language === undefined ? {} : { language }),
    };
  }

  it('默认中文回执：结论标题与核对行沿用旧字面', () => {
    const html = receiptPaper(receiptInput('expense', undefined));
    assert.ok(html.includes('记好了：支出 12.50'), '结论标题应为整句');
    assert.ok(html.includes('编号 7 ／ 异常：无'), '核对行应为整句');
    assert.ok(html.includes('已经记好，不用再操作。'), '纸注应存在');
  });

  it('en 回执：结论与核对走英文整句', () => {
    const html = receiptPaper(receiptInput('expense', 'en'));
    assert.ok(html.includes('Recorded: Expense 12.50'), '英文结论标题应为整句');
    assert.ok(html.includes('No. 7 / exceptions: none'), '英文核对行应为整句');
    assert.ok(!html.includes('记好了：支出'), '英文页不许留中文结论句');
  });

  it('无金额与无编号分支走第二整句', () => {
    const noAmount = receiptInput('batch', undefined);
    const html = receiptPaper(noAmount);
    assert.ok(html.includes('这一批记好了'), '批量整句标题');
  });
});

describe('#1204 记收回迁移：词条＋语言链', () => {
  function collectInput(extraParams, recent) {
    return {
      key: 'bill.record.add',
      params: { kind: 'collect', ...extraParams },
      slots: [],
      missing: [],
      source: 'test',
      actionAt: '2026-09-14 12:00:00',
      today: '2026-09-14',
      recent: recent ?? [],
    };
  }

  it('工厂函数按语言取值：family 复用记分期 key，中英各一', () => {
    assert.equal(sceneCollect('zh').family, '特殊收支族');
    assert.equal(sceneCollect('en').family, 'Special income and expense');
    assert.equal(sceneCollect().family, '特殊收支族');
  });

  it('落点表 16 行不动：默认取件仍是表里那一行静态件，en 现算', () => {
    const row = SCENES.find((s) => s.kind === 'collect');
    assert.equal(SCENES.length, 16);
    assert.strictEqual(sceneFor({ key: 'bill.record.add', kind: 'collect' }), row);
    const enScene = sceneFor({ key: 'bill.record.add', kind: 'collect' }, 'en');
    assert.equal(enScene.family, 'Special income and expense');
    assert.equal(enScene.kind, 'collect');
  });

  // 口径 honesty：记收回采集页在线走 SAY 原型（sayWords.ts），本件迁入的 FlowSpec
  // 函数（chips／cards／prompt 整句）是 dormant（回退分支才跑，同记分期死 receipt.*）。
  // 默认页断言只钉 SAY 烟雾；整句拼装逐字节 fidelity 在词条层直连断言。
  it('默认中文页可渲染（SAY 烟雾）：源标签与分类选项沿用旧字面', () => {
    const html = recordCollectDoc(collectInput({}, []));
    assert.ok(html.includes('借出记录编号'), '中文页应有源标签');
    assert.ok(html.includes('借贷/收回'), '中文页应有分类选项（用户数据原样）');
  });

  it('全键可求值：47 键中英模板占位齐备、无空串（缺参即抛 MissingParamError）', () => {
    const samples = {
      tag: '#未还', tagUnpaid: '#未还', tagPaid: '#已还', tagCollect: '#收回', tagLend: '#借出',
      crumb: '借贷 › 收回', source: '#7　借贷/借出　-500.00　2026-09-10 12:00:00', sourceId: 7, id: 7,
      category: '借贷/收回', amount: '+500.00', time: '2026-09-10 12:00:00',
      account: '现金', ledger: '生活', wakeWord: '记收回', count: 1, missing: '近期记录里没读到',
    };
    const keys = Object.keys(SKILL_BILL_CATALOG.zh).filter((k) => k.startsWith('scene-collect.'));
    assert.equal(keys.length, 47);
    for (const k of keys) {
      const names = [...SKILL_BILL_CATALOG.zh[k].matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g)].map((m) => m[1]);
      const params = Object.fromEntries(names.map((n) => [n, samples[n]]));
      const zh = resolve(SKILL_BILL_CATALOG, 'zh', k, params);
      const en = resolve(SKILL_BILL_CATALOG, 'en', k, params);
      assert.ok(zh.length > 0, 'zh 空串：' + k);
      assert.ok(en.length > 0, 'en 空串：' + k);
    }
  });

  it('整句拼装与 HEAD 逐字节一致（含用户数据标签原样）', () => {
    const tags = { tagUnpaid: '#未还', tagPaid: '#已还', tagCollect: '#收回' };
    assert.equal(
      resolve(SKILL_BILL_CATALOG, 'zh', 'scene-collect.source.why', { tag: '#未还' }),
      '没给：收回要指名销哪一笔的 #未还，不拿最近一笔顶替',
    );
    assert.equal(
      resolve(SKILL_BILL_CATALOG, 'zh', 'scene-collect.flow.third.note.done', { id: 7, ...tags }),
      '原记录 #7 的 #未还 换成 #已还，金额不动。这一笔补 #收回。',
    );
    assert.equal(money2(500), '+500.00');
    assert.equal(money2(-500), '-500.00');
    const body = resolve(SKILL_BILL_CATALOG, 'zh', 'scene-collect.prompt.body', {
      wakeWord: '记收回',
      source: '#7　借贷/借出　' + money2(-500) + '　2026-09-10 12:00:00',
      amount: money2(500),
      category: '借贷/收回',
      account: '现金',
      ledger: '生活',
      sourceId: 7,
      ...tags,
    });
    assert.equal(
      body,
      '\n请加载「饼干记账」技能，帮我记一笔收回。\n唤醒词：记收回\n借出记录：#7　借贷/借出　-500.00　2026-09-10 12:00:00\n收回金额：+500.00　收入记正数\n分类：借贷/收回\n账户：现金\n账本：生活\n请办两件：\n① 记一笔收入，分类「借贷/收回」，备注写「#收回 原记录 #7」\n② 原记录 #7 的备注把 #未还 换成 #已还，金额不动',
    );
  });

  it('en 整句抽查：标题走英文，标签用户数据保持中文（诚实形态）', () => {
    assert.equal(
      resolve(SKILL_BILL_CATALOG, 'en', 'scene-collect.prompt.label', {}),
      'Write both entries as stated, tap to copy',
    );
    assert.equal(
      resolve(SKILL_BILL_CATALOG, 'en', 'scene-collect.chips.swap', { tagUnpaid: '#未还', tagPaid: '#已还' }),
      'Original entry: #未还 becomes #已还',
    );
  });
});
