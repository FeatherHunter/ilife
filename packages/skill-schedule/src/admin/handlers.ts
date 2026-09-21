/** 辅助与管理的处理函数（命令事实的执行一半；声明在 `./commands.ts`）。
 *
 * 逐字搬自 `src/cli/cmd_read.ts` 的 `dispatchHelp` 一家（行为零改动）：落盘意图只算不执行，
 * 出口凭返回的 `landing` 走统一管线；坏参抛同文案的类型错误（出口归 exit 2）。
 * 本键全程不开库（#203）：判定只看 DB 文件在不在。
 */
import { existsSync } from 'node:fs';
import { SchedulePolicyError, resolveDbDir, resolveDbPath } from '../fetch/index.js';
import { buildHelpLookup } from '../help/index.js';
import { resolveHelpDir } from '../help/helpPaths.js';
import { helpFileStem, buildHelpFileData, renderHelpFileHtml } from '../help/helpFile.js';
import { HELP_GROUPS } from '../help/scenes/help-assets.js';
import { assertHtmlSize, buildHelpItems } from '../render/index.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { helpReuseWindowOf } from 'base-paint/save-html';

const HELP_MODE_FILE = 'file' as const;

/** HELP 产物吃的复用窗口（毫秒）：缺省**一天**、`reuseHours` 可改（`0`＝每次都落新的）。
 *  坏参在这里抛类型错误，出口归「参数错」那一档（exit 2），与其余四家同档。 */
const helpWindowOrFail = helpReuseWindowOf((m) => {
  throw new SchedulePolicyError('POLICY_BAD_INPUT', m);
});

/** 初始化状态：DB **文件存在**＝已初始化（照老 `render_help._is_initialized`）。
 *  判定本身异常 ⇒ `false`＝横幅照显（fail-open）。 */
function helpInitialized(): boolean {
  try { return existsSync(resolveDbPath()); } catch { return false; }
}

/** 交付索引（`list` 形）：一级分组一行，计数全**派生**自内容资产（改资产即跟变）。 */
function buildHelpIndex() {
  const items = HELP_GROUPS.map((g) => ({
    id: g.id,
    icon: g.icon,
    label: g.label,
    subgroupCount: g.subgroups.length,
    sceneCount: g.subgroups.reduce((n, s) => n + s.scenes.length, 0),
  }));
  return {
    items,
    total: items.length,
    sceneTotal: items.reduce((n, it) => n + it.sceneCount, 0),
    subgroupTotal: items.reduce((n, it) => n + it.subgroupCount, 0),
  };
}

export function lookupHelp(params: Record<string, unknown>): ViewOut {
  const now = new Date();
  const q = params.q === undefined ? undefined : String(params.q);
  if (q !== undefined) {
    // 现找：只回命中，**按定义不落盘**（#843：`delivery:false` 显式表态，别与「忘了给 landing」混同）；
    // 要落盘只有用户显式给 `--html <路径>`（出口那支吃 `explicit`）。
    const all = buildHelpLookup().map((h) => ({ phrase: h.phrase, key: h.key, shape: h.shape, cli: h.cli, desc: h.desc }));
    return { data: { ...buildHelpItems(all, q), mode: 'lookup', query: q }, html: '', delivery: false };
  }
  // #245：HELP 产物吃复用窗口（缺省一天内只留一份，`reuseHours` 可改）。
  const reuseMs = helpWindowOrFail(params);
  const html = renderHelpFileHtml(buildHelpFileData(now, { initialized: helpInitialized() }));
  assertHtmlSize(html);
  return {
    data: { ...buildHelpIndex(), mode: HELP_MODE_FILE, bytes: Buffer.byteLength(html, 'utf8') },
    html,
    landing: { targetDir: resolveHelpDir(), stem: helpFileStem(), reuseMs },
  };
}
