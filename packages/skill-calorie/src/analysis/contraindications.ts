/** T5 #24 · 禁忌扫描（对照老家 scripts/contraindications/{soft_rules,validators,scanner}.py）。
 *
 * 心法层（规则数据：腰/膝/肩 + SAFE_VARIANTS 白名单）+ 硬规则层（子串匹配，
 * 英文大小写不敏感，级别不可降级）+ 编排层（读 workout_plans → 汇总 Hit →
 * by_severity → summary_status ok/warn/fail + 替代建议）。DB 由调用方传入
 * （显式路径；缺失由 openDb 侧阻断，不在此静默）。
 */
import type { DatabaseSync } from 'node:sqlite';

export type Severity = 'info' | 'warn' | 'error';
export type ContraPart = '腰' | '膝' | '肩';
export const CONTRA_PARTS: ContraPart[] = ['腰', '膝', '肩'];

export const SAFE_VARIANTS: string[] = ['支撑式', '俯卧', '仰卧', '高位'];

export function isSafeVariant(name: string): boolean {
  return SAFE_VARIANTS.some((v) => name.includes(v));
}

export interface ContraRule { part: ContraPart; name: string; reason: string; keywords: string[]; severity: Severity }

const LUMBAR: ContraRule[] = [
  { part: '腰', name: '髋铰链轴向压力', reason: '硬拉/罗马尼亚硬拉/早安式弯腰会让腰椎承受巨大轴向压力,突出节段受挤压加重', keywords: ['硬拉', '罗马尼亚', '早安', 'good morning', '臀桥'], severity: 'error' },
  { part: '腰', name: '俯身/弯腰划船类', reason: '俯身角度超过 45° 时腰部竖脊肌持续等长收缩 + 腰椎剪切力,T-bar 划船最危险', keywords: ['俯身', 't-bar', 'tbar', 't bar', '杠铃划船'], severity: 'warn' },
  { part: '腰', name: '腿举/倒蹬类', reason: '倒蹬器械在膝屈曲 + 髋屈曲时腰椎屈曲代偿,突出节段受压(用户已主动删除器械倒蹬)', keywords: ['倒蹬', '腿举', 'smith 机深蹲'], severity: 'error' },
  { part: '腰', name: '坐姿腿弯举', reason: '腘绳肌在屈膝时收缩牵拉坐骨结节,导致骨盆前倾 + 腰椎屈曲,加重突出', keywords: ['腿弯举', '坐姿腿弯举', '俯卧腿弯举'], severity: 'error' },
];

const KNEE: ContraRule[] = [
  { part: '膝', name: '大重量深蹲/全蹲', reason: '超过 90° 深度 + 大重量会让髌股关节压力激增,半月板承受剪切', keywords: ['深蹲', '全蹲', '高杠深蹲', '低杠深蹲', '前蹲'], severity: 'warn' },
  { part: '膝', name: '跳跃/冲击类', reason: '跳跃落地时膝关节承受 5-7 倍体重冲击,半月板/韧带风险高', keywords: ['跳箱', 'box jump', '跳跃', '冲刺跑'], severity: 'warn' },
  { part: '膝', name: '开链伸膝大重量', reason: '坐姿腿屈伸(开链)大重量时髌腱张力极高,易诱发髌腱炎', keywords: ['腿屈伸', 'leg extension'], severity: 'info' },
];

const SHOULDER: ContraRule[] = [
  { part: '肩', name: '颈后推举', reason: '颈后推举时肩关节外旋 + 极度外展,肩峰下撞击综合征风险极高', keywords: ['颈后推举', '颈后推', 'behind neck press'], severity: 'error' },
  { part: '肩', name: '大重量直立划船', reason: '直立划船到顶端时肩关节内旋 + 外展,肩峰撞击 + 肩袖肌群挤压', keywords: ['直立划船', 'upright row'], severity: 'warn' },
  { part: '肩', name: '过头推举大重量', reason: '过头推举超过头部时肱骨大结节与肩峰撞击,肩袖肌群受压', keywords: ['过头推举', 'overhead press', '推举过头'], severity: 'warn' },
  { part: '肩', name: '大幅度侧平举', reason: '侧平举超过 90° 时肩峰下空间消失,冈上肌撞击', keywords: ['侧平举', 'lateral raise'], severity: 'info' },
];

export const ALL_RULES: Record<ContraPart, ContraRule[]> = { '腰': LUMBAR, '膝': KNEE, '肩': SHOULDER };

export function rulesFor(part: string): ContraRule[] {
  return (ALL_RULES as Record<string, ContraRule[]>)[part] ?? [];
}

export interface Hit { movementName: string; part: string; ruleName: string; severity: Severity; reason: string; usedIn: string[]; safeVariant: boolean }

function matches(name: string, keyword: string): boolean {
  return name.toLowerCase().includes(keyword.toLowerCase());
}

export function matchOne(name: string, rule: ContraRule): boolean {
  return rule.keywords.some((kw) => matches(name, kw));
}

