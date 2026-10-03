/** 交付面·落点裁决：**这一次的 HTML 走哪条交付路、落到哪个名字**（一处定义，别处引用）。
 *
 *  本件是 #905「非 HELP 命令缺省落支」那一摊，从 `src/cli/cmd_read.ts` 搬出：外壳只认各域的门与
 *  交付能力的门，缺省落支住在外壳里会让它越长越大（#686 棘轮：分派层两件的行数只许变短）。
 *  与同目录 `./naming.js` 的分工：那一件算「产物叫什么」，本件算「这一次落不落、走哪条路」。
 *
 *  四条路（顺序即优先级，与搬迁前逐条同序）：
 *    ① HELP 产物（`help`）：整页 HELP 或速查表，落点意图由 `cmd_read` 的 `dispatchHelp` 给（含复用窗口）；
 *    ② 能力目录的整页（`ability`）：有 `page` 且有整页即落缺省名（`pageStemFor`）；
 *       程序面（`surface:'program'`）不进缺省落——#953 无唤醒词，给了 `--html` 才走显式覆盖写；
 *    ③ `bill.link.submit`：老模板页也进缺省落（一场景一页，页名按本次 `scene` 算）；
 *    ④ `--html` 显式口：用户逐字指定的落点＝说哪落哪（与缺省同文，只换落点）。
 *  体积门（`assertHtmlSize`）对准**实际交付的那一串**——四条路都从这里过（B1 复核整改口径）。
 */
import { assertHtmlSize } from '../render/index.js';
import { deliverHtml, type HtmlDelivery, type HtmlLanding } from '../output.js';
import { resolveHtmlDir } from '../fetch/paths.js';
import { projectWakeWord } from '../triggers/wakeTable.js';
import type { BillKey } from '../triggers/routeSpec.js';
import type { WriteOut, ViewOut } from '../shared/commandSpec.js';
import { pageStemFor } from './naming.js';

/** 一次落点裁决的输入（全是本次请求已算好的值，本件不读配置、不复算口径）。 */
export interface LandingInput {
  /** `--html <路径>`：用户逐字指定的落点（覆盖写；空串按没给算）。 */
  readonly explicit: string | undefined;
  /** HELP 那支的交付意图（缺席＝本次不是 HELP 命令）。 */
  readonly help: { readonly html?: string; readonly target: HtmlLanding; readonly reuseMs?: number } | undefined;
  /** 能力目录那支的产物（`REGISTRY[key].run` 的返回值；缺席／无页／空整页都按「不落」算）。 */
  readonly ability: WriteOut | ViewOut | null;
  readonly key: string;
  readonly params: Record<string, unknown>;
  /** 命令声明的程序面标记（`REGISTRY[key]?.surface`）：程序面不进缺省落。 */
  readonly surface: 'program' | undefined;
  /** 未迁移命令的 section 片段经 CONTENT 注入模板那一支（惰性：只在真要交付时算）。 */
  readonly sectionHtml: () => string;
}

/** 交付一次：回执（绝对路径 ＋ 字节数）或 `undefined`（本次没有要落的产物）。 */
export function landHtml(input: LandingInput): HtmlDelivery | undefined {
  const gated = (html: string): string => { assertHtmlSize(html); return html; };
  if (input.help !== undefined) {
    return deliverHtml({
      explicit: input.explicit,
      target: input.help.target,
      html: gated(input.help.html ?? input.sectionHtml()),
      reuseMs: input.help.reuseMs,
    });
  }
  const ability = input.ability;
  if (ability !== null && ability.page !== undefined && ability.html !== '') {
    if (input.surface !== 'program') {
      return deliverHtml({
        explicit: input.explicit,
        target: { dir: resolveHtmlDir(), stem: pageStemFor(ability.page) },
        html: gated(ability.html),
      });
    }
    return input.explicit ? deliverHtml({ explicit: input.explicit, html: gated(ability.html) }) : undefined;
  }
  if (input.key === 'bill.link.submit') {
    // 页名按本次参数算（`scene`→买东西／吃饭），交付层不复算口径，只取词条现算的值。
    const linkScene = input.params.scene === undefined ? 'purchase' : String(input.params.scene);
    const linkPage = { wakeWord: projectWakeWord({ key: input.key as BillKey, preset: { scene: linkScene } }), kind: 'single' } as const;
    return deliverHtml({
      explicit: input.explicit,
      target: { dir: resolveHtmlDir(), stem: pageStemFor(linkPage) },
      html: gated(input.sectionHtml()),
    });
  }
  if (input.explicit) return deliverHtml({ explicit: input.explicit, html: gated(input.sectionHtml()) });
  return undefined;
}
