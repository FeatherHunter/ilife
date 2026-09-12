/** #203 · 「作息管家help」的**命名与落点**（零 IO，只出初候选）。
 *
 * 归属＝结构裁定 `docs/skills/skill-schedule/t199-structure-verdict.md` §「消费共享 help 模板的技术路线」第 4 条：
 * 落盘另建管线 `help/helpPaths.ts` ＋ `help/output.ts`，照 bill 的 `render/helpPaths.ts` ＋ `output.ts`
 * 最小管线（#147 的裁决：**自持一份**，不上移公共层、不让技能之间互相依赖）。
 *
 * 老命名规则复刻（只读基线 `docs/skills/skill-schedule/t198-old-help-truth.md` 第四节）：
 *   - 目录 `<SKILLS_DB_PATH>/schedule_html/help/`（老 `scripts/help_render.py` 的落点，不存在则递归创建）；
 *   - 文件名主体 `作息管家_HELP`（`helpFile.ts:HELP_FILE_STEM`），通式
 *     `〈文件名主体〉_<YYYYMMDD>_<HHMMSS>[_<N>].html`；
 *   - 时间戳取**本地**时区秒（老 `strftime("%Y%m%d_%H%M%S")`），同名递补。
 *
 * 本模块只出**初候选**（零 IO）：最终名由 `output.ts:writeExclusiveWithRetry` 的 `wx` 独占＋`EEXIST` 递补仲裁
 * ——判存与写入之间没有独占性，check-then-write 并发同秒必交叉覆盖（#128 的因果，照抄不重演）。
 */
import { join, resolve } from 'node:path';

/** HELP 产物落点：`<SKILLS_DB_PATH>` 下的两级子目录（老实物两级逐字）。 */
export const HELP_HTML_DIR_PARTS = ['schedule_html', 'help'] as const;
/** 产物扩展名。 */
export const HELP_HTML_EXT = '.html' as const;

/** 老 `strftime("%Y%m%d_%H%M%S")` 等价物（本地时区，逐段零填充；非法 Date 即抛，缺失阻断不返空）。 */
export function formatHelpStamp(now: Date): string {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error('[skill-schedule] HELP 时间戳须为有效 Date（缺失阻断不返空）。');
  }
  const p = (n: number): string => String(n).padStart(2, '0');
  return String(now.getFullYear()) + p(now.getMonth() + 1) + p(now.getDate())
    + '_' + p(now.getHours()) + p(now.getMinutes()) + p(now.getSeconds());
}

/** 通式文件名 `〈文件名主体〉_<stamp>[_<n>].html`；主体原样拼入，不做清洗（老 `html_name` 同口径）。 */
export function buildHelpFileName(stem: string, date: Date, n?: number): string {
  if (typeof stem !== 'string' || stem.length === 0) {
    throw new Error('[skill-schedule] buildHelpFileName stem 须为非空字符串（缺失阻断不返空）。');
  }
  const stamp = formatHelpStamp(date);
  return n === undefined
    ? stem + '_' + stamp + HELP_HTML_EXT
    : stem + '_' + stamp + '_' + String(n) + HELP_HTML_EXT;
}

/** 通式落点**初候选**（绝对路径、零 IO）：`<dbDir>/schedule_html/help/〈主体〉_<stamp>.html`。
 *  目录不在此处建：写盘前由 `writeExclusiveWithRetry` 递归创建（老 `html_dir(mkdir=True)` 同效）。
 *  `dbDir` 照 `fetch/paths.ts:resolveDbDir` 的原样值收（可以是相对路径），由本函数 `resolve()` 归一成绝对路径。 */
export function resolveStemTarget(dbDir: string, stem: string, now: Date): string {
  return join(resolve(dbDir), ...HELP_HTML_DIR_PARTS, buildHelpFileName(stem, now));
}

/** 落点**目录**（绝对路径、零 IO，不建目录）：`<dbDir>/schedule_html/help/`。
 *  #245 起这是交付入口真正吃的东西——给「目录 ＋ 主体」而不是「带戳的初候选路径」，
 *  免得共用件把时间戳算两遍（`resolveStemTarget` 那份带戳名字只用于**初候选路径**的既有调用方）。 */
export function resolveHelpDir(dbDir: string): string {
  return join(resolve(dbDir), ...HELP_HTML_DIR_PARTS);
}
