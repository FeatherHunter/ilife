// Star History 纯函数：聚合与补零，不含 IO。
//
// 迁移说明（票 #12）：由 dsh-prompt / dsh-mattpocock-skills-deck 的同名实现转写而来
// （那边是 .mts，本仓 tooling 统一 .mjs）。行为与上游一致：
//   输入 starred_at 的 ISO 串数组 → 按 UTC 日聚合 → 累计 total，按 date 升序输出。
// 见 docs/star-history.json 与 tooling/update-star-history.mjs。

/**
 * 把 GitHub 星标时间戳聚合成按天累计曲线。
 * @param {string[]} starredAtList ISO 8601 时间戳数组（.starred_at）
 * @returns {{date: string, total: number, daily: number}[]} 按 date 升序
 */
export function aggregateByDay(starredAtList) {
  if (!Array.isArray(starredAtList) || starredAtList.length === 0) return [];
  const dayCounts = new Map();
  for (const iso of starredAtList) {
    if (typeof iso !== 'string' || !iso) continue;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) continue;
    const key = d.toISOString().slice(0, 10); // YYYY-MM-DD UTC
    dayCounts.set(key, (dayCounts.get(key) || 0) + 1);
  }
  const sortedDays = Array.from(dayCounts.keys()).sort();
  let running = 0;
  return sortedDays.map((date) => {
    const daily = dayCounts.get(date) || 0;
    running += daily;
    return { date, total: running, daily };
  });
}

/** 零星日的起点：首日前一天补 {total:0,daily:0}，两条曲线都从原点起画。
 * 幂等（首行已是 0 就直接返回）；空数组保持空（“拉不到数据不动产物”的语义归更新脚本）。 */
export function withZeroStart(days) {
  if (!Array.isArray(days) || days.length === 0) return [];
  const first = days[0];
  if (first.total === 0 && first.daily === 0) return days;
  const prev = new Date(first.date + 'T00:00:00Z');
  prev.setUTCDate(prev.getUTCDate() - 1);
  return [{ date: prev.toISOString().slice(0, 10), total: 0, daily: 0 }, ...days];
}
