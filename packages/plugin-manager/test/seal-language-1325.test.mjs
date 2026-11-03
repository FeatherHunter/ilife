// 印章文案的语言来源（#1325）：读 DSH 客户端 locale 服务的活动语言 → 面板／卷轴／悬停气泡按语言取文案。
//
// 读法：本件不经渲染（渲染回路由 `seal-stamp.test.mjs`／`seal-scroll.test.mjs` 覆盖），只钉三件事：
// ① 语言归一（服务的两种公开读法、区域变体、缺席／抛错／未知一律回落中文）；
// ② 生成件按语言分列（中文列与 #1325 前逐字同）；③ 公开门 `dsh-life-pack/config-panel` 转出它。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SEAL_LANGUAGE, sealLanguageOf } from '../dist/seal-language.js';
import { CLOSE_LABEL_BY_LANG, SECTION_LABEL_BY_LANG, TIER_TEXT_BY_LANG } from '../dist/seal-vocabulary.generated.js';
import { sealTipOf } from '../dist/seal-stamp.js';
import { sealLanguageOf as fromGate } from '../dist/config-panel-api.js';

const faceOf = (active) => ({ getSnapshot: () => ({ active }) });

describe('sealLanguageOf：宿主语言归一', () => {
  it('zh／en 及其区域变体（大小写与空白归一）', () => {
    assert.equal(sealLanguageOf(faceOf('zh')), 'zh');
    assert.equal(sealLanguageOf(faceOf('en')), 'en');
    assert.equal(sealLanguageOf(faceOf('en-US')), 'en');
    assert.equal(sealLanguageOf(faceOf('zh-Hans')), 'zh');
    assert.equal(sealLanguageOf(faceOf(' EN ')), 'en');
  });
  it('未知语言回缺省（中文），不猜', () => {
    for (const active of ['ja', 'fr-FR', '', '  ']) assert.equal(sealLanguageOf(faceOf(active)), DEFAULT_SEAL_LANGUAGE, String(active));
  });
  it('服务缺席／形状不对／读法抛错都不阻断面板，回缺省', () => {
    assert.equal(sealLanguageOf(undefined), 'zh');
    assert.equal(sealLanguageOf(null), 'zh');
    assert.equal(sealLanguageOf({}), 'zh');
    assert.equal(sealLanguageOf(42), 'zh');
    assert.equal(sealLanguageOf({ getSnapshot: 'nope' }), 'zh');
    assert.equal(sealLanguageOf({ getSnapshot: () => null }), 'zh');
    assert.equal(sealLanguageOf({ getSnapshot: () => ({ active: 42 }) }), 'zh');
    assert.equal(sealLanguageOf({ getSnapshot: () => { throw new Error('boom'); } }), 'zh');
  });
  it('宿主的两种公开读法都认（getSnapshot 优先，其次 getLocale）', () => {
    assert.equal(sealLanguageOf({ getLocale: () => ({ active: 'en' }) }), 'en');
    assert.equal(sealLanguageOf({ getSnapshot: () => ({ active: 'zh' }), getLocale: () => ({ active: 'en' }) }), 'zh');
    // 快照里读不出 active（例如服务刚注册还没填）时回退 getLocale，而不是直接判中文。
    assert.equal(sealLanguageOf({ getSnapshot: () => ({}), getLocale: () => ({ active: 'en' }) }), 'en');
    assert.equal(sealLanguageOf({ getSnapshot: () => null, getLocale: () => 'en' }), 'en');
  });
  it('公开门 config-panel 转出的就是本件（六家只 import 那一门）', () => {
    assert.equal(fromGate, sealLanguageOf);
    assert.equal(DEFAULT_SEAL_LANGUAGE, 'zh');
  });
});

describe('印章文案按语言取（生成件）', () => {
  it('中文列与 #1325 前逐字同，英文列齐且不是中文', () => {
    assert.deepEqual(TIER_TEXT_BY_LANG.zh, { gold: '精雕细琢中', silver: '全场景打通中', copper: '基础建设中' });
    assert.deepEqual(SECTION_LABEL_BY_LANG.zh, { progress: '进展', status: '状态', plan: '计划' });
    assert.deepEqual(CLOSE_LABEL_BY_LANG.zh, '收卷');
    for (const tier of ['gold', 'silver', 'copper']) {
      const en = TIER_TEXT_BY_LANG.en[tier];
      assert.ok(typeof en === 'string' && en.length > 0, tier + ' 英文档位话不许空');
      assert.ok(en !== TIER_TEXT_BY_LANG.zh[tier], tier + ' 英文列不许照抄中文');
    }
    assert.equal(CLOSE_LABEL_BY_LANG.en, 'Close');
    for (const key of ['progress', 'status', 'plan']) assert.ok(SECTION_LABEL_BY_LANG.en[key].length > 0, key + ' 英文段标题不许空');
  });
  it('sealTipOf 缺省中文、language: en 取英文列', () => {
    assert.equal(sealTipOf('gold'), '精雕细琢中');
    assert.equal(sealTipOf('gold', 'en'), 'Fine polishing');
    assert.equal(sealTipOf('copper', 'en'), 'Under construction');
  });
});
