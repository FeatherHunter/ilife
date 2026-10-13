/**
 * 对账行（CHECK）里「编号段」的画法——只定这一件事。
 *
 * 用户 2026-10-13 裁定（会话 m02072 选「甲」）：小集逐号列全；大集只列前几个＋写总个数。
 * 改前的毛病：4175 条时逐号列全＝28,683 字节的一行数字墙（读数见票 #1279 的证据评论）。
 *
 * 分隔符与前后文不归本件管：各页照各自的原型写（w01 半角 /、w03 全角 ／，刻意不统一）。
 */

/** 超过这个数就不再逐号列全。 */
export const CHECK_ID_LIMIT = 20;

/** 大集时先列几个编号。 */
export const CHECK_ID_HEAD = 8;

/** 对账行的编号段：小集 `1、2、3`；大集 `1、…、8 等 4175 个`。 */
export function checkIdText(ids: readonly (string | number)[]): string {
  const all = ids.map((id) => String(id));
  if (all.length <= CHECK_ID_LIMIT) return all.join('、');
  return all.slice(0, CHECK_ID_HEAD).join('、') + ' 等 ' + String(all.length) + ' 个';
}
