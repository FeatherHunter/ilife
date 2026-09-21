/** #848 · 册子冻结的定义级自检（单缝：只查行表自身，不碰墙文件与产物字节）。
 *
 * 锁五条（全部是外部行为口径的字面复算，不是实现细节）：
 *  ① 34 格＝30 结果页＋4 过程页；seq 1–34 连续；
 *  ② 34 个主体两两不同（撞名按构造不可能）；
 *  ③ 30 个场景 id 与 HELP 官方源逐字对齐（30 场景全在、无多余）；
 *  ④ 族计数 19／9／2／4 复算一致；
 *  ⑤ 命名规则：28 条主体等于唤醒词原样（唯一撞名对除外），4 过程页均带向导后缀。
 *
 * 不查：墙前缀匹配（归 #825）、样式实现（归 #849／#851）、域端到端与终审（出本票范围）。
 *
 * 跑法：node node_modules/typescript/bin/tsc -b packages/skill-memo-ilife
 *       node --test packages/skill-memo-ilife/test/booklet-848.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BOOKLET_ROWS, BOOKLET_FAMILIES, BOOKLET_SHARED_PIECE, bookletFileStem } from '../dist/help/booklet.js';
import { MEMO_HELP_MEMO } from '../dist/help/scenes/memo.js';
import { MEMO_HELP_SEARCH } from '../dist/help/scenes/search.js';
import { MEMO_HELP_REMIND } from '../dist/help/scenes/remind.js';
import { MEMO_HELP_WISH } from '../dist/help/scenes/wish.js';
import { MEMO_HELP_CHECKIN } from '../dist/help/scenes/checkin.js';
import { MEMO_HELP_MOOD } from '../dist/help/scenes/mood.js';
import { MEMO_HELP_SYNC } from '../dist/help/scenes/sync.js';
import { MEMO_HELP_INIT } from '../dist/help/scenes/init.js';

function allScenes() {
  const groups = [MEMO_HELP_MEMO, MEMO_HELP_SEARCH, MEMO_HELP_REMIND, MEMO_HELP_WISH, MEMO_HELP_CHECKIN, MEMO_HELP_MOOD, MEMO_HELP_SYNC, MEMO_HELP_INIT];
  const out = [];
  for (const g of groups) for (const sg of g.subgroups) for (const s of sg.scenes) out.push(s);
  return out;
}

describe('#848 册子冻结定义级自检', () => {
  it('① 34 格＝30 结果页＋4 过程页，seq 连续', () => {
    assert.equal(BOOKLET_ROWS.length, 34);
    assert.deepEqual(BOOKLET_ROWS.map((r) => r.seq), Array.from({ length: 34 }, (_, i) => i + 1));
    assert.equal(BOOKLET_ROWS.filter((r) => r.kind === '结果页').length, 30);
    assert.equal(BOOKLET_ROWS.filter((r) => r.kind === '过程页').length, 4);
  });

  it('② 34 个主体两两不同', () => {
    const files = BOOKLET_ROWS.map((r) => r.file);
    assert.equal(new Set(files).size, 34);
  });

  it('③ 30 场景 id 与 HELP 官方源逐字对齐', () => {
    const scenes = allScenes();
    assert.equal(scenes.length, 30);
    const sceneIds = new Set(scenes.map((s) => s.id));
    const resultIds = new Set(BOOKLET_ROWS.filter((r) => r.kind === '结果页').map((r) => r.sceneId));
    assert.equal(resultIds.size, 30);
    for (const id of resultIds) assert.ok(sceneIds.has(id), '册子有多余场景：' + id);
    for (const id of sceneIds) assert.ok(resultIds.has(id), '册子漏场景：' + id);
  });

  it('④ 族计数 19／9／2／4 复算一致', () => {
    const count = (f) => BOOKLET_ROWS.filter((r) => r.family === f).length;
    assert.equal(count('通用回执'), 19);
    assert.equal(count('列表查询'), 9);
    assert.equal(count('报告'), 2);
    assert.equal(count('向导'), 4);
    assert.deepEqual(BOOKLET_FAMILIES.map((f) => f.cells), [19, 9, 2, 4]);
    assert.equal(BOOKLET_SHARED_PIECE.name, '复制区按钮排加说明行');
  });

  it('⑤ 命名规则：28 原样＋撞名对后缀＋4 向导后缀', () => {
    const byScene = new Map(allScenes().map((s) => [s.id, s.wake_word]));
    for (const r of BOOKLET_ROWS.filter((x) => x.kind === '结果页')) {
      if (r.sceneId === 'memo_batch_change_category') {
        assert.equal(r.file, '备忘改分类-批量');
        continue;
      }
      assert.equal(r.file, byScene.get(r.sceneId));
    }
    const wizardFiles = BOOKLET_ROWS.filter((r) => r.kind === '过程页').map((r) => r.file);
    assert.deepEqual(wizardFiles, ['备忘改分类-批量-向导', '完成心愿-向导', '心愿排期-向导', '首次使用-向导']);
    assert.equal(bookletFileStem('memo_search_keyword'), '搜备忘');
    assert.equal(bookletFileStem('memo_batch_change_category'), '备忘改分类-批量');
    assert.equal(bookletFileStem('memo_batch_change_category', '过程页'), '备忘改分类-批量-向导');
  });
});
