// 票 #679 自证回路：页头三件套（#12 起由 base 的 ActionGroup 渲染）；底部「作者的其他插件」卡与联系入口
// （#12 起改由 base 包渲染）。
//
// 咬三条，都不咬写法：
//   ① 页头三件套真的接上了 base 的 ActionGroup：胶囊组、联系/Star/Issue 三项的 aria 标签、banner 版本、
//      目标网址（本仓 repoUrl 与派生的 <repo>/issues）与三句悬停文案都必须在产物 dist/client.js 里；
//      本仓旧入口表 PANEL_LINKS 必须已从 dist/nav.js 撤干净——「删了本地表但没接上 base」要变红；
//   ② 底部卡与联系入口不再由本仓手抄：产物里必须带 base 包的横幅与通用件标记；
//   ③ 本仓那套旧文案（包名/描述）必须已经从产物里消失——「删了本地表但没接上 base」也要变红。
//      （所以本回路要先构建：node node_modules/typescript/bin/tsc -b packages/plugin-manager
//        ＋ 包内 tsdown。只改源码不重出产物 → ①②③ 会红，这是有意的。）
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLIENT = readFileSync(join(HERE, '..', 'dist', 'client.js'), 'utf8');
const NAV_JS = readFileSync(join(HERE, '..', 'dist', 'nav.js'), 'utf8');
const PKG = JSON.parse(readFileSync(join(HERE, '..', 'package.json'), 'utf8'));

/** base 包版本：banner 里烙的那个版本号必须与声明的精确版本一致（漂了就是没重新内联）。 */
const BASE_VERSION = PKG.devDependencies['dsh-featherhunter-plugin-base'];
const BASE_BANNER = '/*! dsh-featherhunter-plugin-base v' + BASE_VERSION + ' */';
/** 票 9：本仓内联的 base 版本必须正好是这次升级到的 0.1.1（升级没重建产物即变红）。 */
const EXPECTED_BASE_VERSION = '0.1.1';

/** base 0.1.1 页头三件套：胶囊组、三项 aria 标签、三句悬停文案与本仓地址（单一真源在 base 的 texts.ts）。 */
const REPO_URL = 'https://github.com/FeatherHunter/ilife';
const BASE_ACTION_CLASSES = [
  'dsh-base-actions dsh-base-actions--group',
  'dsh-base-icon-action',
  'dsh-base-contact-button',
];
const BASE_ACTION_LABELS = ['联系我们', 'Star 这个项目', '提交 Issue'];
const BASE_ACTION_TIPS = [
  '扫码加入交流群，反馈、建议、idea 都欢迎',
  '您的🌟是我夜空中最亮的星🌹',
  '任何功能需求、故障、建议、意见都可以提 ISSUE',
];

/** base 的 data/manifest.json 里四家的名字与描述（本仓不再维护第二份；self=ilife 被排除）。 */
const BASE_PLUGINS = [
  ['dsh-mattpocock-skills-deck', '近 30 万 star 的 mattpocock/skills 整套预置好（27 个技能），装好即用。'],
  ['dsh-prompt', '经常反复重复的模板化提示词，存成自定义模板，选中后直接注入，不再需要耗费精力。'],
  ['dsh-opencode-palette', '38 款 opencode 经典配色 + 20+自定义主题 一键换装 DSH。'],
  ['dsh-im-companion', '给 dsh-im 加了「助理」和「家」的概念。'],
];

/** 本仓 #679 时代手抄的旧文案：结论是删掉，产物里一个字都不许留。 */
const LOCAL_GONE = [
  '作者其他插件',
  '工程技能面板：装好就能在右侧直接用',
  '多款长时间编程护眼配色，一键换上',
  '常用提示模板随手点，不用来回复制粘贴',
  '聊天机器人的伴侣插件：扫码或填凭据就把飞书、微信等聊天接进来',
];

describe('票 #679 面板头部与底部（#12 后三件套与底部都交给 base 通用件）', () => {
  it('页头三件套走 base 的 ActionGroup：胶囊组、三枚控件、三句文案与版本都在产物里', () => {
    assert.equal(BASE_VERSION, EXPECTED_BASE_VERSION, 'base 依赖须精确升到 ' + EXPECTED_BASE_VERSION);
    assert.ok(CLIENT.includes(BASE_BANNER), '产物里没有 base 横幅（没内联 / 版本漂了）：' + BASE_BANNER);
    for (const cls of BASE_ACTION_CLASSES) {
      assert.ok(CLIENT.includes(cls), '产物里没有 base 三件套的样式/结构标记：' + cls);
    }
    // 组 aria-label：三件收进一枚胶囊（ActionGroup），不是三枚散装（ActionButtons）。
    assert.ok(CLIENT.includes('联系、Star 与 Issue'), '产物里没有三件套的组 aria-label');
    for (const label of BASE_ACTION_LABELS) {
      assert.ok(CLIENT.includes(label), '产物里没有三件套的 aria 标签：' + label);
    }
    for (const tip of BASE_ACTION_TIPS) {
      assert.ok(CLIENT.includes(tip), '产物里没有三件套的悬停文案：' + tip);
    }
    assert.ok(CLIENT.includes(REPO_URL), '产物里没有本仓 repoUrl：' + REPO_URL);
    assert.ok(CLIENT.includes('"/issues"'), 'Issue 目标须由 repoUrl 派生（<repo>/issues）');
  });

  it('本仓旧入口表已撤干净：nav 不再导出 PANEL_LINKS，产物里没有两枚旧图标的 path', () => {
    assert.ok(!NAV_JS.includes('PANEL_LINKS'), 'dist/nav.js 仍导出/残留 PANEL_LINKS');
    assert.ok(!CLIENT.includes('M12 2.6l2.9 6.1 6.6.8'), '产物里仍有旧星星 SVG path（图标应由 base 出）');
    assert.ok(!CLIENT.includes('M5 4h14a1 1 0 0 1 1 1v8'), '产物里仍有旧气泡 SVG path（图标应由 base 出）');
  });

  it('底部卡与联系入口改由 base 包渲染：产物里有横幅、通用件标记与 base 清单', () => {
    assert.ok(CLIENT.includes('作者的其他插件'), '产物里没有 base 卡标题「作者的其他插件」');
    assert.ok(CLIENT.includes('dsh-base-plugins'), '产物里没有 base 卡样式类标记 dsh-base-plugins');
    assert.ok(CLIENT.includes('dsh-base-contact-row'), '产物里没有 base 联系入口标记 dsh-base-contact-row');
    for (const [name, desc] of BASE_PLUGINS) {
      assert.ok(CLIENT.includes(name), '产物里没有 base 清单里的包名：' + name);
      assert.ok(CLIENT.includes(desc), '产物里没有 base 清单里的描述：' + name);
    }
  });

  it('本仓旧的「作者其他插件」表已撤干净（产物与 nav 导出都不许留）', () => {
    assert.ok(!NAV_JS.includes('MORE_PLUGINS'), 'dist/nav.js 仍导出 MORE_PLUGINS');
    for (const gone of LOCAL_GONE) {
      assert.ok(!CLIENT.includes(gone), '产物里仍有本仓旧文案：' + gone);
    }
  });
});
