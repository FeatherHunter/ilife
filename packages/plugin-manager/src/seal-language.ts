/** 印章面板的语言：读 DSH 客户端 locale 服务的活动语言（#1325）。
 *
 * 为什么读服务而不是走词条层：面板是浏览器 React 渲染，`m()` 的渲染语言上下文在浏览器恒为 zh
 * （`base-entries` 的 `runWithLanguage` 只在 Node 侧用）；宿主唯一公开的语言事实就是 locale 服务快照。
 * 读法是**软依赖**（不写进 inject）：`ctx.get('locale')` 缺席时整包照常装、面板照常中文。
 */
import type { SealLanguage } from './seal-vocabulary.generated.js';

export type { SealLanguage };

/** 缺省语言：与服务缺席／读不出／未知语言一致（中文，渲染结果与改动前逐字节同）。 */
export const DEFAULT_SEAL_LANGUAGE: SealLanguage = 'zh';

/** locale 服务的最小读取面（宿主 LocaleRuntime 同时有 getSnapshot 与 getLocale，两个都认）。 */
interface LocaleFaceLike {
  getSnapshot?: () => unknown;
  getLocale?: () => unknown;
}

function activeLocaleOf(face: unknown): unknown {
  if (face === null || typeof face !== 'object') return undefined;
  const f = face as LocaleFaceLike;
  // 宿主 LocaleRuntime 两种读法都认：快照优先，快照里读不出 active 时再问 getLocale。
  if (typeof f.getSnapshot === 'function') {
    const snap = f.getSnapshot.call(face);
    if (snap !== null && typeof snap === 'object') {
      const active = (snap as { active?: unknown }).active;
      if (typeof active === 'string') return active;
    }
  }
  if (typeof f.getLocale === 'function') {
    const raw = f.getLocale.call(face);
    if (typeof raw === 'string') return raw;
    if (raw !== null && typeof raw === 'object') return (raw as { active?: unknown }).active;
  }
  return undefined;
}

/** 把 locale 服务（或它缺席时的 undefined）归一成印章语言；任何异常都回缺省，绝不阻断面板。 */
export function sealLanguageOf(face: unknown, fallback: SealLanguage = DEFAULT_SEAL_LANGUAGE): SealLanguage {
  try {
    const active = activeLocaleOf(face);
    if (typeof active !== 'string') return fallback;
    const tag = active.trim().toLowerCase();
    if (tag === 'zh' || tag.startsWith('zh-')) return 'zh';
    if (tag === 'en' || tag.startsWith('en-')) return 'en';
    return fallback;
  } catch {
    return fallback;
  }
}
