/** T554 · 契约门夹具（收进仓的 T351-v15 复核席夹具，**本席自写、不复用作者脚本的夹具**）。
 *
 * 设计要点（照原样保留，别改——改这里等于改判据的靶子）：
 *  - 周一「凌晨」第 1 个动作＝爬楼机（有氧 30 分钟）⇒ 正是运行时里 `data-d/data-s/data-m` 全缺时
 *    回落的坐标 (0,0,0)。锁周有氧输入写值若落错目标，会**看得见**：第 1 周周一那行变成新值。
 *  - 周四「晚上」第 1 个动作＝椭圆机（有氧 20 分钟）⇒ 这是**要做的那次编辑**的目标 (d=3,s=1,m=0)。
 *    它不等于 (0,0,0)，所以「打算改的那一行」与「真被改的那一行」可分辨。
 */

export const LIB = [
  { name: '悍马机卧推', part: '胸', type: '主要', equip: '器械', kind: '力量', goal: '胸整体' },
  { name: '史密斯机深蹲', part: '腿', type: '主要', equip: '器械', kind: '力量', goal: '股四头' },
  { name: '宽距下拉', part: '背', type: '主要', equip: '器械', kind: '力量', goal: '背宽度' },
  { name: '爬楼机', part: '腿', type: '有氧', equip: '器械', kind: '有氧', goal: '' },
  { name: '椭圆机', part: '全身', type: '有氧', equip: '器械', kind: '有氧', goal: '' },
];

const lib = (name) => LIB.find((x) => x.name === name);
export const mv = (name, o = {}) => {
  const h = lib(name);
  return {
    name, part: h.part, type: h.type, equip: h.equip, kind: h.kind, goal: h.goal,
    sets: o.sets ?? 4, reps: o.reps ?? 10, mode: o.mode ?? 'kg', load: o.load ?? 0,
    minutes: o.minutes ?? (h.kind === '有氧' ? 30 : 0),
  };
};
const ses = (slot, moves) => ({ slot, moves });
const day = (sessions) => ({ sessions });
const blank = () => Array.from({ length: 7 }, () => ({ sessions: [] }));

export const BASE = {
  title: '四天力量加有氧',
  startDate: '2026-09-14',
  slots: ['凌晨', '上午', '下午', '晚上'],
  maxSessionsPerDay: 4,
  maxMovesPerSession: 6,
  libSource: '动作库：内置示例',
  lib: LIB,
  wakeWord: '定训练计划',
};

/** 母版周 7 天。 */
export const MASTER_DAYS = [
  day([ses('凌晨', [mv('爬楼机', { minutes: 30 })]), ses('上午', [mv('悍马机卧推', { sets: 5, reps: 10, load: 35 })])]),
  day([ses('下午', [mv('宽距下拉', { sets: 4, reps: 10, load: 50 })])]),
  day([]),
  day([ses('上午', [mv('史密斯机深蹲', { sets: 5, reps: 8, load: 70 })]), ses('晚上', [mv('椭圆机', { minutes: 20 })])]),
  day([]), day([]), day([]),
];

const clone = (locked) => ({ locked, days: JSON.parse(JSON.stringify(MASTER_DAYS)) });
const master = (locked) => ({ locked, days: JSON.parse(JSON.stringify(MASTER_DAYS)) });
const weeks12 = () => Array.from({ length: 12 }, (_, i) => (i === 0 ? master(false) : clone(true)));

/** 五个状态：空态／母版周／锁住的周／12 周／尾周全解锁（＝页面自己「加一周」造出来的周就是这个形状）。 */
export function states() {
  return {
    '01-空态': { ...BASE, weeks: [] },
    '02-母版周': { ...BASE, weeks: [master(false), clone(true), clone(true), clone(true)] },
    '03-锁住的周': { ...BASE, weeks: [master(false), clone(true), clone(true), clone(true)], openWeek: 2 },
    '04-12周': { ...BASE, weeks: weeks12() },
    '05-尾周全解锁': { ...BASE, weeks: [master(false), clone(false), clone(false)], openWeek: 1 },
  };
}

/** 夹具自证：这些都必须在盘上真的成立，否则后面的读数没有意义。 */
export const FIXTURE_FACTS = {
  cardioAtOrigin: '周一 凌晨 第 1 个动作＝爬楼机（有氧 30 分钟）',
  cardioAtTarget: '周四 晚上 第 1 个动作＝椭圆机（有氧 20 分钟）',
  strengthOnDay0: '周一 上午 第 1 个动作＝悍马机卧推（力量 5 组乘 10 次 35 kg）',
};
