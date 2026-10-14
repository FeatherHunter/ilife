// #1274 · 守边界（条目 15）：技能包版本进关于页主行、关于页只印文件事实、模板不印代际、脱敏死代码已删。
// 本票只守条目 15（版本注入）；条目 10 的候选注入归 #1270、条目 24 的「设置当前配置」场景归 #1276。
//
// 三处判定锁（用户 2026-10-12／10-13 的口径）：
//  ① 关于页那个数答的是「用户装的这份技能是几版」⇒ 唯一真相源＝包自身 package.json 的 version（运行时现读，禁常量）；
//  ② 数据世代 v2.0 仍照老样印在主行前（用户认可），与包版本不同义；「HELP 模板 v4」这段字不上页（用户：意义不明）；
//  ③ 关于页只印这一页自己的生成时刻；复用窗口是调用方的策略参数、候选完整性是各技能自己的承诺，都不进共享模板。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildHelpFileData, renderHelpFileHtml, formatHelpMinute,
  SKILL_PACKAGE_VERSION, HELP_FILE_VERSION,
} from '../dist/render/index.js';
import * as paths from '../dist/fetch/paths.js';

const NOW = new Date(2026, 9, 13, 0, 41, 15); // 本地时间 2026-10-13 00:41:15
const PKG = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const DATA_OPEN = '<script id="help-data" type="application/json">';

/** 从渲染产物里取回 payload（壳内 JSON，逐键核对用）。 */
function payloadOf(html) {
  const at = html.indexOf(DATA_OPEN);
  assert.ok(at > 0, 'HTML 缺 help-data 锚点');
  const end = html.indexOf('</script>', at);
  return JSON.parse(html.slice(at + DATA_OPEN.length, end));
}

describe('#1274 条目 15 版本注入（甲）：包版本运行时现读，模板代际不上页', () => {
  it('技能包版本＝包清单 version（唯一真相源；不是第二份常量）', () => {
    assert.equal(SKILL_PACKAGE_VERSION, PKG.version);
  });

  it('数据世代与包版本是两个数：version 仍是 2.0，skill_version 是包版本', () => {
    const data = buildHelpFileData(NOW);
    assert.equal(HELP_FILE_VERSION, '2.0');
    assert.equal(data.version, '2.0');
    assert.equal(data.skill_version, PKG.version);
    assert.notEqual(data.skill_version, data.version);
  });

  it('关于页小字取本页自己的生成时刻（与 subtitle 同一 now）', () => {
    const data = buildHelpFileData(NOW);
    assert.equal(data.generated_at, formatHelpMinute(NOW));
    assert.equal(data.generated_at, '2026-10-13 00:41');
    assert.ok(data.subtitle.includes('更新于 2026-10-13 00:41'), 'subtitle 与 generated_at 同源');
  });

  it('载荷键集固定：about_meta 命名空间已撤回，改两个顶层键', () => {
    const data = buildHelpFileData(NOW);
    assert.deepEqual(Object.keys(data).sort(), [
      'contact', 'generated_at', 'groups', 'init_banner', 'meta_blocks',
      'skill_name', 'skill_version', 'subtitle', 'title', 'version',
    ]);
    assert.ok(!('about_meta' in data), 'about_meta 已撤回');
    assert.deepEqual(payloadOf(renderHelpFileHtml(data)), { ...data });
  });

  it('整页 HTML 里旧字样零残留（模板代际／快照行／无条件承诺／about_meta）', () => {
    const html = renderHelpFileHtml(buildHelpFileData(NOW));
    /* 「快照于」已从禁用名单移出（2026-10-15 用户裁定，会话 m01620）：#1277 起它是**候选面板顶部**那条快照
       说明；#1274 当年禁的是**关于页**那行。改用那条行自己的标识符来盯（比裸词更准，改措辞也逃不掉）：
       `91985dfc` 删掉的原行是 `var snapRow = (ABOUT_META && ABOUT_META.snapshot_at) ? …`，
       四处标识符 `snapRow`／`ABOUT_META`／`template_version`／`snapshot_at` 一个都不许回来。 */
    for (const gone of [
      'HELP 模板 v4', 'about_meta', '一天前的标签都在', 'reuse_hours', 'snapshot_note',
      'snapRow', 'ABOUT_META', 'template_version', 'snapshot_at',
    ]) {
      assert.ok(!html.includes(gone), '页上不得再出现：' + gone);
    }
  });

  it('整页 HTML 里新接线在场（壳读两个顶层键，主行＝数据世代＋技能包版本）', () => {
    const html = renderHelpFileHtml(buildHelpFileData(NOW));
    assert.ok(html.includes('HELP.skill_version'), '壳须从 HELP 取 skill_version');
    assert.ok(html.includes('HELP.generated_at'), '壳须从 HELP 取 generated_at');
    assert.ok(html.includes('本页数据生成于 '), '壳须印本页生成时刻');
    assert.ok(html.includes("' · 技能 v'"), '主行须在包版本在场时印「技能 v…」');
    assert.ok(html.includes('"skill_version":"' + PKG.version + '"'), '载荷里的包版本＝包清单版本');
  });
});

describe('#1274 边界：本机路径脱敏作废（用户 2026-10-12 裁定「路径不能脱敏」）', () => {
  it('脱敏函数已从 fetch/paths 删除（此前无任何生产调用方＝死代码）', () => {
    assert.ok(!('desensitizeLocalPath' in paths), 'paths 不得再导出 desensitizeLocalPath');
  });

  it('HELP 载荷里没有路径类字段（这条边界＝「不印」，不是「印脱敏后的」）', () => {
    const html = renderHelpFileHtml(buildHelpFileData(NOW));
    const json = JSON.stringify(payloadOf(html));
    assert.ok(!/[A-Za-z]:\\/.test(json), '载荷不得含 Windows 本机绝对路径');
    assert.ok(!/\/home\//.test(json), '载荷不得含 home 用户目录');
    assert.ok(!/\/Users\//.test(json), '载荷不得含 macOS 用户目录');
    assert.ok(!json.includes('****'), '载荷不得含脱敏掩码');
  });
});
