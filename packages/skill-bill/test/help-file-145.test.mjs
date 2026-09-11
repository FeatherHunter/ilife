// #145 · 渲染接线锁：内容资产 → 共享壳全页 HTML（5 键 ＋ 三块可选键，全部可复现）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildHelpFileData, renderHelpFileHtml, HELP_FILE_STEM, HELP_FILE_TITLE } from '../dist/index.js';
import { WAKE_GROUPS, WAKE_ASSETS, SCENE_BY_ID, HELP_WAKE_WORDS } from '../dist/triggers/wake-assets.js';

const NOW = new Date(2026, 8, 11, 14, 30, 15); // 本地时间 2026-09-11 14:30:15
const DATA_OPEN = '<script id="help-data" type="application/json">';

/** 从渲染产物里取回 payload（壳内 JSON，逐键核对用）。 */
function payloadOf(html) {
  const at = html.indexOf(DATA_OPEN);
  assert.ok(at > 0, 'HTML 缺 help-data 锚点');
  const end = html.indexOf('</script>', at);
  return JSON.parse(html.slice(at + DATA_OPEN.length, end));
}
const docTitleOf = (html) => (html.match(/<title>([^<]*)<\/title>/) || [])[1];

describe('#145 饼干记账 HELP 渲染接线', () => {
  it('全壳 HTML：标题不重复技能名 ＋ 7 域／74 场景都在', () => {
    const html = renderHelpFileHtml(buildHelpFileData(NOW));
    assert.equal(docTitleOf(html), '饼干记账 · 使用手册(HELP)');
    assert.ok(html.startsWith('<!DOCTYPE html>'), '整页（壳前缀）');
    const data = payloadOf(html);
    assert.equal(data.groups.length, 7);
    assert.equal(data.groups.flatMap((g) => g.subgroups.flatMap((s) => s.scenes)).length, 74);
    assert.deepEqual(data.groups, WAKE_GROUPS, 'groups 由内容资产直转（零改写）');
    assert.ok(html.includes('id="help-data"') && html.includes('ilife-help-shell') === false, '壳标记来自共享模板，不自造');
  });

  it('5 键取值照老实样；subtitle 由计数派生（不写死 7／74）', () => {
    const data = buildHelpFileData(NOW);
    assert.equal(data.skill_name, '饼干记账');
    assert.equal(data.title, HELP_FILE_TITLE);
    assert.equal(data.subtitle, `${WAKE_GROUPS.length} 功能域 · ${WAKE_ASSETS.length} 场景 · 版本 2.0 · 更新于 2026-09-11 14:30`);
    assert.equal(data.subtitle, `7 功能域 · 74 场景 · 版本 2.0 · 更新于 2026-09-11 14:30`);
    assert.equal(data.contact.items.length, 3);
    assert.deepEqual(data.contact.items.map((i) => i.label), ['邮箱', 'GitHub', 'Issues']);
    assert.equal(data.contact.items[1].url, true);
    assert.equal(data.contact.copy_all, true);
    assert.ok(HELP_FILE_STEM.endsWith('_HELP'));
  });

  it('三块可选键照传：meta_blocks 两块（派生）＋ version ＋ init_banner', () => {
    const data = buildHelpFileData(NOW);
    assert.deepEqual(data.meta_blocks.map((m) => [m.id, m.title]), [['help_summary', 'HELP 汇总'], ['help_wake_words', 'HELP 唤醒词']]);
    assert.equal(data.meta_blocks[0].html, '<p>' + data.subtitle + '</p>', '汇总块与 subtitle 同源（不写第二份计数）');
    assert.equal(data.meta_blocks[1].html, '<p>' + HELP_WAKE_WORDS.join(' / ') + '</p>', '唤醒词块由口径层派生');
    assert.equal(data.version, '2.0');
    assert.equal(data.init_banner.hidden, false, '未初始化 ⇒ 横幅照显');
    assert.equal(data.init_banner.closable, true);
    assert.equal(data.init_banner.prompt, SCENE_BY_ID['setup_init_wizard'].prompt_template, '横幅 prompt 取自初始化场景（单源）');
    assert.ok(data.init_banner.title.includes('第一次用饼干记账'));
  });

  it('init_banner 状态驱动：已初始化 ⇒ hidden（键仍在，键集不随状态变）', () => {
    const fresh = buildHelpFileData(NOW, { initialized: false });
    const ready = buildHelpFileData(NOW, { initialized: true });
    assert.equal(fresh.init_banner.hidden, false);
    assert.equal(ready.init_banner.hidden, true);
    assert.deepEqual(Object.keys(fresh), Object.keys(ready), '键集恒定（显隐走 hidden，不删键）');
    const html = renderHelpFileHtml(ready);
    const data = payloadOf(html);
    assert.equal(data.init_banner.hidden, true);
    assert.equal(data.subtitle, fresh.subtitle, '渲染内容与初始化状态无关（只有横幅显隐变）');
  });

  it('可复现：同一 now 两次渲染逐字节一致；坏 Date 即抛', () => {
    assert.equal(renderHelpFileHtml(buildHelpFileData(NOW)), renderHelpFileHtml(buildHelpFileData(NOW)));
    assert.throws(() => buildHelpFileData(new Date('nope')), /有效 Date/);
  });
});
