// 口径层·协作与运维校验（老家 家庭协作/family_ops.py + 开始使用/cli.py 对应）。
// care.query kind=borrow|member|firstuse|lint；care.write kind+op 分流；文件预告式。
import { HomePolicyError } from '../fetch/errors.js';

export const CARE_QUERY_KINDS = ['borrow', 'member', 'firstuse', 'lint', 'backup-list'] as const;
export const CARE_WRITE_KINDS = ['borrow', 'member', 'init', 'backup', 'export', 'import-preview', 'import'] as const;

export function parseCareKind(p: Record<string, unknown>, def: string): string {
  const k = (p.kind ?? def) as string;
  if (typeof k !== 'string' || !k) throw new HomePolicyError('POLICY_BAD_INPUT', 'care 须给 kind');
  return k;
}
