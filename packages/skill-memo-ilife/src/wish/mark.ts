// 心愿类·归属标记（#661）：远端对象上「可反查回本地」的那一格。
// 老家逐字：描述写 `原备忘 #{memo_id}`（`feishu_sync.py:328`），反向对账用 `原备忘\s*#(\d+)` 扫 description
// （`feishu_sync.py:617`、`:626`）。老飞书 task 不支持 extra 字段，注解里写死「只能靠描述反查」（`:323-324`）。
// 与老实现的一处差异：老 id 是自增整数，本仓 id 是 `m` 开头的 36 进制串 ⇒ 反查正则按本仓 id 的字符集写宽。

/** 写进远端描述的归属标记。 */
export function ownershipMark(noteId: string): string {
  return '原备忘 #' + noteId;
}

const MARK_RE = /原备忘\s*#([A-Za-z0-9]+)/;

/** 从远端描述里反查本地笔记 id；没有标记即 null（不返空串冒充命中）。 */
export function ownerIdOf(description: string): string | null {
  const m = MARK_RE.exec(description ?? '');
  return m ? m[1] : null;
}
