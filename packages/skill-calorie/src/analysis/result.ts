/** T5 #24 · 分析结果包络（对照老家 as_dict=True 形状）。
 *
 * 有规则口径 → {status:'ok', data, message}；无数据 → {status:'error', data:null,
 * message} 明确缺失阻断（验收：无规则 rejection 有明确缺失阻断，不返空）。
 * 输入非法（坏日期/坏枚举）→ 抛 FetchError。L6 开放式分析留 AI，不在此建模。
 */

export type AnalysisStatus = 'ok' | 'error';

export interface AnalysisResult<T> {
  status: AnalysisStatus;
  data: T | null;
  message: string;
}

export function ok<T>(data: T, message: string): AnalysisResult<T> {
  return { status: 'ok', data, message };
}

export function rejection<T = never>(message: string): AnalysisResult<T> {
  return { status: 'error', data: null as T, message };
}
