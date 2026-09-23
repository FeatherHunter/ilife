/** 身材照HELP（HELP 一级分组「身材照片」下一级）：`calorie.help.center` 读命令。
 *
 * #139 · 本键**只出一种产物**：老实物同款 V4 三级目录 HELP 文件（`卡路里_HELP_<TS>.html`，
 * 与老技能同名同视觉）——地图目的地①②就落在这一支。
 *
 * **速查台下线（用户 2026-09-24 裁定）**：逐字「不存在速查台这种实际场景 这是多余的，我们只有 HELP HTML」。
 * 于是 #88 那套**显式 `mode` 的三态速查台**（`file`／`inline`／`text`，落 `卡路里_速查台_<TS>.html`）
 * 整支下线：`mode` 进来即 exit 2（照 #652 下线 `q` 支的先例，报文里给指路），装配件（三态壳落地、
 * 「看板页入口」「新词别名」两块）与它读的 6 件 `templates/*.html` 随之下线；取数面独立成 `helpScene.ts`
 * 留给这一份 HELP 文件。历史证据件（#88／#91／#106／#107／#471）原样留档，不回改。
 *
 * `q`／`keyword` 支（照片 10 键现找）同样已下线（#652），进来即 exit 2 指路 `calorie.help.lookup`。
 * 本件与同目录 `wizard.ts`／`gallery.ts` 等一样是纯搬迁：`case` 与局部函数 `helpSceneIndex`
 * 逐字搬自旧分派层 `cli/cmd_read.ts`（#314，行为不变），只换了住处。
 */
import { join } from 'node:path';
import { resolveDbDir } from '../paths.js';
import { buildHelpSceneData } from './helpScene.js';
import { HELP_FILE_STEM, buildHelpFileData, renderHelpFileHtml } from './helpFile.js';
import { HELP_HTML_DIR_NAME } from './helpPaths.js';
import { fail, optStr } from '../shared/params.js';
import type { ViewOut } from '../shared/commandSpec.js';

/** HELP 的信封载荷：**10 分组索引**（不把整份产物塞进 envelope）。
 *
 *  `items` 恒为 10 条分组（`total` = `items.length`，与 `list` 形语义一致）；
 *  `sceneTotal`／`subgroupTotal` 把「437 场景／54 子功能」如实回传，避免只报 10 丢掉全量口径。
 */
function helpSceneIndex(data: ReturnType<typeof buildHelpSceneData>): {
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

/** `calorie.help.center` · 身材照HELP：**只有缺省这一支**（＝V4 HELP 文件）；
 *  `q` 与 `mode` 两支均已下线，进来即 exit 2 并指路（见件头）。 */
export function viewPhotoHelpCenter(params: Record<string, unknown>): ViewOut {
  const q = optStr(params, 'q') ?? optStr(params, 'keyword') ?? undefined;
  if (q !== undefined) {
    // #652 删单：照片 HELP 现找（q 支）已下线，路由入口词保留指路（order 17／68 不动）。
    fail(2, '照片 HELP 现找（q 支）已下线：请用 calorie.help.lookup 查唤醒词（示例 q=记身材照）');
  }
  const mode = optStr(params, 'mode');
  if (mode !== undefined) {
    // 速查台删单：本技能只有一份 HELP HTML（见件头）。
    fail(2, '速查台（mode=' + mode + '）已下线：本技能只有一份 HELP HTML，'
      + '跑 `calorie-cmd-read calorie.help.center` 即得');
  }
  const now = new Date();
  // 缺省：老实物同款 HELP 文件（5 键 JSON → V4 三级目录壳）。落点走 `target`——本键的
  // <中文command>（注册表 title）另有其物，不能拿来命名这份产物。
  const html = renderHelpFileHtml(buildHelpFileData(now));
  const data: Record<string, unknown> = {
    ...helpSceneIndex(buildHelpSceneData()),
    mode: 'file' as const,
    bytes: Buffer.byteLength(html, 'utf8'),
  };
  return {
    data, html,
    target: { dir: join(resolveDbDir(), HELP_HTML_DIR_NAME), stem: HELP_FILE_STEM },
  };
}
