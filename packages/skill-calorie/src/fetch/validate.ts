/** T6 #25 · 批量导入校验：与老家 batch_import.validate_record 同规则（只读对照）。 */

export const REQUIRED_FIELDS = [
  'product_name',
  'calories',
  'protein',
  'fat',
  'carbohydrates',
  'sodium',
  'source',
] as const;

export const OPTIONAL_FIELDS = [
  'brand',
  'saturated_fat',
  'sugar',
  'dietary_fiber',
  'note',
  'is_deprecated',
] as const;

export const NUMERIC_FIELDS = [
  'calories',
  'protein',
  'fat',
  'saturated_fat',
  'carbohydrates',
  'sugar',
  'dietary_fiber',
  'sodium',
] as const;

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

/** 单条校验，返回 (是否通过, 错误信息)。规则与老家逐条一致。 */
export function validateRecord(record: unknown): ValidationResult {
  if (typeof record !== 'object' || record === null || Array.isArray(record)) {
    return { ok: false, error: '记录必须是对象' };
  }
  const rec = record as Record<string, unknown>;
  for (const field of REQUIRED_FIELDS) {
    if (!(field in rec) || rec[field] === null || rec[field] === undefined) {
      return { ok: false, error: `缺少必填字段: ${field}` };
    }
    // source 必须如实标注、非空；未知就写“未知”，不许空着
    if (field === 'source') {
      if (typeof rec[field] !== 'string' || (rec[field] as string).trim() === '') {
        return { ok: false, error: 'source 必须是非空字符串(如实记录数据来源，可以是“未知”)' };
      }
    }
    if (field === 'product_name') {
      if (typeof rec[field] !== 'string' || (rec[field] as string).trim() === '') {
        return { ok: false, error: 'product_name 必须是非空字符串' };
      }
    }
  }
  for (const field of NUMERIC_FIELDS) {
    if (field in rec && rec[field] !== null && rec[field] !== undefined) {
      const v = rec[field];
      if (typeof v !== 'number' || Number.isNaN(v)) {
        return { ok: false, error: `${field} 必须是数字` };
      }
      if (v < 0) {
        return { ok: false, error: `${field} 必须 >= 0,当前: ${v}` };
      }
    }
  }
  return { ok: true };
}