/** 单动作扫描：每部位一个 slot（无命中为空数组，顺序稳定）。 */
export function scanMovement(name: string, parts: string[] = [...CONTRA_PARTS]): ContraRule[][] {
  return parts.map((part) => rulesFor(part).filter((r) => matchOne(name, r)));
}

const SEV_ORDER: Record<Severity, number> = { error: 3, warn: 2, info: 1 };

export function worstSeverity(rules: ContraRule[]): Severity | null {
  if (rules.length === 0) return null;
  return rules.reduce((a, b) => (SEV_ORDER[b.severity] > SEV_ORDER[a.severity] ? b : a)).severity;
}

export function scanAllMovements(movements: Array<{ name?: string }>, parts: string[] = [...CONTRA_PARTS]): Hit[] {
  const hits: Hit[] = [];
  for (const m of movements) {
    const name = m.name ?? '';
    const safe = isSafeVariant(name);
    for (const [i, part] of parts.entries()) {
      void i;
      for (const rule of scanMovement(name, parts)[parts.indexOf(part)] as ContraRule[]) {
        hits.push({ movementName: name, part, ruleName: rule.name, severity: rule.severity, reason: rule.reason, usedIn: [], safeVariant: safe });
      }
    }
  }
  return hits;
}

export interface PlanScan { scannedSessions: number; scannedMovements: number; scannedParts: string[]; safeSkipped: number; hits: Hit[]; byMovement: Record<string, { count: number; severity: Severity; rules: string[]; usedIn: string[]; parts: string[] }>; bySeverity: Record<Severity, number>; summaryStatus: 'ok' | 'warn' | 'fail'; suggestions: Array<{ movement: string; rule: string; reason: string; replace: string; safeExamples: string[] }> }

export function scanPlan(db: DatabaseSync, part: string = 'all'): PlanScan {
  const parts: string[] = part === 'all' ? [...CONTRA_PARTS] : [part];
  const plansRaw = db.prepare(
    'SELECT week_number AS wn, day_of_week AS dow, session_index AS si, session_label AS label, movements AS movs FROM workout_plans ORDER BY week_number, day_of_week, session_index',
  ).all() as unknown as Array<{ wn: number; dow: number; si: number; label: string; movs: string | null }>;
  const plans: Array<[number, number, number, string, string | null]> = plansRaw.map((r) => [r.wn, r.dow, r.si, r.label, r.movs]);
  const hits: Hit[] = [];
  const byMovement = new Map<string, Hit[]>();
  let movementCount = 0;
  let safeSkipped = 0;
  for (const p of plans) {
    const movements = JSON.parse(p[4] || '[]') as Array<{ name?: string }>;
    const usage = 'W' + p[0] + 'D' + p[1] + '(' + p[3] + ')';
    for (const m of movements) {
      movementCount += 1;
      const name = m.name ?? '';
      const safe = isSafeVariant(name);
      for (const [pi, ppart] of parts.entries()) {
        void pi;
        for (const rule of scanMovement(name, parts)[parts.indexOf(ppart)] as ContraRule[]) {
          const hit: Hit = { movementName: name, part: ppart, ruleName: rule.name, severity: rule.severity, reason: rule.reason, usedIn: [usage], safeVariant: safe };
          if (hit.safeVariant) { safeSkipped += 1; continue; }
          hits.push(hit);
          if (!byMovement.has(name)) byMovement.set(name, []);
          (byMovement.get(name) as Hit[]).push(hit);
        }
      }
    }
  }
  const bySeverity: Record<Severity, number> = { error: 0, warn: 0, info: 0 };
  for (const h of hits) bySeverity[h.severity] += 1;
  const byMovementSummary: PlanScan['byMovement'] = {};
  for (const [name, list] of byMovement) {
    const usedIn = [...new Set(list.flatMap((h) => h.usedIn))].sort();
    const rules = [...new Set(list.map((h) => h.ruleName))].sort();
    const sevList = list.map((h) => ({ severity: h.severity } as ContraRule));
    byMovementSummary[name] = {
      count: list.length,
      severity: (worstSeverity(sevList) ?? 'info') as Severity,
      rules,
      usedIn,
      parts: [...new Set(list.map((h) => h.part))].sort(),
    };
  }
  const status = bySeverity.error > 0 ? 'fail' : bySeverity.warn > 0 ? 'warn' : 'ok';
  const suggestions: PlanScan['suggestions'] = [];
  const seen = new Set<string>();
  for (const hit of hits) {
    if (seen.has(hit.movementName) || hit.safeVariant) continue;
    seen.add(hit.movementName);
    suggestions.push({
      movement: hit.movementName,
      rule: hit.ruleName,
      reason: hit.reason,
      replace: '用含 ' + SAFE_VARIANTS.slice(0, 3).join('/') + ' 等关键字的安全变体',
      safeExamples: SAFE_VARIANTS.slice(0, 4),
    });
  }
  return { scannedSessions: plans.length, scannedMovements: movementCount, scannedParts: parts, safeSkipped, hits, byMovement: byMovementSummary, bySeverity, summaryStatus: status, suggestions };
}
