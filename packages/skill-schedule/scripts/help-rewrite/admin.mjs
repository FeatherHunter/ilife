/** #975 · 重写表 · **辅助与管理**（admin 域：3 条唤醒词／3 条场景）。
 *
 * 域内场景（次序与 fixture 一致）：飞书探测、初始化数据库、首次使用。
 * 写法与口径见 `../help-rewrite-base.mjs` 的文件头。
 */
import { F, scene } from '../help-rewrite-base.mjs';

export const SCENES = [
  /* 飞书探测：老 `scope` 的 hint 是三档值（`cli/auth/calendar`）＝闭集 ⇒ `select`。
     留空＝三层全探（老 `all` 那档的口径），故 required=false 并把「空＝全探」写进 hint。 */
  scene(
    'feishu_probe',
    '看看飞书能不能用',
    '飞书探测',
    '我想知道飞书这条路通不通。',
    [
      F('scope', '探测到哪一层(选填)', 'select', false, '空＝三层全探；只关心某一层就选它', {
        options: ['cli', 'auth', 'calendar'],
      }),
    ],
  ),

  /* 初始化数据库：老 `scope` 的 hint 是 `all`（＝建三表这一件事本身，不是用户要挑的值）⇒ 具名丢弃，
     改由意图句承担。 */
  scene(
    'init_default',
    '建好作息的三张表',
    '初始化数据库',
    '帮我把作息要用的数据库建起来。',
    [],
    ['scope'],
  ),

  /* 首次使用：老无维度（零参场景）⇒ 无字段；唤醒词 `首次使用` 本身就是裸词（无序号）。 */
  scene(
    'first_use',
    '第一次用的上手流程',
    '首次使用',
    '我是第一次用它,带我走一遍上手流程。',
    [],
  ),
];
