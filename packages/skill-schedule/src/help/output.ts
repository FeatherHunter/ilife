/** #203 · HELP 产物的**唯一落盘点**（绝对路径回执；#245 起改用共用件 `saveHtmlFile`）。
 *
 * 归属＝结构裁定 `docs/skills/skill-schedule/t199-structure-verdict.md` §「消费共享 help 模板的技术路线」
 * 第 4 条：照 bill 的 `src/output.ts` 自持一份最小管线，只抄**需要的那一小块**。那一小块（命名通式 ＋
 * 独占创建 ＋ `EEXIST` 递补）**#237 起已收进共用件** `base-paint/save-html` 的 `saveHtmlFile`
 * （记账／卡路里／大厨三家同期改走它；备忘录侧走 `#240`）——本件若继续自持，就是**第 5 份同逻辑实现**，
 * 正是仓规铁律二禁止的「同一件事两份实现」。故本件只给**落点意图**（目录 ＋ 文件名主体），命名与落盘全交共用件。
 *
 * #128 的因果（照抄注释，别重演）：默认落点曾是「`readdirSync` 计数选名 → `writeFileSync`（`w` 覆盖）」
 * 两步，两步之间无独占性；多进程并发同秒都选同一路径 → 后写覆盖先写，用户按回执路径可能打开
 * 另一次调用的产物。修法（现住共用件）：`flag:'wx'` 独占创建，`EEXIST` 时递增 `_N` 重试（原子，无需锁）。
 *  - 串行语义不变：首选仍是 `helpPaths.resolveStemTarget` 的初候选，首试即中 → 文件名与老版逐字一致；
 *  - 并发下由文件系统仲裁：败者 `EEXIST` → `_N+1` 重试，保证每个回执路径的内容就是本次产物；
 *  - 大小写不敏感（Windows `normcase`）由 `wx` 天然覆盖：`.HTML` 占位同样 `EEXIST`；
 *  - **仅** `EEXIST` 重试，其余错误原样抛出（不把权限／路径错伪装成「换个名再写一次」）。
 *
 * #83 返修 R-1 的教训（同抄）：回执路径必须 `resolve()` 归一为**绝对路径**——`SKILLS_DB_PATH`
 * 本身可以是相对路径，产物已写盘却把相对串回传给调用方，下游按它打开就会找不到（或找到别处的同名文件）。
 * 共用件回执的 `path` 恒为绝对路径，这条由它保证（本件不再自己 `resolve`）。
 *
 * #245 · 复用窗口（`reuseMs`）：**给了就「窗口内已有同一主体的一份 ⇒ 返回它、不新建」**——这是
 * 「24 小时内只产出 1 个」那条口径的落点。判据在共用件里按**落盘名里的时间戳**算（不看 mtime：
 * mtime 会被复制／同步／touch 改掉），超龄那份不算命中 ⇒ 与未命中同路落一份新的（旧的留着当留档）。
 * 只对 `target` 那支生效：`explicit`（`--html <路径>`）是用户逐字指定的落点，共用件本身也不许
 * `file` ＋ `reuse` 同给（`EINVAL`）。
 *
 * 写失败**不静默降级**（本票面第 3 条）：照本包 `src/render/errors.ts` 的既有形状抛
 * `ScheduleRenderError`（`code` 取该类型已有的 `'SCHEDULE_HTML_TOO_LARGE'`＝「体积／落盘门」那一条，
 * 不新增错误类、不改既有导出面），由出口 `cmd_read.ts` 走 exit 5 ＋ stderr 回执。
 */
import { basename, dirname, join, resolve } from 'node:path';
import {
  saveHtmlFile, reuseWindowOfHours, HELP_REUSE_DEFAULT_HOURS, type HtmlReceipt,
} from 'base-paint/save-html';
import { ScheduleRenderError } from '../render/errors.js';

