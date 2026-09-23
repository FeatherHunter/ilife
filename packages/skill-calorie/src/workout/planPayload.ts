/** #948 · 计划编辑器页那条**落库命令**的载荷：TS 侧与页内运行时**同一份**出处。
 *
 * 这一件收三件事，都围着「交付页上复制到的那条命令」转：
 *   ① 命令模板（`calorie-cmd-read calorie.workout.plan-set --params '{"plan":…}'`）；
 *   ② 按编辑器状态把 `plan` 参数拼出来的那段逻辑（**一份源**：TS 侧真函数 ＋ 进页面的 JS 文本由它派生）；
 *   ③ 一个动作的器材归属映射（与写侧校验器 `planStore.ts` 的 `inferEquipment` 同表同序）。
 *
 * ## 为什么要有这一件（`#944` 故障 9② 的病根）
 *
 * 编辑器页原先出的是**自然语言**（「请你加载技能…明细见下面的计划表」），页面底部那块复制区还印着
 * 一句占位串；TS 侧与页内各写一份，两处走散。这一页要交付的东西其实只有一件：一条**贴给 AI 就能
 * 落库**的命令。它得跟着页内状态变（用户加了几周、改了几组），所以页内必须能现拼；而「命令长什么样」
 * 不能由页内那段 JS 自己说了算。
 *
 * 于是本件把那两段逻辑写成**一份源**：`EQUIP_OF_JS` 与 `PLAN_PAYLOAD_JS` 是那段 JS 的正文（逐字进页面，
 * 故只许用老式写法：`var`／`function`／字面量正则），下面的 `equipOf()`／`planEditorPayload()` 由它们
 * 派生（`new Function`，无闭包依赖），两处产物因此必然同表同序。测试件拿同一份状态逐字比对两处产物，
 * 漂移即红。
 *
 * 口径：命令原文的拼法与 `shared/writeParts.ts` 的 `commandLine` 同形；这条命令**会改数据库**且
 * **整份替换**（`writePlanSet` 先全量校验，有硬止即 `exit 2` 不写库），页上少排的周落库后就没了——
 * 所以页底预览块与复制按钮给的是同一串，就是要人先看清再贴。
 */
import type { EditorDay, EditorSession, EditorState, EditorWeek } from './planEditor.js';

/** 载荷里那个标记（模板与被换出来的串都靠它对齐）。 */
export const PLAN_MARKER = '__PLAN__';

/** 页内那条命令的模板：`calorie.workout.plan-set` ＋ 本次状态（口径与 `commandLine` 逐字同形）。 */
export const PLAN_SET_COMMAND_TEMPLATE = "calorie-cmd-read calorie.workout.plan-set --params '{\"plan\":__PLAN__}'";

/** 器材归属：照 `planStore.ts` 的 `EQUIPMENT_KEYWORDS` 同一张关键词表与同一次序（认不出的动作不给）。
 *
 * 这一段是**进页面的 JS 正文**（逐字），所以只许老式写法；TS 侧那份由它派生，不另抄。 */
export const EQUIP_OF_JS = `
  function equipOf(name){
    var n = String(name || '');
    if (/悍马机|悍马|坐姿器械|器械划船|器械推胸/.test(n)) return '悍马机';
    if (n.indexOf('蝴蝶机') >= 0) return '蝴蝶机';
    if (n.indexOf('史密斯') >= 0) return '史密斯机';
    if (n.indexOf('哑铃') >= 0) return '哑铃';
    if (/杠铃|卧推|划船|硬拉|深蹲/.test(n)) return '杠铃';
    if (/绳索|龙门架/.test(n)) return '绳索';
    if (n.indexOf('健腹轮') >= 0) return '健腹轮';
    if (n.indexOf('弹力带') >= 0) return '弹力带';
    if (/平板|俯卧撑|卷腹|臀桥|支撑/.test(n)) return '瑜伽垫';
    return '';
  }`;

/** 计划 → 写侧那份 `plan` 参数：**进页面的 JS 正文**（逐字）。只出有训练的周与天；
 *  时段与起止时间只上屏、不落库（写侧 `PlanSessionInput` 没有这两个槽位）。 */
