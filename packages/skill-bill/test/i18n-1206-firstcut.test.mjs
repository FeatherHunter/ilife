// #1206 首切 7 件（write 批次 4 前锋：纯 copy 件）——词条层＋语言链的接线证明。
//
// 口径 honesty：7 件全是纯 copy（无拼接串，整句化 0 处）；其中 blockedFold 复用
// `installment.fold-title`、errorReceipt 缺省项复用 `installment.prompt-label-blocked`、
// scene-batch 的回执状态与读数行标签复用记分期那两个 key（同句只一处定义）；
// commands 两条例句 en 与 zh 同值（示例含可运行的中文样例数据，译了就跑不通）。
// 中文页逐字节不变由指纹门（t689）与快照门钉住，本件只证“链路不断＋中英各一”。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SKILL_BILL_CATALOG } from '../dist/entries/index.js';
import { receiptSourceNote, collectSourceNote } from '../dist/write/sourceNote.js';
import { collectBlockedFold } from '../dist/write/blockedFold.js';
import { errorReceipt } from '../dist/write/errorReceipt.js';
import { RECORD_COMMANDS, recordCommands } from '../dist/write/commands.js';
import { receiptStatusCard, reconcileDisclosure } from '../dist/write/receiptParts.js';
import { RECORD_SLOTS, recordSlots } from '../dist/write/slots.js';
import { SCENE as batchScene, sceneBatch } from '../dist/write/scene-batch.js';
import { sceneFor } from '../dist/write/scene.js';

describe('#1206 首切 7 件：词条＋语言链', () => {
  it('词条 zh／en 同 key（166 条＝124 既有＋42 首切）且英文列无空串', () => {
    const zhKeys = Object.keys(SKILL_BILL_CATALOG.zh).sort();
    const enKeys = Object.keys(SKILL_BILL_CATALOG.en).sort();
    assert.deepEqual(enKeys, zhKeys);
    assert.equal(zhKeys.length, 166);
    for (const k of enKeys) assert.ok(SKILL_BILL_CATALOG.en[k].length > 0, '英文缺译：' + k);
  });

  it('sourceNote 按语言取值（不给＝zh，与改造前逐字相同）', () => {
    assert.equal(receiptSourceNote('2026-09-14 12:00:00', 1), receiptSourceNote('2026-09-14 12:00:00', 1, 'zh'));
    assert.ok(receiptSourceNote('2026-09-14 12:00:00', 1).includes('记账库（写入）'));
    assert.ok(receiptSourceNote('2026-09-14 12:00:00', 1, 'en').includes('Accounting ledger (write)'));
    assert.ok(collectSourceNote('2026-09-14 12:00:00').includes('记账库（只读）'));
    assert.ok(collectSourceNote('2026-09-14 12:00:00', 'en').includes('Accounting ledger (read-only)'));
  });

  it('blockedFold 标题复用 installment.fold-title，中英各一', () => {
    const items = [{ name: 'category', label: '分类', why: '要选到最细那一级' }];
    const zh = collectBlockedFold({ items, command: 'cmd' });
    const en = collectBlockedFold({ items, command: 'cmd', language: 'en' });
    assert.ok(zh.includes('还缺什么，以及补齐后照抄的那条'));
    assert.ok(en.includes(SKILL_BILL_CATALOG.en['installment.fold-title']));
    assert.equal(collectBlockedFold({ items: [], command: 'cmd' }), '');
  });

  it('errorReceipt 缺省 retryPrompt 复用，中英各一；空 message 照旧抛', () => {
    const zh = errorReceipt({ message: '单元事由' });
    const en = errorReceipt({ message: 'reason', language: 'en' });
    assert.ok(zh.includes('补齐后照这句跟助手说一遍'));
    assert.ok(en.includes(SKILL_BILL_CATALOG.en['installment.prompt-label-blocked']));
    assert.throws(() => errorReceipt({ message: '  ' }), /message/);
  });

  it('commands 标题与例句按语言取值；例句 en 与 zh 同值；RECORD_COMMANDS＝recordCommands(zh)', () => {
    const zh = recordCommands('zh');
    const en = recordCommands('en');
    assert.equal(zh[0].title, '记一笔');
    assert.equal(zh[1].title, '改记录');
    assert.equal(en[0].title, 'Record an entry');
    assert.equal(en[1].title, 'Edit an entry');
    assert.equal(en[0].example, zh[0].example);
    assert.equal(en[1].example, zh[1].example);
    assert.deepEqual(RECORD_COMMANDS, recordCommands('zh'));
    assert.deepEqual(RECORD_COMMANDS, recordCommands());
  });

  it('receiptParts 状态卡与对账区按语言取值（不给＝zh）', () => {
    const receipt = { recordId: 7, actionAt: '2026-09-14 12:00:00', noChange: false };
    const zhCard = receiptStatusCard(receipt, '写进账单', 'zh');
    assert.equal(zhCard.label, '状态');
    assert.equal(zhCard.value, '已改动');
    const enCard = receiptStatusCard(receipt, 'written', 'en');
    assert.equal(enCard.label, 'Status');
    assert.equal(enCard.value, 'Changed');
    const zhNone = receiptStatusCard({ recordId: null, actionAt: 't', noChange: true }, 'x');
    assert.equal(zhNone.value, '无改动');
    assert.equal(zhNone.detail, '值与改前一致');
    const zhHtml = reconcileDisclosure(receipt);
    assert.ok(zhHtml.includes('对账信息') && zhHtml.includes('记录编号') && zhHtml.includes('写入时间'));
    const enHtml = reconcileDisclosure(receipt, 'en');
    assert.ok(enHtml.includes('Reconciliation') && enHtml.includes('Record ID') && enHtml.includes('Recorded at'));
    assert.ok(reconcileDisclosure({ recordId: null, actionAt: 't', noChange: true }).includes('还没有'));
  });

  it('slots 提示句按语言取值；RECORD_SLOTS＝recordSlots(zh)', () => {
    const zh = recordSlots('zh');
    const en = recordSlots('en');
    assert.equal(zh['bill.record.add'][0].hint, '要选到最细那一级，如「午餐」');
    assert.equal(en['bill.record.add'][0].hint, 'Pick the most specific level, e.g. "lunch"');
    assert.equal(zh['bill.record.update'][1].hint, '不填就改字段。撤销写 undo，恢复写 restore');
    assert.deepEqual(RECORD_SLOTS, recordSlots('zh'));
    assert.deepEqual(RECORD_SLOTS, recordSlots());
  });

  it('sceneBatch 工厂函数按语言取值；sceneFor batch/en 现算、缺省走静态件', () => {
    assert.equal(sceneBatch('zh').family, '批量与修正族');
    assert.equal(sceneBatch('en').family, 'Batch and correction');
    assert.equal(sceneBatch().family, '批量与修正族');
    assert.equal(batchScene.family, '批量与修正族');
    assert.equal(typeof batchScene.collect, 'function');
    assert.equal(typeof batchScene.receipt, 'function');
    assert.equal(sceneFor({ key: 'bill.record.add', kind: 'batch' }).family, '批量与修正族');
    assert.equal(sceneFor({ key: 'bill.record.add', kind: 'batch' }, 'en').family, 'Batch and correction');
  });
});