/** 落盘失败一律抛本包渲染层错误（`cause` 保留原始系统错，信息不丢）。 */
function writeFailed(path: string, e: unknown): never {
  if (e instanceof ScheduleRenderError) throw e;
  const code = (e as NodeJS.ErrnoException | undefined)?.code;
  const detail = (e as Error | undefined)?.message ?? String(e);
  throw new ScheduleRenderError('SCHEDULE_HTML_TOO_LARGE',
    '[skill-schedule] HELP 落盘失败：' + path + '（' + (code ? code + '：' : '') + detail + '）');
}

/** HELP 产物的复用窗口（毫秒）。#245：缺省**一天**（`HELP_REUSE_DEFAULT_HOURS`）——24 小时内反复读
 *  同一份 HELP 产物只留一份、不再新建；`--params` 的 `reuseHours` 可改（`0`＝每次都落新的）。
 *  换算与校验都在共用件（`reuseWindowOfHours`，坏参抛 `RangeError`）⇒ 本函数原样转出去，由出口
 *  归到「参数错」那一档（exit 2），与其余四家同档：坏参绝不静默当 0。 */
export function helpReuseWindow(params: Record<string, unknown>): number {
  return reuseWindowOfHours(params.reuseHours, HELP_REUSE_DEFAULT_HOURS);
}

/** 交付结果（`file` 态唯一；`path` 必为绝对路径；形状＝票面第 2 条的顶层 `delivery{mode,path,bytes}`）。
 *  #245 起＝共用件回执的形状，别名指向它，不另立第二份定义。 */
export type HtmlDelivery = HtmlReceipt;

/** 交付一次 HTML 产物（**唯一落盘点**）：
 *  - `explicit`（`--html <路径>`，用户逐字指定）→ **覆盖写**，语义与该参数既有口径一致（票面第 3 条）；
 *    **不吃复用窗口**（逐字落点＝说哪落哪）；
 *  - `targetDir`（`helpPaths.resolveHelpDir` 算出的**落点目录**；相对路径也收，写前归一为绝对）＋
 *    `stem`（文件名主体，`HELP_FILE_STEM`）→ **独占创建 ＋ 递补**（#128）；
 *    带 `reuseMs`（>0）时改为**窗口内复用**（#245）：已有那份不超龄就返回它、不新建；
 *  - 两者都给时 `explicit` 优先（用户指定胜过默认落点；**逐字覆盖写，不带时间戳、不递补**）。
 *  ⚠️ **时间戳只在共用件里算一次**：调用方给的是「目录 ＋ 主体」，**不**把 `resolveStemTarget` 的
 *  初候选路径传进来——那样共用件会用「带戳的名字」再拼一次时间戳（实测会落出
 *  `作息管家_HELP_<stamp>_<stamp>.html`，本项目已踩过一次）。失败抛错给调用方走 exit 5。 */
export function deliverHtml(input: {
  explicit?: string;
  targetDir?: string;
  stem?: string;
  html: string;
  reuseMs?: number;
}): HtmlDelivery {
  if (input.explicit !== undefined && input.explicit.length > 0) {
    const written = resolve(input.explicit);
    try {
      return saveHtmlFile({
        dir: dirname(written), file: basename(written), html: input.html, onExists: 'overwrite',
      });
    } catch (e) {
      writeFailed(written, e);
    }
  }
  if (input.targetDir === undefined || input.targetDir.length === 0 || input.stem === undefined) {
    throw new ScheduleRenderError('SCHEDULE_HTML_TOO_LARGE',
      '[skill-schedule] deliverHtml 缺落点（`explicit` 与「`targetDir` ＋ `stem`」至少给一组）');
  }
  try {
    return saveHtmlFile({
      dir: input.targetDir,
      stem: input.stem,
      html: input.html,
      ...(input.reuseMs === undefined ? {} : { onExists: { reuse: { byAge: input.reuseMs } } }),
    });
  } catch (e) {
    writeFailed(join(input.targetDir, input.stem), e);
  }
}