export const PLAN_PAYLOAD_JS = `
  function planPayload(){
    var equip = [], w, d, s, i, mv, e;
    for (w = 0; w < S.weeks.length; w++)
      for (d = 0; d < 7; d++)
        for (s = 0; s < S.weeks[w].days[d].sessions.length; s++)
          for (i = 0; i < S.weeks[w].days[d].sessions[s].moves.length; i++){
            e = equipOf(S.weeks[w].days[d].sessions[s].moves[i].name);
            if (e && equip.indexOf(e) < 0) equip.push(e);
          }
    var weeks = [];
    for (w = 0; w < S.weeks.length; w++){
      var days = [];
      for (d = 0; d < 7; d++){
        var sessions = [];
        for (s = 0; s < S.weeks[w].days[d].sessions.length; s++){
          var se = S.weeks[w].days[d].sessions[s], movements = [];
          for (i = 0; i < se.moves.length; i++){
            mv = se.moves[i];
            var m = { name: mv.name, part: mv.part, type: mv.type };
            m.sets = mv.kind === '有氧'
              ? [ { reps: mv.minutes, weight: 0, unit: '分钟' } ]
              : [ { reps: mv.reps, weight: mv.load, unit: mv.mode === 'rm' ? 'RM' : 'kg' } ];
            movements.push(m);
          }
          sessions.push({ session_label: se.slot, movements: movements });
        }
        if (sessions.length > 0) days.push({ day_of_week: d + 1, sessions: sessions });
      }
      weeks.push({ week_number: w + 1, days: days });
    }
    return JSON.stringify({
      config: { title: S.title, start_date: S.startDate, user_level: '中手', available_equipment: equip },
      weeks: weeks,
    });
  }`;

/** 器材归属的 TS 侧真函数（**由上面那段源派生**：同一段正文，`new Function` 包一层）。 */
const equipOf = new Function('return ' + EQUIP_OF_JS.trim() + ';')() as (name: string | undefined) => string;

/** 页内那段「把模板换成当刻载荷」的 JS 正文。换法走「标记两侧各取一次」——不用 `String.replace`，
 *  免得载荷里的 `$` 被当成替换模式吃掉；标记的名字只写在上面 `PLAN_MARKER` 那一处。 */
export const COMMAND_TEXT_JS = `
  function commandText(){
    var tpl = String(S.setCommand || ''), at = tpl.indexOf(PLAN_MARKER);
    if (at < 0) return '';
    return tpl.slice(0, at) + planPayload() + tpl.slice(at + PLAN_MARKER.length);
  }`.split('PLAN_MARKER').join(JSON.stringify(PLAN_MARKER));

/** 把编辑器状态拼成 `plan` 参数（键序＝写侧读的那一份）。 */
export function planEditorPayload(state: EditorState): string {
  const equip: string[] = [];
  for (const week of state.weeks) {
    for (const day of week.days) {
      for (const session of day.sessions) {
        for (const mv of session.moves) {
          const e = equipOf(mv.name);
          if (e !== '' && !equip.includes(e)) equip.push(e);
        }
      }
    }
  }
  return JSON.stringify({
    config: { title: state.title, start_date: state.startDate, user_level: '中手', available_equipment: equip },
    weeks: weeksPayload(state),
  });
}

/** 按编辑器状态拼出**那条会改数据库的命令**（交付页的载荷与页内运行时给的是同一串）。 */
export function planEditorSetCommand(state: EditorState): string {
  const at = PLAN_SET_COMMAND_TEMPLATE.indexOf(PLAN_MARKER);
  return PLAN_SET_COMMAND_TEMPLATE.slice(0, at) + planEditorPayload(state)
    + PLAN_SET_COMMAND_TEMPLATE.slice(at + PLAN_MARKER.length);
}

/** 把编辑器状态翻成写侧那份 `weeks`（与上面那段 JS 正文同一口径）。 */
function weeksPayload(state: EditorState): unknown[] {
  const weeks: unknown[] = [];
  for (let w = 0; w < state.weeks.length; w += 1) {
    const week = state.weeks[w] as EditorWeek;
    const days: unknown[] = [];
    for (let d = 0; d < week.days.length; d += 1) {
      const day = week.days[d] as EditorDay;
      const sessions = day.sessions.map((session: EditorSession) => ({
        session_label: session.slot,
        movements: session.moves.map((mv) => ({
          name: mv.name, part: mv.part, type: mv.type,
          sets: mv.kind === '有氧'
            ? [{ reps: mv.minutes, weight: 0, unit: '分钟' }]
            : [{ reps: mv.reps, weight: mv.load, unit: mv.mode === 'rm' ? 'RM' : 'kg' }],
        })),
      }));
      if (sessions.length > 0) days.push({ day_of_week: d + 1, sessions });
    }
    weeks.push({ week_number: w + 1, days });
  }
  return weeks;
}
