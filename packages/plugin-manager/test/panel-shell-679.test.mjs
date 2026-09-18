// 票 #679 自证回路：右上角两个入口 ＋ 底部「作者其他插件」卡。
//
// 咬两条，都不咬写法：
//   ① 表里的文案与网址逐字（照用户截图；网址的来源见 docs/research/t674-plugin-package-facts.md）；
//   ② 两张表真的画进了产物 dist/client.js——「表在、组件没画」必须变红。
//      （所以本回路要先构建：node node_modules/typescript/bin/tsc -b packages/plugin-manager
//        ＋ 包内 tsdown。只改源码不重出产物 → ② 会红，这是有意的。）
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MORE_PLUGINS, PANEL_LINKS } from '../dist/nav.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLIENT = readFileSync(join(HERE, '..', 'dist', 'client.js'), 'utf8');

/** 四行文案（用户截图逐字；包名与仓库一一对应）。 */
const EXPECT_MORE = [
  ['dsh-mattpocock-skills-deck', '本面板自己：装好就有 25 个工程技能在右侧直接用'],
  ['dsh-opencode-palette', '34 款长时间编程护眼配色，一键换上'],
  ['dsh-prompt', '24 条常用提示模板随手点，不用来回复制粘贴'],
  ['dsh-im-companion', '聊天机器人的伴侣插件：扫码或填凭据就把飞书、微信等 9 路聊天接进来'],
];

describe('票 #679 面板头部与底部', () => {
  it('右上角两件：星去本仓、气泡去本仓开 issue；两件都带悬停说明与图标', () => {
    assert.equal(PANEL_LINKS.length, 2);
    const star = PANEL_LINKS.find((l) => l.key === 'star');
    const feedback = PANEL_LINKS.find((l) => l.key === 'feedback');
    assert.equal(star.url, 'https://github.com/FeatherHunter/ilife');
    assert.equal(feedback.url, 'https://github.com/FeatherHunter/ilife/issues/new');
    for (const link of PANEL_LINKS) {
      assert.ok(link.tip.length > 0, link.key + ' 缺悬停说明');
      assert.ok(link.glyph.length > 0, link.key + ' 缺图标');
    }
  });

  it('底部四行：包名与文案逐字照截图', () => {
    assert.deepEqual(
      MORE_PLUGINS.map((row) => [row.pkg, row.desc]),
      EXPECT_MORE,
    );
  });

  it('四行外链各指对应仓库（作者名下、与包名同名）', () => {
    for (const row of MORE_PLUGINS) {
      assert.equal(row.url, 'https://github.com/FeatherHunter/' + row.pkg, row.pkg + ' 的外链不对');
    }
  });

  it('两张表都真的画进了产物（改坏一处即红）', () => {
    for (const link of PANEL_LINKS) {
      assert.ok(CLIENT.includes(link.url), '产物里没有入口网址：' + link.key + ' ' + link.url);
      assert.ok(CLIENT.includes(link.tip), '产物里没有悬停说明：' + link.tip);
    }
    assert.ok(CLIENT.includes('作者其他插件'), '产物里没有卡片标题「作者其他插件」');
    for (const row of MORE_PLUGINS) {
      for (const part of [row.pkg, row.desc, row.url]) {
        assert.ok(CLIENT.includes(part), '产物里没有这一行的内容：' + part);
      }
    }
  });
});
