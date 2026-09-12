/** #144 · HTML 产物的**交付入口**（`explicit` 覆盖写／`target` 独占创建 ＋ 绝对路径回执）。
 *
 * #237 改判（维护者 2026-09-12 裁决 8「不应该是一个独立的 base 包，放在 `base-paint` 吧，是绘制出 html 后的
 * 相关操作」；地图 #208 的 Q7 同轮裁「乙」＝把「命名与落盘」收成共用位）：落盘与命名收进共用件
 * `base-paint/save-html` 的 `saveHtmlFile`，本件不再自持 `nextExclusiveCandidate`／
 * `writeFileExclusiveWithRetry`——那两份与 `skill-calorie/src/output.ts` 的对应件逐行等价（30 行 vs 29 行，
 * 只差两处字面量），正是铁律二禁止的「同一件事两份实现」。
 *
 * #128 的因果（照抄保留，别重演）：默认落点曾是「`readdirSync` 计数选名 → `writeFileSync`（`w` 覆盖）」
 * 两步，两步之间无独占性；多进程并发同秒都选同一路径 → 后写覆盖先写，用户按回执路径可能打开另一次调用的
 * 产物。修法（现住共用件）：`flag:'wx'` 独占创建，`EEXIST` 时递增 `_N` 重试（原子，无需锁）。
 *  - 串行语义不变：首选仍是通式初候选，首试即中 → 文件名与老版逐字一致；
 *  - 大小写不敏感（Windows `normcase`）由 `wx` 天然覆盖：`.HTML` 占位同样 `EEXIST`；
 *  - **仅** `EEXIST` 递补，其余错误原样抛出（不把权限／路径错伪装成「换个名再写一次」）。
 *
 * #83 返修 R-1 的教训：回执路径必须归一为**绝对路径**——`SKILLS_DB_PATH` 本身可以是相对路径，产物已写盘却
 * 把相对串回传给调用方，下游按它打开就会找不到（或找到别处的同名文件）。共用件回执的 `path` 恒绝对。
 *
 * 有意**不**做（对抗式取舍）：照 caloric 的只读回退（`EACCES`／`EROFS` → inline 交付）在本线
 * **不引入**——本图的目的地是「明确拿到文件」，写不进去就是真失败，应当 exit 5 ＋ 结构化失败回执，
 * 不静默降级成另一种交付形态（也就少一整套 inline 语义要维护）。
 */
import { basename, dirname, resolve } from 'node:path';
import { saveHtmlFile, type HtmlLanding, type HtmlReceipt } from 'base-paint/save-html';

/** 交付结果（`file` 态唯一；`path` 必为绝对路径）。＝共用件回执的形状，别名指向它，不另立第二份定义。 */
export type HtmlDelivery = HtmlReceipt;

/** 落点**意图**（缺省交付用）：`dir` 落哪个目录、`stem` 文件名主体——时间戳格式与同秒递补由共用件钉死。
 *  ＝共用件自己的形状，转出去给出口用（本件不另立定义）。 */
export type { HtmlLanding };

/** 交付一次 HTML 产物（**唯一交付入口**）：
 *  - `explicit`（`--html <路径>`，用户逐字指定）→ **覆盖写**（共用件 `onExists:'overwrite'` ＋ `file`：落点逐字）；
 *  - `target`（本次产物按通式算出的落点意图）→ **独占创建 ＋ 递补**（共用件缺省 `succession` ＋ `stem`：文件名主体）；
 *  - 两者都给时 `explicit` 优先（用户指定胜过默认落点）。
 *  `stem` 与 `file` 是共用件上两个正交的口子：#237 之前本件把 `basename(abs)` 当 `stem` 传、
 *  靠 `overwrite` 态把主体解释成完整文件名，一个参数背两个语义；现改为 `file` 走确切文件名。 */
export function deliverHtml(input: { explicit?: string; target?: HtmlLanding; html: string }): HtmlDelivery {
  if (input.explicit !== undefined && input.explicit.length > 0) {
    const abs = resolve(input.explicit);
    return saveHtmlFile({ dir: dirname(abs), file: basename(abs), html: input.html, onExists: 'overwrite' });
  }
  if (input.target === undefined) {
    throw new Error('[skill-bill] deliverHtml 缺落点（`explicit` 与 `target` 至少给一个）');
  }
  return saveHtmlFile({ dir: input.target.dir, stem: input.target.stem, html: input.html });
}
