/** #422 · 字段中文标签的**查表口径**（技能层共用件）。
 *
 * 本件只给口径：`fieldLabel(域, 键)` 怎么查、查不到怎么回退。**标签表本身不住在这里**——
 * 按域住在各自能力目录（结构标准：共用位里不许出现任何一个能力的名字），运动域那张住
 * `src/exercise/`。第二个域有表时照同一口径 `registerFieldLabels(域, 表)` 登记。
 *
 * 两条口径：
 *   ① 缺项回退**原键名**，不回退英文标签、不编词（老实物 `FIELD_LABELS[col] ?? col` 同口径）；
 *   ② 同一个域只许登记一次（域表一个定义地）；同域二次登记即报错，挡在开工前。
 */
import { CalorieRenderError } from '../render/errors.js';

/** 域 → 标签表（登记即冻结拷贝，防调用方事后改表）。 */
const DOMAIN_TABLES = new Map<string, Readonly<Record<string, string>>>();

/** 登记一个域的字段标签表（同域二次登记即报错；空表不登记）。 */
export function registerFieldLabels(domain: string, table: Readonly<Record<string, string>>): void {
  if (typeof domain !== 'string' || domain.trim() === '') {
    throw new CalorieRenderError('bad-input', 'registerFieldLabels: domain 必须是非空字符串');
  }
  if (table === null || typeof table !== 'object' || Array.isArray(table)) {
    throw new CalorieRenderError('bad-input', 'registerFieldLabels: ' + domain + ' 的标签表必须是对象');
  }
  const name = domain.trim();
  if (Object.keys(table).length === 0) {
    throw new CalorieRenderError('bad-input', 'registerFieldLabels: ' + name + ' 的标签表是空的（空表不登记）');
  }
  if (DOMAIN_TABLES.has(name)) {
    throw new CalorieRenderError('bad-input', 'registerFieldLabels: 域 ' + name + ' 已登记过标签表（一个域只许一处定义）');
  }
  DOMAIN_TABLES.set(name, Object.freeze({ ...table }));
}

/** 查域内字段的中文标签：命中给标签，未命中／未登记域一律回退**原键名**。 */
export function fieldLabel(domain: string, key: string): string {
  if (typeof key !== 'string') {
    throw new CalorieRenderError('bad-input', 'fieldLabel: key 必须是字符串');
  }
  const table = DOMAIN_TABLES.get(typeof domain === 'string' ? domain : '');
  if (table === undefined) return key;
  const label = table[key];
  return typeof label === 'string' && label !== '' ? label : key;
}
