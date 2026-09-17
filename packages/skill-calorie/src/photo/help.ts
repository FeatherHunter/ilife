/** 身材照HELP（HELP 一级分组「身材照片」下一级）：`calorie.help.center` 读命令。
 *
 * #139 · 本键出**两种产物**，靠 `mode` 分流（旧地图口径「缺省＝速查台」已被 #131 新图准则覆盖：
 * Q2「整个卡路里只有一个 HELP」＋ Q17「比对以老实物为准」）：
 *   缺省（不给 `mode`）＝「卡路里help」的交付物：老实物同款 V4 三级目录 HELP 文件
 *     （`卡路里_HELP_<TS>.html`，与老技能同名同视觉——地图目的地①②就落在这一支）；
 *   显式 `mode`＝#88 全量速查台三态（`file`／`inline`／`text`，内容与语义逐字不变），
 *     落 `卡路里_速查台_<TS>.html`（与 HELP 文件分名，两份产物不撞车）。
 * D6：`mode` 不靠猜、不从别的参数推，非法值即 exit 2。
 * #652 删单：`q` 支（照片 10 键现找／全量）已下线——`q`／`keyword` 进来即 exit 2，指路
 * `calorie.help.lookup`；取数 `helpLookup.ts` 与装配 `helpDoc.ts` 系已删，路由入口词
 * （order 17 看身材照HELP／order 68 卡路里HELP）保留不动，跟来即见下线指路。
 * 本件与同目录 `wizard.ts`／`gallery.ts` 等一样是纯搬迁：`case` 与局部函数 `helpCenterIndex`
 * 逐字搬自旧分派层 `cli/cmd_read.ts`（#314，行为不变），只换了住处。
 */
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { resolveDbDir } from '../paths.js';
import { HELP_CENTER_MODES, buildHelpSceneData, renderHelpCenterHtml } from './helpCenter.js';
import type { HelpCenterMode } from './helpCenter.js';
import { HELP_FILE_STEM, buildHelpFileData, renderHelpFileHtml } from './helpFile.js';
import { HELP_HTML_DIR_NAME, SHEET_FILE_STEM } from './helpPaths.js';
import { fail, optStr } from '../shared/params.js';
import type { ViewOut } from '../shared/commandSpec.js';

/** #91 · 全量速查台的信封载荷：**10 分组索引**（不把 1 MB 产物塞进 envelope）。
 *
 *  `items` 恒为 10 条分组（`total` = `items.length`，与 `list` 形语义一致）；
 *  `sceneTotal`／`subgroupTotal` 把「436 场景／54 子功能」如实回传，避免只报 10 丢掉全量口径。
 */
function helpCenterIndex(data: ReturnType<typeof buildHelpSceneData>): {
  items: Record<string, unknown>[];
  total: number;
  sceneTotal: number;
  subgroupTotal: number;
} {
  let sceneTotal = 0;
  let subgroupTotal = 0;
  const items = data.groups.map((group) => {
    const sceneCount = group.subgroups.reduce((n, sub) => n + sub.scenes.length, 0);
    sceneTotal += sceneCount;
    subgroupTotal += group.subgroups.length;
    return {
      id: group.id,
      icon: typeof group.icon === 'string' ? group.icon : '',
      label: group.label,
      subgroupCount: group.subgroups.length,
      sceneCount,
    };
  });
  return { items, total: items.length, sceneTotal, subgroupTotal };
}

/** `calorie.help.center` · 身材照HELP：`mode`＝全量速查台三态；缺省＝V4 HELP 文件（`q` 支已下线，见件头）。 */
export function viewPhotoHelpCenter(params: Record<string, unknown>): ViewOut {
  const q = optStr(params, 'q') ?? optStr(params, 'keyword') ?? undefined;
  if (q !== undefined) {
    // #652 删单：照片 HELP 现找（q 支）已下线，路由入口词保留指路（order 17／68 不动）。
    fail(2, '照片 HELP 现找（q 支）已下线：请用 calorie.help.lookup 查唤醒词（示例 q=记身材照）');
  }
  const modeRaw = optStr(params, 'mode');
  const now = new Date();
  if (modeRaw === undefined) {
    // 缺省：老实物同款 HELP 文件（5 键 JSON → V4 三级目录壳）。落点走 `target`——本键的
    // <中文command>（注册表 title）另有其物，不能拿来命名这份产物。
    const html = renderHelpFileHtml(buildHelpFileData(now));
    const data: Record<string, unknown> = {
      ...helpCenterIndex(buildHelpSceneData()),
      mode: 'file' as const,
      bytes: Buffer.byteLength(html, 'utf8'),
    };
    return {
      data, html,
      target: { dir: join(resolveDbDir(), HELP_HTML_DIR_NAME), stem: HELP_FILE_STEM },
    };
  }
  // 全量速查台：须显式 `mode`；`text` 态把文本一并回传（file／inline 只回落点，不塞 1 MB）。
  const mode = modeRaw as HelpCenterMode;
  if (!(HELP_CENTER_MODES as readonly string[]).includes(mode)) {
    fail(2, '参数 mode 非法（' + String(mode) + '）：须为 ' + HELP_CENTER_MODES.join('／'));
  }
  const sceneData = buildHelpSceneData();
  const rendered = renderHelpCenterHtml({ mode, sceneData });
  const data: Record<string, unknown> = {
    ...helpCenterIndex(sceneData),
    mode,
    bytes: Buffer.byteLength(rendered.html, 'utf8'),
  };
  if (mode === 'text') data['text'] = rendered.html;
  // #83 · 渲染层已定文本交付：产物即文本（③ 文本态之一），交付装配层据此走文本通道。
  return {
    data, html: rendered.html, deliveryKind: mode === 'text' ? 'text' : 'html',
    target: { dir: join(resolveDbDir(), HELP_HTML_DIR_NAME), stem: SHEET_FILE_STEM },
  };
}
