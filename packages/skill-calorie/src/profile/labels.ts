/** #238 · 场景 07 五张页的**给人看的字**：把库内英文枚举与命令字段名说成中文。
 *
 * 谁在用（都用在本能力目录里）：预检确认页与两条写后回执页（`setup.ts`）、改档案回执页
 * （`update.ts`）、查档案结果页（`view.ts`）。**不出这个目录**——别的页域要中文说法时，
 * 先看 `analysis/utils.ts` 的两张正本表（`ACTIVITY_LEVEL_LABELS`／`GENDER_LABELS`）。
 *
 * 为什么要有这一件（#238 清单第 2、8、13 条）：一个页面里同一份数据写两种样子——上方卡片已写
 * 「中度活动」，下方的表里还是 `moderate`；出页回英文枚举，用户会以为那是两个字段。老技能
 * 当年也是这么办的：`s07_v5.html:279-283` 的 `ACT_LABELS`／`fmtVal` 在**显示那一刻**翻中文。
 *
 * **翻的是「给人看的那一层」，不是数据**：库内英文枚举、stdout 的 JSON、复制出去的载荷一律
 * 照旧（`fetch/profile.ts` 的列值、`CrudReceipt` 的 `writtenFields`／`items` 都不动）。
 * `localizeEnums` 因此只在页面层对着**整句话**用（摘要、逐字段对照那句），不对载荷用。
 */
import { ACTIVITY_LEVEL_LABELS, GENDER_LABELS } from '../analysis/utils.js';

/** 档案字段名（CLI 参数名，与 `writtenFields`／`items[].status` 同形）→ 中文列名。
 *  与写命令的参数允许清单同集（`src/cli/write.ts` 的 `PROFILE_COLS` 同五项，那边映射的是库列名）。 */
const FIELD_LABELS: Record<string, string> = {
  heightCm: '身高',
  age: '年龄',
  gender: '性别',
  activityLevel: '活动量',
  note: '备注',
};

/** 认不出的字段名原样露出（不编中文名，也不吞掉）。 */
export function fieldLabel(camel: string): string {
  return FIELD_LABELS[camel] ?? camel;
}

/** 性别显示值：`male→男`／`female→女`；别的原样露出（认不出的绝不猜成男）。空值写「未设置」。 */
export function genderLabel(raw: string | null | undefined): string {
  const s = raw === null || raw === undefined ? '' : String(raw).trim();
  if (s === '') return '未设置';
  return GENDER_LABELS[s] ?? s;
}

/** 活动量档位显示值：五档取正本 `ACTIVITY_LEVEL_LABELS`；认不出的档位原样露出。空值写「未设置」。 */
export function activityLabel(level: string | null | undefined): string {
  const s = level === null || level === undefined ? '' : String(level).trim();
  if (s === '') return '未设置';
  return ACTIVITY_LEVEL_LABELS[s] ?? s;
}

/** 两张正本表合成一张：一句话里出现哪个英文枚举就换成哪个中文说法（认不出的原样留着）。 */
const ENUM_LABELS: Record<string, string> = { ...GENDER_LABELS, ...ACTIVITY_LEVEL_LABELS };

/** 整句里的英文枚举 → 中文（长词在前，免得 `very_active` 被 `active` 咬掉半截）。 */
const ENUM_PATTERN = new RegExp(
  Object.keys(ENUM_LABELS).sort((a, b) => b.length - a.length).join('|'),
  'g',
);

/** 把一句话里的库内英文枚举换成中文说法（摘要、逐字段对照那句用得上）。
 *  **只用于给人看的整句**：命令原文、复制载荷、stdout 的 JSON 一律不过这一道。 */
export function localizeEnums(text: string): string {
  return text.replace(ENUM_PATTERN, (hit) => ENUM_LABELS[hit] ?? hit);
}
