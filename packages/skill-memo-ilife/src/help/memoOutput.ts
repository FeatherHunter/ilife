/** #229 · 备忘录 HELP 产物的**命名与落点**（零 IO、只出初候选）＋ 自持最小落盘管线。
 *
 * ## 归属：这是全仓**第 4 份**同逻辑实现（有意为之，不是漏抄共用件）
 *
 * 在跑的三份是 `packages/skill-bill/src/output.ts`（`:17` `nextExclusiveCandidate`／`:42`
 * `writeFileExclusiveWithRetry`）、`packages/skill-calorie/src/output.ts`、`packages/skill-bill/src/render/helpPaths.ts`。
 * 本件照 `skill-bill/src/output.ts` 抄**通式那一小块**，**只抄这一小块**：
 *   ① `wx` 独占创建；② `EEXIST` 时 `_N+1` 递补；③ `resolve()` 归一为绝对路径；
 *   ④ 文件名通式 `〈主体〉_<YYYYMMDD_HHMMSS>[_N].html`，时间戳取**本地**时区。
 * **不搬**卡路里的 `key→中文command` 映射／动态段／`inline`／`text` 三态回退与只读兜底——那是它自己的产物模型
 * （写不进去就是真失败，exit 5 ＋ 结构化失败回执，不静默降级成另一种交付形态）。
 *
 * ### 欠债挂账（**必须留可查的偿还记录**，不许默默抄）
 *
 * - **共用件归属票＝ [#237](https://github.com/FeatherHunter/ilife/issues/237)**（「落盘／命名管线的共享方式」，尚在人工审批闸门后）；
 * - **本图迁移票＝ [#240](https://github.com/FeatherHunter/ilife/issues/240)**（「备忘录出口落盘迁入共用件 `saveHtmlFile`」，`blocked_by = #237`）。
 * 本票**不新造 `saveHtmlFile`**、**不给本票挂 `#237` 阻塞边**（裁决 3：保本图关键路径不断）。
 *
 * 归属裁决正本：`docs/skills/skill-memo-ilife/t220-orchestrator-decisions.md` 裁决 3（判「甲」＋ 三条硬条件）。
 *
 * ## 命名口径
 *
 * - 目录＝`<SKILLS_DB_PATH>/memo_html/`（**扁平，不加 `help/` 一层**，裁决 1；老实物 12 件以上同落此处）；
 * - 主体＝`备忘录_HELP`（`HELP_FILE_STEM`）／`备忘录_速查表`（`LOOKUP_FILE_STEM`，**两支分名**，裁决 2）；
 * - `_N` **从 `_2` 起**（三家现役实现与老实物 `备忘录_HELP_20260820_150143_2.html` 同形，裁决 3 硬条件 2）。
 *
 * `_2` 起的道理（照抄 `skill-bill/src/output.ts` 的因果，别重演 #128）：默认落点曾是「`readdirSync` 计数选名 →
 * `writeFileSync`（`w` 覆盖）」两步，两步之间无独占性，多进程并发同秒都选同一路径 ⇒ 后写覆盖先写，
 * 用户按回执路径可能打开另一次调用的产物。修法＝`flag:'wx'` 独占创建，`EEXIST` 递增 `_N` 重试（原子，无需锁）。
 * **仅** `EEXIST` 重试，其余错误原样上抛（不把权限／路径错伪装成「换个名再写一次」）。
 *
 * 本模块只出**初候选**（零 IO，不建目录）：最终名由 `writeFileExclusiveWithRetry` 的 `wx` 独占仲裁。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { HELP_HTML_DIR_NAME, HELP_FILE_STEM, LOOKUP_FILE_STEM } from './manifest.js';

export { HELP_HTML_DIR_NAME, HELP_FILE_STEM, LOOKUP_FILE_STEM };

/** 产物扩展名（照 `skill-bill/src/render/helpPaths.ts:24`）。 */
const HELP_HTML_EXT = '.html';

/** 老 `strftime("%Y%m%d_%H%M%S")` 等价物（本地时区、零填充；非法 Date 即抛，缺失阻断不返空）。 */
export function formatHelpStamp(now: Date): string {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error('[skill-memo-ilife] HELP 时间戳须为有效 Date（缺失阻断不返空）。');
  }
  const p = (n: number): string => String(n).padStart(2, '0');
  return String(now.getFullYear()) + p(now.getMonth() + 1) + p(now.getDate())
    + '_' + p(now.getHours()) + p(now.getMinutes()) + p(now.getSeconds());
}

