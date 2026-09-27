/** 交付面·命名：**产物文件名主体在哪、叫什么**（一处定义，别处引用）。
 *
 *  本件是 #905 的「命名一处定义」那一半：全包只有这里算得出「某一页的产物叫什么」。
 *  谁能读同一份：
 *    · **实现**——`src/shared/commandSpec.ts` 的 `page` 一格（类型）与各域出页处填的值；
 *      出口 `src/cli/cmd_read.ts` 落盘时用它算 `stem`；
 *    · **探针**——`tooling/check-delivery.mjs` 把它与真跑出来的 `delivery.path` 对账（只认路径，不按名找）；
 *    · **链路页与墙**——**不自己算名字**：读回执里的 `delivery.path` 即可。
 *  所以本件不派生任何清册文件（口径件 t903 §一：不抄逐键清单）。
 *
 *  名字通式（时间戳／递补／扩展名**不在本件**）：`〈主体〉_<YYYYMMDD_HHMMSS>[_N].html`，
 *  由共用件 `base-paint/save-html` 的 `saveHtmlFile` 算——本件只给「主体」。
 *
 *  **主体怎么取**：`〈技能名〉_〈页名〉`。技能名引页面标识件已有的 `DOC_TITLE`
 *  （`src/shared/pageIdentity.ts`，不写第二个“饼干记账”字面量）；
 *  页名＝**本次这一页的唤醒词**（按本次参数算，不取命令代表词——口径件 t903 §二）；
 *  写入／账户／目标三域的「一场景两页」再加 `_采集页`／`_回执页`（本件的两个词，域里不重写）。
 *  查询／分析／开始使用／`bill.link.submit` 是一场景一页，不带后缀（`kind:'single'`）。
 *
 *  本件是**纯函数**：给「唤醒词 ＋ 页型」，出「文件名主体」。零 IO、不读配置、不碰盘。
 */
import { DOC_TITLE } from '../shared/pageIdentity.js';

/** 过程页后缀词（写入／账户／目标三域“还缺东西”的那一页）。本件是唯一定义地，域里不重写。 */
export const COLLECT_PAGE_WORD = '采集页' as const;

/** 结果页后缀词（写入／账户／目标三域“写库成功”的那一页）。本件是唯一定义地，域里不重写。 */
export const RECEIPT_PAGE_WORD = '回执页' as const;

/** 页型：过程页／结果页／单页（一场景一页，不带后缀）。只有出页那一刻的分支知道，往外看是二手信号，故由出页处交出。 */
export type BillPageKind = 'collect' | 'receipt' | 'single';

/** 本次这一页是谁（命令声明的产物形状加的这一格，由各命令的出页处填）。 */
export interface BillPage {
  /** 本次这一页的唤醒词（页面正文标题与复制载荷里就是它）。 */
  readonly wakeWord: string;
  /** 页型：两页的域给 collect/receipt，单页的域给 single。 */
  readonly kind: BillPageKind;
}

/** 一页的产物**文件名主体**：`〈技能名〉_〈唤醒词〉[_采集页|_回执页]`。 */
export function pageStemFor(page: BillPage): string {
  const word = page.wakeWord.trim();
  if (word === '') throw new Error('[delivery] 页名为空：唤醒词不能为空');
  const suffix = page.kind === 'single'
    ? ''
    : page.kind === 'collect'
      ? '_' + COLLECT_PAGE_WORD
      : '_' + RECEIPT_PAGE_WORD;
  return DOC_TITLE + '_' + word + suffix;
}
