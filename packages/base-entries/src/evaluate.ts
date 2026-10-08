// evaluate：消息求值的**可替换端口** ＋ 默认后端（ADR-0004 §2）。
//
// 机制住公共层，求值实现由消费方提供。本件只钉两样：
//   · 端口形状（EvaluateRequest／Evaluate）——换后端＝换一个函数，不改词条表、不改调用点；
//   · 默认后端（evaluate）——ICU 语义的**朴素实现**，本期只认 `{name}` 具名占位。
// 换后端怎么接、MF2／真 ICU 的落点：docs/base/base-entries/端口契约.md。
import { MissingParamError } from './errors.js';

/**
 * 插值参数：占位名 → 值。
 * 值是字符串或数字；数字的形态由后端按 `language` 决定（本层不预先格式化）。
 */
export type MessageParams = Readonly<Record<string, string | number>>;

/** 一次求值请求。 */
export interface EvaluateRequest {
  /** 待求值的词条文本（已按回退链取到的那一条）。 */
  readonly template: string;
  /** 调用方请求的语言（读者语言），BCP 47 小写 canonical 形。 */
  readonly language: string;
  /** 实际取到这条词条的语言；回退命中时与 `language` 不同。 */
  readonly sourceLanguage: string;
  /** 插值参数；没有参数时这个键缺席。 */
  readonly params?: MessageParams;
}

/** 求值后端：吃一个请求，回一段文本。 */
export type Evaluate = (request: EvaluateRequest) => string;

/** 具名占位：`{name}`，name 取标识符形（首字符字母或下划线）。 */
const PLACEHOLDER = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

/** 参数取值：按 `string | number | undefined` 读——缺参是这一格的常态。 */
function paramOf(params: MessageParams | undefined, name: string): string | number | undefined {
  if (params === undefined) return undefined;
  return (params as Readonly<Record<string, string | number | undefined>>)[name];
}

/**
 * 默认后端：把 `{name}` 按参数替换掉。
 *
 * 缺参**抛 MissingParamError**（不静默留空）；其余花括号形态（`{0}` 位置参数、
 * 复数／选择）**原样留在文本里**——这是本期的已知近似，真 ICU／MF2 后端从端口接。
 */
export function evaluate(request: EvaluateRequest): string {
  return request.template.replace(PLACEHOLDER, (_matched, name: string) => {
    const value = paramOf(request.params, name);
    if (value === undefined) throw new MissingParamError(name, request.template);
    return String(value);
  });
}
