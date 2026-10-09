// #1201 · help 壳与文档壳的语言注入点（node:test）。
//
// 覆盖（票面验收三条里的壳层部分）：
//   ① 同一页出 zh／en 两份产物；② 中文产物（缺席／空串／zh）逐字节不变
//     （含 `<html lang="zh-CN">`）；③ 英文产物 `lang` 属性正确，且除 `lang` 外与中文逐字节相同。
// 模板静态文案的词条化归各迁移票，本件只锁注入点（`documentLang` 唯一定义地）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { documentLang } from '../dist/contract.js';
import { renderDocShell } from '../dist/docShell.js';
import { renderHelpShell } from '../dist/help.js';

const ZH_OPEN = '<html lang="zh-CN">';
const EN_OPEN = '<html lang="en">';
const ASSETS = { sharedHelpersJs: '(function(){return 1;})();', sharedCssText: '.x{color:red}' };

function sceneData() {
  return {
    skill_name: '卡路里',
    title: '能力速查台',
    groups: [{
      id: 'g',
      label: '分组',
      subgroups: [{
        id: 's',
        label: '子组',
        scenes: [
          { id: 'skill.combo.key', title: '场景', wake_word: '查', status: '', prompt_template: '做 X' },
        ],
      }],
    }],
  };
}

function helpHtml(language) {
  const input = language === undefined
    ? { sceneData: sceneData(), assets: ASSETS }
    : { sceneData: sceneData(), assets: ASSETS, language };
  return renderHelpShell(input).html;
}

function docHtml(language) {
  const input = language === undefined
    ? { docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' }
    : { docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '', language };
  return renderDocShell(input);
}

describe('documentLang：文本语言 → 文档 lang（唯一定义地）', () => {
  it('未给／空串／中文一律 zh-CN；未知值回退 zh-CN（合法性由配置选择层判）', () => {
    assert.equal(documentLang(undefined), 'zh-CN');
    assert.equal(documentLang(''), 'zh-CN');
    assert.equal(documentLang('zh'), 'zh-CN');
    assert.equal(documentLang('ZH-CN'), 'zh-CN');
    assert.equal(documentLang('zz'), 'zh-CN');
    assert.equal(documentLang('ja'), 'zh-CN');
  });

  it('en 大小写不敏感，en-* 按 en 归并', () => {
    assert.equal(documentLang('en'), 'en');
    assert.equal(documentLang('EN'), 'en');
    assert.equal(documentLang(' en-US '), 'en');
  });
});

describe('renderHelpShell：同一页 zh／en 两份产物', () => {
  it('缺省含 zh lang；缺省／空串／zh 三份逐字节相同', () => {
    const def = helpHtml(undefined);
    assert.ok(def.includes(ZH_OPEN), '缺省必须含 ' + ZH_OPEN);
    assert.equal(helpHtml(''), def, '空串与缺省逐字节相同');
    assert.equal(helpHtml('zh'), def, 'zh 与缺省逐字节相同');
  });

  it('en 产物 lang 正确，且除 lang 外与中文逐字节相同', () => {
    const zh = helpHtml(undefined);
    const en = helpHtml('en');
    assert.ok(en.includes(EN_OPEN), '英文必须含 ' + EN_OPEN);
    assert.equal(en.split(EN_OPEN).join(ZH_OPEN), zh, 'en 除 lang 外必须与中文逐字节相同');
  });
});

describe('renderDocShell：同一页 zh／en 两份产物', () => {
  it('缺省含 zh lang；缺省／空串／zh 三份逐字节相同', () => {
    const def = docHtml(undefined);
    assert.ok(def.includes(ZH_OPEN), '缺省必须含 ' + ZH_OPEN);
    assert.equal(docHtml(''), def, '空串与缺省逐字节相同');
    assert.equal(docHtml('zh'), def, 'zh 与缺省逐字节相同');
  });

  it('en 产物 lang 正确，且除 lang 外与中文逐字节相同', () => {
    const zh = docHtml(undefined);
    const en = docHtml('en');
    assert.ok(en.includes(EN_OPEN), '英文必须含 ' + EN_OPEN);
    assert.equal(en.split(EN_OPEN).join(ZH_OPEN), zh, 'en 除 lang 外必须与中文逐字节相同');
  });
});
