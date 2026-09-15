/** #550 · 复制日志第 1 段「场景标识」的**场景键归一**：`key` 已带 `{skill}.` 前缀时剥掉那一层。
 *
 * 一句话背景：公共层 `base-render/src/text.ts:298` 的场景标识算式是 **`skill ＋ '.' ＋ key`**，
 * 而 `Envelope.key` 的契约注释（`base-link-core/src/envelope.ts:26`「registry 命名空间 key：形如
 * skill.combo」）与兄弟技能 `skill-bill/src/shared/pageIdentity.ts:10` 的写法（交给信封的 key
 * **只写场景名**，`bill.record.add` → `record.add`）**互相打架**。卡路里这侧站整名那一派
 * （勘察读数：`packages/skill-calorie/src` 里 78 处信封装配位，带 `calorie.` 前缀的 **50** 处、
 * 不带前缀的 **0** 处、动态表达式 28 处），于是日志第 1 段印成
 * `calorie.calorie.view.plan（stat）`——用户照「复制日志」抄回 AI 的是一个**不存在的命令键**
 * （这一段不上屏，机检与肉眼原先都照不到）。
 *
 * 为什么归一落在卡路里这侧、不动公共层：编排者 2026-09-15 裁定（#550 执行窗）——公共层
 * 「算式 vs 兄弟技能约定」这一对矛盾归公共层票裁，卡路里票只在自己这侧的**每一次 `buildLogText`
 * 调用点**上收口。
 *
 * 判据（可证不回归，两条都是性质不是口味）：
 *  - **合规写法逐字节不变**：`key` 不以 `{skill}.` 开头时**返回入参那一只对象本身**（`===`），
 *    下游拿到的字节与改前逐字节相同；
 *  - **不合规写法不再拼两遍**：带前缀时剥一层，产物里该行回到 `{skill}.{场景名}（{shape}）`。
 *
 * 规则从 envelope 自己的 `skill` 派生，**不写任何能力的名字**（仓规「共用位里不许出现任何一个
 * 能力的名字」）；`skill` 为空串、`key` 非字符串或为空串时一律原样返回（不抛错、不改字节）。
 *
 * 谁在用（写得出哪两个在用）：**页面日志位的漏斗** `shared/copyArea.ts`（全包各域页面的复制区
 * 都经它出日志位）与 **三族自己直调 `buildLogText` 的页面装配**（`render/planCopyBlock.ts` 的
 * 健身计划结果页／过程页与写后回执、`render/reviewDocs.ts` 的计划复盘页、`render/trendDocs.ts`
 * 的禁忌扫描页）。
 */
import type { SerializableEnvelope } from 'base-paint';

/** 场景键归一：`key` 以 `{skill}.` 开头时剥掉该前缀；其余情形返回**入参那一只对象**（引用相等）。 */
export function sceneEnvelope(envelope: SerializableEnvelope): SerializableEnvelope {
  const skill = typeof envelope.skill === 'string' ? envelope.skill : '';
  const key = typeof envelope.key === 'string' ? envelope.key : '';
  if (skill === '' || key === '') return envelope;
  const prefix = skill + '.';
  if (!key.startsWith(prefix)) return envelope;
  return { ...envelope, key: key.slice(prefix.length) };
}
