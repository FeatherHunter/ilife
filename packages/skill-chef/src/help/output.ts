/** #214 · 私家大厨 HELP 产物的**唯一落盘点**：`deliverChefHelp({explicit, target, html})` → `{mode, path, bytes}`。
 *
 * 落盘与命名归共用件 `base-paint/save-html` 的 `saveHtmlFile`（维护者 2026-09-12 裁决 8：「不应该是一个独立的
 * base 包，放在 `base-paint` 吧，是绘制出 html 后的相关操作」；地图 #208 Q7 同轮裁「乙」＝把「命名与落盘」
 * 收成共用位）：本件**不自持** `nextExclusiveCandidate`／`writeFileExclusiveWithRetry`——那两份
 * （bill／calorie 各抄一份、逐行等价）正是铁律二禁止的「同一件事两份实现」。
 *
 * 本件是**本包唯一碰 `fs` 的 HELP 件**：`helpFile.ts` 只要渲染、不 import 本件；`base-paint/save-html`
 * 走子路径出口 ⇒ 只要渲染的消费者不会被动吃进 `fs`（`base-paint` 的包根本身零文件系统依赖）。
 *
 * 两态（语义照 bill `src/output.ts:33-37`）：
 *  - `explicit`（`--html <路径>`，用户逐字指定）→ **覆盖写**（共用件 `onExists:'overwrite'`：落点逐字、
 *    不带时间戳、不递补），与该参数的既有口径一致；
 *  - `target`（`helpFile.buildChefHelpDelivery` 算出的落点意图）→ **独占创建 ＋ 同秒递补**（共用件缺省
 *    `succession`：`wx` 首试，`EEXIST` 递增 `_N`；#128 的因果——「选名 → 覆盖写」两步无独占性，
 *    并发同秒会互相覆盖，用户按回执路径可能打开另一次调用的产物）；
 *  - 两者都给时 `explicit` 优先（用户指定胜过默认落点）。
 *
 * 写失败**不静默降级**：目的地是「明确拿到文件」，写不进去就是真失败（出口走失败回执，票 7），
 * 有意**不引入** calorie 的只读回退（写不进去就换一种交付形态）。错误**原样穿过**：
 * 共用件的 `code`（`EEXIST`／`EINVAL`／`EIO`）就是它对外的契约，包一层只会把码吃掉。
 */
import { basename, dirname, resolve } from 'node:path';
import { saveHtmlFile, type HtmlLanding, type HtmlReceipt } from 'base-paint/save-html';
import { ChefRenderError } from '../render/errors.js';

/** 交付结果（`file` 态唯一；`path` 必为**绝对路径**，`bytes` 是**实际落盘**字节数）。
 *  ＝共用件回执的形状，别名指向它，不另立第二份定义（照 bill `src/output.ts:27`）。 */
export type ChefHtmlDelivery = HtmlReceipt;

/** 落点意图＝共用件自己的形状，转出去给出口用（本件不另立定义）。 */
export type { HtmlLanding };

/** 交付一次 HELP HTML（**本包唯一落盘点**）：见件头两态与「不静默降级」的取舍。 */
export function deliverChefHelp(input: { explicit?: string; target?: HtmlLanding; html: string }): ChefHtmlDelivery {
  if (typeof input.html !== 'string' || input.html.length === 0) {
    throw new ChefRenderError('CHEF_BAD_PAYLOAD', '[skill-chef] deliverChefHelp 缺 HTML 正文（缺失阻断，不写空页）。');
  }
  if (input.explicit !== undefined && input.explicit.length > 0) {
    const abs = resolve(input.explicit);
    return saveHtmlFile({ dir: dirname(abs), file: basename(abs), html: input.html, onExists: 'overwrite' });
  }
  if (input.target === undefined) {
    throw new ChefRenderError('CHEF_BAD_PAYLOAD', '[skill-chef] deliverChefHelp 缺落点（`explicit` 与 `target` 至少给一个）');
  }
  return saveHtmlFile({ dir: input.target.dir, stem: input.target.stem, html: input.html });
}
