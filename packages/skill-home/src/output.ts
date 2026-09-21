/** #801 · 数据与过程命令的**唯一交付入口**：`deliverHtml({explicit, target, html})`
 *  → `{mode, path, bytes}`（＝共用件回执；`path` 恒**绝对路径**，`bytes` 恒**实际落盘**字节数）。
 *
 *  命名通式／时间戳／同秒递补／独占写**一概不由本件自持**：全部调共用件
 *  `base-paint/save-html` 的 `saveHtmlFile`（`#237` 起五家在用；抄回来就是铁律二禁止的
 *  「同一件事两份实现」）。本件是**薄封装**：只做「出口裁决 ＋ 缺落点报错 ＋ 写失败口径」三件事
 *  （照 `skill-bill/src/output.ts:33-60` 与 `src/help/output.ts` 同形）。
 *
 *  两态（语义与 HELP 交付支一致）：
 *   - `explicit`（`--html <路径>`，用户逐字指定）→ **覆盖写**（共用件 `onExists:'overwrite'`
 *     ＋ `file`：逐字落点、不带时间戳、不递补）；两者都给时 `explicit` 优先
 *     （用户指定胜过缺省落点，照账单／卡路里先例——显式与缺省只落一份、单回执）；
 *   - `target`（缺省落点意图 `{dir, stem}`，`stem` 由 `src/render/sceneNaming.ts`
 *     按票 2 契约算出）→ **独占创建 ＋ 递补**（共用件缺省 `succession`）。
 *  ⚠️ 时间戳只在共用件里算**一次**：调用方给「目录 ＋ 主体」，**不**把带戳路径传进来。
 *
 *  写失败**不静默降级**（票面：缺省交付物＝明确拿到文件，写不进去就是真失败）：一律抛本包既有渲染层
 *  错误类 `HomeRenderError`（照 `src/help/output.ts:19-21` 同一取舍），由出口走 **exit 5** ＋ stderr 回执。
 */
import { basename, dirname, join, resolve } from 'node:path';
import { saveHtmlFile, type HtmlLanding, type HtmlReceipt } from 'base-paint/save-html';
import { HomeRenderError } from './render/errors.js';

/** 交付结果（`file` 态唯一；`path` 必为**绝对路径**）。＝共用件回执的形状，别名指向它，不另立第二份定义。 */
export type HtmlDelivery = HtmlReceipt;

/** 落点**意图**（缺省交付用）：`dir` 落哪个目录、`stem` 文件名主体——时间戳格式与同秒递补由共用件钉死。
 *  ＝共用件自己的形状，转出去给出口用（本件不另立定义）。 */
export type { HtmlLanding };

/** 落盘失败一律抛本包渲染层错误（`code` 保留原始系统错的信息，不把失败伪装成成功）。 */
function writeFailed(path: string, e: unknown): never {
  if (e instanceof HomeRenderError) throw e;
  const code = (e as NodeJS.ErrnoException | undefined)?.code;
  const detail = (e as Error | undefined)?.message ?? String(e);
  throw new HomeRenderError('HOME_HTML_TOO_LARGE',
    '[skill-home] 数据页落盘失败：' + path + '（' + (code ? code + '：' : '') + detail + '）');
}

/** 交付一次数据／过程 HTML（**本线唯一落盘点**）：见件头两态与「不静默降级」的取舍。 */
export function deliverHtml(input: {
  readonly explicit?: string;
  readonly target?: HtmlLanding;
  readonly html: string;
}): HtmlDelivery {
  if (typeof input.html !== 'string' || input.html.length === 0) {
    throw new HomeRenderError('HOME_BAD_PAYLOAD', '[skill-home] deliverHtml 缺 HTML 正文（缺失阻断，不写空页）。');
  }
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
  if (input.target === undefined) {
    throw new HomeRenderError('HOME_BAD_PAYLOAD',
      '[skill-home] deliverHtml 缺落点（`explicit` 与 `target` 至少给一个）');
  }
  try {
    return saveHtmlFile({ dir: input.target.dir, stem: input.target.stem, html: input.html });
  } catch (e) {
    writeFailed(join(input.target.dir, input.target.stem), e);
  }
}