/** 通式文件名 `〈主体〉_<stamp>[_<n>].html`；主体原样拼入，不做清洗。 */
export function buildHelpFileName(stem: string, date: Date, n?: number): string {
  if (typeof stem !== 'string' || stem.length === 0) {
    throw new Error('[skill-memo-ilife] buildHelpFileName stem 须为非空字符串（缺失阻断不返空）。');
  }
  const stamp = formatHelpStamp(date);
  return n === undefined
    ? stem + '_' + stamp + HELP_HTML_EXT
    : stem + '_' + stamp + '_' + String(n) + HELP_HTML_EXT;
}

/** 通式落点**初候选**（绝对路径、零 IO）：`<dbDir>/memo_html/〈主体〉_<stamp>.html`。
 *  目录不在此处建：写盘前由 `writeFileExclusiveWithRetry` 递归创建。 */
export function resolveStemTarget(dbDir: string, stem: string, now: Date): string {
  return join(resolve(dbDir), HELP_HTML_DIR_NAME, buildHelpFileName(stem, now));
}

/** 下一独占候选（照 `skill-bill/src/output.ts:27`）：`_N` 递增；**无 `_N` 则 `_2`**。 */
export function nextExclusiveCandidate(currentAbs: string): string {
  const dir = dirname(currentAbs);
  const base = currentAbs.slice(dir.length + 1);
  const m = base.match(/^(.*_\d{8}_\d{6})(?:_(\d+))?(\.[^.]+)$/);
  if (m) {
    const prefix = m[1] as string;
    const n = m[2] !== undefined ? Number.parseInt(m[2] as string, 10) : 1;
    return join(dir, prefix + '_' + String(n + 1) + HELP_HTML_EXT);
  }
  const dot = base.lastIndexOf('.');
  const stem = dot >= 0 ? base.slice(0, dot) : base;
  return join(dir, stem + '_2' + HELP_HTML_EXT);
}

/** 独占写 ＋ 重试（照 `skill-bill/src/output.ts:42`）：`wx` 首试，`EEXIST` 则 `_N+1`；父目录不存在递归创建。 */
export function writeFileExclusiveWithRetry(initialAbs: string, html: string): string {
  let candidate = initialAbs;
  for (let i = 0; i < 1000; i++) {
    try {
      mkdirSync(dirname(candidate), { recursive: true });
      writeFileSync(candidate, html, { flag: 'wx', encoding: 'utf8' });
      return candidate;
    } catch (e) {
      if ((e as NodeJS.ErrnoException)?.code === 'EEXIST') {
        candidate = nextExclusiveCandidate(candidate);
        continue;
      }
      throw e;
    }
  }
  throw Object.assign(new Error('落点独占创建重试超限：' + initialAbs), { code: 'EEXIST' });
}

/** 交付结果（`file` 态唯一；`path` 必为**绝对路径**——`SKILLS_DB_PATH` 本身可以是相对路径）。 */
export interface MemoHtmlDelivery {
  readonly mode: 'file';
  readonly path: string;
  readonly bytes: number;
}

/** 交付一次 HTML 产物（本包**唯一落盘点**）：
 *  - `explicit`（`--html <路径>`，用户逐字指定）→ **覆盖写**（`w`），语义与该参数既有口径一致；
 *  - `target`（本次产物按通式算出的初候选）→ **独占创建 ＋ 递补**（`wx` ＋ `EEXIST`）；
 *  - 两者都给时 `explicit` 优先（用户指定胜过默认落点）。 */
export function deliverMemoHtml(input: { explicit?: string; target?: string; html: string }): MemoHtmlDelivery {
  const bytes = Buffer.byteLength(input.html, 'utf8');
  if (input.explicit !== undefined && input.explicit.length > 0) {
    const written = resolve(input.explicit);
    mkdirSync(dirname(written), { recursive: true });
    writeFileSync(written, input.html, 'utf8');
    return { mode: 'file', path: written, bytes };
  }
  if (input.target === undefined || input.target.length === 0) {
    throw new Error('[skill-memo-ilife] deliverMemoHtml 缺落点（`explicit` 与 `target` 至少给一个）');
  }
  const finalPath = writeFileExclusiveWithRetry(resolve(input.target), input.html);
  return { mode: 'file', path: finalPath, bytes };
}
