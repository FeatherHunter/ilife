// 票 #986 第二半 · 面板侧失败出口 ＋ 按钮真因标题（不碰真机，只读产物与纯函数）。
//
// 咬三件事：
//   ① 目标表未就绪时两题头按钮禁用且 title 说明「还在读更新目标」（纯函数 headerButtonTitle）；
//   ② 取数失败时给出不依赖目标表的重试入口（源码与产物含 TargetsLoadError＋重试）；
//   ③ 重试入口的接线在产物里（face 暴露 retry，UpdateResults 引用重试）。
//
// 先构建再跑：`node node_modules/typescript/bin/tsc -b packages/plugin-manager`
//   `pnpm --filter dsh-life-pack run build:client`
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_DIR = join(HERE, '..');
const PANEL_SRC = readFileSync(join(PKG_DIR, 'src', 'update-panel.ts'), 'utf8');
const VIEW_SRC = readFileSync(join(PKG_DIR, 'src', 'update-view.ts'), 'utf8');
const CLIENT_BUNDLE = readFileSync(join(PKG_DIR, 'dist', 'client.js'), 'utf8');

const view = await import('../dist/update-view.js');
const { headerButtonTitle } = view;
const { reasonText } = await import('../dist/update-contract.js');

describe('#986 题头按钮：未就绪时禁用且说真因', () => {
  it('headerButtonTitle 存在且为函数（题头标题的唯一定义地）', () => {
    assert.equal(typeof headerButtonTitle, 'function', '缺题头标题纯函数：标题口径会散到两处');
  });

  it('目标表为空＋空闲：title 含「还在读更新目标」', () => {
    const title = headerButtonTitle({ blocked: false, empty: true });
    assert.match(String(title), /还在读更新目标/, '未就绪时要说真因，不许再说“它是做什么的”');
  });

  it('忙时 title 沿用 update-busy 原句（不抢真因那句）', () => {
    const busy = reasonText('update-busy');
    assert.equal(headerButtonTitle({ blocked: true, empty: true }), busy);
    assert.equal(headerButtonTitle({ blocked: true, empty: false }), busy);
  });

  it('目标表就绪＋空闲：title 回到动作说明，不含真因那句', () => {
    const title = headerButtonTitle({ blocked: false, empty: false, readyText: 'check-ready' });
    assert.ok(!/还在读更新目标/.test(String(title)), '就绪后不许再说还在读：' + title);
    assert.ok(String(title).length > 4, '就绪后的标题要是动作说明，不许空');
  });

  it('源码接线：面板题头引用该纯函数，不自己另写一套标题', () => {
    assert.match(VIEW_SRC, /headerButtonTitle/, '标题口径未收到 update-view.ts');
    assert.match(PANEL_SRC, /headerButtonTitle/, '面板题头未引用统一标题口径');
    assert.match(VIEW_SRC, /还在读更新目标/, '按钮真因标题未落口径文件');
  });
});

describe('#986 失败出口：不依赖目标表的重试入口', () => {
  it('源码接线：失败出口组件＋face.retry＋UpdateResults引用', () => {
    assert.match(PANEL_SRC, /TargetsLoadError/, '缺失败出口纯组件 TargetsLoadError');
    assert.match(PANEL_SRC, /retry/, 'face 未暴露 retry 重取入口');
    assert.match(PANEL_SRC, /onRetry/, '失败出口未接重试回调');
    assert.match(PANEL_SRC, /const retry = React\.useCallback\(\(\) => \{\s*void reload\(true\);/, 'retry 未重走 reload(true)：点了退避重试链跑不起来');
  });

  it('产物门：重试与真因标题进了浏览器束', () => {
    assert.ok(CLIENT_BUNDLE.includes('重试'), '产物里缺重试入口');
    assert.ok(CLIENT_BUNDLE.includes('还在读更新目标'), '产物里缺真因标题');
  });
});
