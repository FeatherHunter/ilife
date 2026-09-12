/** #190 · 居家管家 HELP 产物的**唯一落盘点**：`deliverHomeHelp({explicit, targetDir, stem, html, reuseMs})`
 *  → `{mode, path, bytes}`（＝共用件回执；`path` 恒**绝对路径**，`bytes` 恒**实际落盘**字节数）。
 *
 *  命名通式／时间戳／同秒递补／独占写／复用窗口**一概不由本件自持**：全部调共用件
 *  `base-paint/save-html` 的 `saveHtmlFile`（`#237` 起五家在用）。账单旧版的
 *  `nextExclusiveCandidate`／`writeFileExclusiveWithRetry` 已搬进共用件——抄回来就是铁律二禁止的
 * 「同一件事两份实现」。本件是**薄封装**：只做「出口裁决 ＋ 缺落点报错 ＋ 写失败口径」三件事。
 *
 *  两态（语义照 bill `src/output.ts:33-37`／schedule `src/help/output.ts:48-57`）：
 *   - `explicit`（用户逐字指定的落点）→ **覆盖写**（共用件 `onExists:'overwrite'` ＋ `file`：逐字落点、
 *     不带时间戳、不递补、不吃复用窗口）；
 *   - `targetDir` ＋ `stem`（缺省落点）→ **独占创建 ＋ 递补**（共用件缺省 `succession`）；
 *     给了 `reuseMs`（>0）改走**复用窗口**：窗口内已有同一主体的一份就回它，不新建不改写；
 *     `reuseMs ＝ 0` ⇒ 每次都落一份新的（共用件 `byAge:0` 是「永不命中」的严格区间，见 `saveHtml.ts:294-301`）；
 *   - 两者都给时 `explicit` 优先（用户指定胜过缺省落点）。
 *  ⚠️ 时间戳只在共用件里算**一次**：调用方给「目录 ＋ 主体」，**不**把带戳的初候选路径传进来
 *  （否则共用件会再拼一次时间戳，落出 `<主体>_<stamp>_<stamp>.html`）。
 *
 *  写失败**不静默降级**（票面：缺省交付物＝明确拿到文件，写不进去就是真失败）：一律抛本包既有渲染层
 *  错误类 `HomeRenderError`，`code` 取该类型已有的「体积／落盘门」那一条 `HOME_HTML_TOO_LARGE`
 *  （不新增错误类、不改既有导出面；照 schedule 的同一取舍），由出口 `cmd_read.ts` 走 **exit 5** ＋ stderr 回执。
 */
import { basename, dirname, join, resolve } from 'node:path';
import { saveHtmlFile, type HtmlReceipt } from 'base-paint/save-html';
import { HomeRenderError } from '../render/errors.js';

/** 交付结果（`file` 态唯一；`path` 必为**绝对路径**）。＝共用件回执的形状，别名指向它，不另立第二份定义。 */
export type HomeHtmlDelivery = HtmlReceipt;

/** 落盘失败一律抛本包渲染层错误（`code` 保留原始系统错的信息，不把失败伪装成成功）。 */
function writeFailed(path: string, e: unknown): never {
  if (e instanceof HomeRenderError) throw e;
  const code = (e as NodeJS.ErrnoException | undefined)?.code;
  const detail = (e as Error | undefined)?.message ?? String(e);
  throw new HomeRenderError('HOME_HTML_TOO_LARGE',
    '[skill-home] HELP 落盘失败：' + path + '（' + (code ? code + '：' : '') + detail + '）');
}

/** 交付一次 HELP HTML（**本包唯一落盘点**）：见件头两态与「不静默降级」的取舍。 */
export function deliverHomeHelp(input: {
  readonly explicit?: string;
  readonly targetDir?: string;
  readonly stem?: string;
  readonly html: string;
  readonly reuseMs?: number;
}): HomeHtmlDelivery {
  if (typeof input.html !== 'string' || input.html.length === 0) {
    throw new HomeRenderError('HOME_BAD_PAYLOAD', '[skill-home] deliverHomeHelp 缺 HTML 正文（缺失阻断，不写空页）。');
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
  if (input.targetDir === undefined || input.targetDir.length === 0 || input.stem === undefined) {
    throw new HomeRenderError('HOME_BAD_PAYLOAD',
      '[skill-home] deliverHomeHelp 缺落点（`explicit` 与「`targetDir` ＋ `stem`」至少给一组）');
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
