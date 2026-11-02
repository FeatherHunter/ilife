/** #1201 · 帮助页壳的静态文案按语言输出（壳控件英文化，HELP 正文不动）。
 *
 *  四条断言（对应票面验收）：
 *   ① **中文产物逐字节不变**：中文／未进语言上下文时，本地化层原样返回，渲染结果＝原前缀＋标题＋JSON＋原后缀；
 *      且 `help-shell-136` 的 PREFIX／SUFFIX／fixture sha 常量与改造前提交逐字相同（该文件由生成器写死）。
 *   ② **英文产物 lang 正确**：`runWithLanguage('en', …)` 后文档首行是 `<html lang="en">`，全文无 `lang="zh-CN"`。
 *   ③ **壳控件真的换了词**：每条 `help-shell.*` 词条的 en 值都出现在产物里、zh 原字面量一条不剩
 *      （`【待开发】` 是与 HELP 数据逐字比对的数据位，按 KEEP_LITERALS 保留）；可见文本与可见属性里零中文。
 *   ④ **接线防漂移**：每条词条的 zh 值必须在模板（PREFIX∪SUFFIX）里真实存在——词条写错时这条先红，
 *      而不是等产物里悄悄少翻一句。
 *
 *  HELP 正文（技能注入的 5 键 JSON）按 #1235 仍为中文：本地化层只碰模板两段，不碰数据。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { runWithLanguage } from 'base-entries';
import {
  HELP_SHELL_DATA_OPEN,
  HELP_SHELL_PREFIX,
  HELP_SHELL_SUFFIX,
  HELP_SHELL_TITLE_SLOT,
  renderHelpShellHtml,
} from '../dist/helpShell.js';
import { localizeHelpShellTemplate } from '../dist/help-shell-i18n.js';
import { BASE_RENDER_CATALOG } from '../dist/entries/index.js';

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const KEEP = ["'【待开发】'"];

const FIXTURE = {
  skill_name: '卡路里',
  title: '唤醒词速查台',
  subtitle: '记一餐、看今日主页',
  contact: '联系作者',
  groups: [{ name: '饮食', items: [{ name: '记一餐', cmd: 'calorie.diet.add' }] }],
};

/** 表里 `help-shell.` 那一批：[key, zh, en]。 */
function entries() {
  const zh = BASE_RENDER_CATALOG.zh;
  const en = BASE_RENDER_CATALOG.en;
  return Object.keys(zh)
    .filter((key) => key.startsWith('help-shell.'))
    .map((key) => [key, zh[key], en[key]]);
}

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

/** 可见文本（<script>/<style> 之外的文本节点）＋ 可见属性值；注释先按等长空格抹掉。 */
function visibleStrings(html) {
  const blank = (m) => ' '.repeat(m.length);
  let text = html
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, blank);
  const out = [];
  for (const m of text.matchAll(/>([^<>]+)</g)) out.push(m[1]);
  for (const m of text.matchAll(/(?:placeholder|aria-label|title|alt)="([^"]*)"/g)) out.push(m[1]);
  return out;
}

describe('#1201 帮助页壳 · 静态文案按语言输出', () => {
  it('① 中文路径逐字节不变：本地化层原样返回，渲染＝原前缀＋标题＋JSON＋原后缀', () => {
    assert.equal(localizeHelpShellTemplate(HELP_SHELL_PREFIX), HELP_SHELL_PREFIX);
    assert.equal(localizeHelpShellTemplate(HELP_SHELL_SUFFIX), HELP_SHELL_SUFFIX);

    const title = '卡路里 · 唤醒词速查台';
    const json = JSON.stringify(FIXTURE).replace(/</g, '\\u003c');
    const expected = HELP_SHELL_PREFIX.split(HELP_SHELL_TITLE_SLOT).join(title) + json + HELP_SHELL_SUFFIX;
    assert.equal(renderHelpShellHtml(FIXTURE), expected);
    assert.ok(expected.startsWith('<!DOCTYPE html>\r\n<html lang="zh-CN">'));
    assert.equal(count(HELP_SHELL_PREFIX, HELP_SHELL_DATA_OPEN), 1, '数据槽恰一处');
  });

  it('② 英文路径：文档 lang=en，全文无 lang="zh-CN"', () => {
    const html = runWithLanguage('en', () => renderHelpShellHtml(FIXTURE));
    assert.ok(html.startsWith('<!DOCTYPE html>\r\n<html lang="en">'), html.slice(0, 60));
    assert.equal(html.includes('lang="zh-CN"'), false);
    assert.equal(count(html, '<html lang="en">'), 1);
  });

  it('③ 壳控件真的换了词：en 值全在、zh 原字面量不剩（数据位除外），可见文本零中文', () => {
    const rows = entries();
    assert.ok(rows.length > 100, 'help-shell 词条应有上百条，实为 ' + rows.length);

    const prefix = runWithLanguage('en', () => localizeHelpShellTemplate(HELP_SHELL_PREFIX));
    const suffix = runWithLanguage('en', () => localizeHelpShellTemplate(HELP_SHELL_SUFFIX));
    const whole = prefix + suffix;

    // ④ 接线防漂移：zh 值必须真实存在于模板里。
    for (const [key, zh] of rows) {
      assert.ok(count(HELP_SHELL_PREFIX + HELP_SHELL_SUFFIX, zh) > 0, key + ' 的 zh 值不在模板里：' + zh);
    }

    for (const [key, zh, en] of rows) {
      assert.equal(typeof en, 'string', key + ' 缺英文值');
      assert.ok(en.trim().length > 0, key + ' 英文值为空');
      assert.notEqual(en, zh, key + ' 英文值与中文相同');
      assert.ok(count(whole, en) > 0, key + ' 的英文没进产物：' + en);
      const keep = KEEP.some((literal) => literal.includes(zh));
      if (!keep) assert.equal(count(whole, zh), 0, key + ' 的中文原字面量还在：' + zh);
    }

    const leftover = visibleStrings(whole).filter((s) => CJK.test(s));
    assert.deepEqual(leftover, [], '可见文本里还有中文：' + leftover.slice(0, 5).join(' | '));
  });

  it('④ 数据位：HELP 正文（注入 JSON）仍是中文原文', () => {
    const html = runWithLanguage('en', () => renderHelpShellHtml(FIXTURE));
    const open = html.indexOf(HELP_SHELL_DATA_OPEN) + HELP_SHELL_DATA_OPEN.length;
    const close = html.indexOf('</script>', open);
    const json = html.slice(open, close).replace(/\\u003c/g, '<');
    assert.deepEqual(JSON.parse(json), FIXTURE);
  });
});
