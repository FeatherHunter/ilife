// 心愿类·归属标记（#661，#665 回归老口径）：远端对象上「可反查回本地」的那一格。
// 老家逐字：描述写 `原备忘 #{memo_id}`（`feishu_sync.py:328`），反向对账用 `原备忘\s*#(\d+)` 扫 description
// （`feishu_sync.py:617`、`:626`）。老飞书 task 不支持 extra 字段，注解里写死「只能靠描述反查」（`:323-324`）。
// 老 id 是自增整数——DB 对齐后本仓 id 也是整数，正则回归老逐字（#661 的放宽正则是 JSON 串 id 时代的，已退役）。

/** 写进远端描述的归属标记。 */
export function ownershipMark(noteId: number): string {
  return '原备忘 #' + noteId;
}

const MARK_RE = /原备忘\s*#(\d+)/;

/** 从远端描述里反查本地笔记 id；没有标记即 null（不返空串冒充命中）。 */
export function ownerIdOf(description: string): number | null {
  const m = MARK_RE.exec(description ?? '');
  return m ? Number(m[1]) : null;
}
