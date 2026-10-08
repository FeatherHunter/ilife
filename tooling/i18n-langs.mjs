#!/usr/bin/env node
/**
 * 语言列地基（#1199 门禁改造 ①②③ 的共用件，落在 tooling 是刻意的）：
 * 「加一门语言＝加一条语言名册」，门只从这里读语言事实，不各写各的。
 *
 * 为什么是 tooling 而不是 packages/：本件是**门的输入**不是产品代码。产品侧的语言唯一定义地
 * 仍是 packages/base-link-core/src/config/language.ts（#1198／ADR-0004 §4）；两者关系用
 * LANGUAGES 数组逐条对账（见 sameRoster／--selftest），不靠人记。
 *
 * 三件事，各管一半：
 *   ① 语言列（column）：一门语言一份**账本文件**。中文列＝存量路径（文件名不含 .en.），英文列＝
 *      <主体>.en.<后缀>。**中文账本一个字都不许改**（加字段＝字节变＝破坏「中文列逐字节不变」），
 *      所以语言身份由**文件名**承载，不进账本正文。
 *   ② 排印名册（register）：语言无关的结构约束（不溢出／不换行／字号下限／盒模型）＝所有语言同一套；
 *      语言相关的书写习惯（并列分隔符集、段长上限、半角标点集、允许清单）＝**每种语言一套阀值**。
 *      口径依据：ADR-0004 §6「门只锁结构与行为，不锁文案字面」。
 *   ③ 扫描面纪律：范围为空时的报法（照 tooling/check-base-floor.mjs:22／:139 先例：
 *      缩面＝放宽，扫描面为空不许当绿）。本件只给判词，判定由各门自己落。
 *
 * 用法：被各门 import；亦可直接跑 `node tooling/i18n-langs.mjs --list`／`--selftest`。
 * 零依赖（只 node: 内置），不改任何文件。
 */

/** 语言闭集。与 packages/base-link-core/src/config/language.ts 的 AVAILABLE_LANGUAGES 逐字对账。 */
export const LANGUAGES = ['zh', 'en'];

/** 缺省语言＝基准语言（其余语言的缺词条回退链终点）。与 base-link-core 的 DEFAULT_LANGUAGE 同值。 */
export const DEFAULT_LANGUAGE = 'zh';

/** 产品侧唯一定义地（只作对账引用，本件不 import 它——门要在没有 dist 时也能读语言事实）。 */
export const ROSTER_SOURCE = 'packages/base-link-core/src/config/language.ts';

/** 账本文件名里，非缺省语言的后缀段（zh 不带，存量路径不动）。 */
export function langSuffix(lang) {
  if (!LANGUAGES.includes(lang)) throw new Error('未知语言：' + lang + '（可用：' + LANGUAGES.join('、') + '）');
  return lang === DEFAULT_LANGUAGE ? '' : '.' + lang;
}

/** 账本路径：base 例 'tooling/skill-html.snapshot.json' ＋ zh→原样／en→'tooling/skill-html.snapshot.en.json'。
 *  语言段插在**最后一个点之前**（即扩展名之前），不插在第一个点：基数里本来就有 'snapshot' 这一段。 */
export function ledgerPath(base, lang) {
  const s = String(base);
  const dot = s.lastIndexOf('.');
  if (dot < 0) throw new Error('账本路径须带扩展名：' + s);
  return s.slice(0, dot) + langSuffix(lang) + s.slice(dot);
}

/** normalizeLang：空串／undefined → 缺省语言；非闭集值 → 抛（不静默吞）。 */
export function normalizeLang(raw) {
  if (raw === undefined || raw === null || raw === '') return DEFAULT_LANGUAGE;
  const t = String(raw);
  if (!LANGUAGES.includes(t)) {
    throw new Error('未识别语言：' + t + '（可用：' + LANGUAGES.join('、') + '；出处 ' + ROSTER_SOURCE + '）');
  }
  return t;
}

/** 从 argv 摘 --lang <值>／--lang=<值>；不给＝缺省语言。 */
export function langFromArgv(argv) {
  const a = argv ?? [];
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] === '--lang') {
      if (a[i + 1] === undefined) throw new Error('--lang 须带一个语言值（可用：' + LANGUAGES.join('、') + '）');
      return normalizeLang(a[i + 1]);
    }
    if (a[i].startsWith('--lang=')) return normalizeLang(a[i].slice('--lang='.length));
  }
  return DEFAULT_LANGUAGE;
}

// 排印名册（语言无关约束 ＋ 语言相关阀值）

/**
 * 语言无关的结构约束（所有语言同一套，**不许按语言放宽**）：
 * 这几条才是「排印门」的谓词本体——文案换成英文也照判。
 *
 *   overflow    版心不得溢出（量盒模型，不量字）
 *   noWrap      版式位不得被顶到换行（单行元素真单行）
 *   fontFloor   最小字号下限（px）
 *   touchTarget 可点面积下限（px）
 *   boxModel    间距／内边距／宽高必须落在 4px 栅格上
 */
export const STRUCTURAL_RULES = [
  { id: 'overflow', zh: '版心不溢出', kind: 'geometry' },
  { id: 'noWrap', zh: '版式位不换行', kind: 'geometry' },
  { id: 'fontFloor', zh: '最小字号下限', kind: 'metric', unit: 'px' },
  { id: 'touchTarget', zh: '可点面积下限', kind: 'metric', unit: 'px' },
  { id: 'boxModel', zh: '盒模型落 4px 栅格', kind: 'metric', unit: 'px' },
];

/**
 * 语言相关的书写习惯阀值（每种语言一套；解释见每一行的 why）。
 * 这不是「结构约束」，是**该语言的正确写法**：中文列禁中圆点／全角竖线／全角分号并列、
 * 禁英文裸词与半角标点；英文列正相反——拉丁字母与半角标点就是它的正常形态，
 * 所以名册只判「混排」不判「出现」。
 */
export const LANG_REGISTERS = {
  zh: {
    label: '中文列',
    separators: ['·', '｜', '；'],
    maxSegChars: 40,
    halfPunct: '[,;:!?()[\\]{}"\'<>/\\\\~.\u0060]',
    allow: [
      { re: '\\d{4}-\\d{2}-\\d{2}', why: '日期（2026-09-21）' },
      { re: '\\d{1,2}:\\d{2}(?::\\d{2})?', why: '时间（19:26:06）' },
      { re: '#\\d+', why: '记录号（#2）：数据引用，不是标点懒政' },
      { re: '\\bAI\\b', why: '通用术语 AI（页面写「粘贴给 AI」，无更清楚的中文替词）' },
    ],
    bareLatinIsFault: true,
    fontFloorPx: 11,
    boxGridPx: 4,
    scriptRe: '[\\u4e00-\\u9fff]',
    why: '存量基准语言：哈希基线已冻结（194 件＋44 张页＋calorie 2 件），数值只许逐字节不变。',
  },
  en: {
    label: '英文列',
    separators: [],
    maxSegChars: 80,
    halfPunct: '[，。；：！？（）【】、「」]',
    allow: [
      { re: '\\d{4}-\\d{2}-\\d{2}', why: '日期（2026-09-21）' },
      { re: '\\d{1,2}:\\d{2}(?::\\d{2})?', why: '时间（19:26:06）' },
      { re: '#\\d+', why: '记录号（#2）：数据引用' },
      { re: '\\bAI\\b', why: '通用术语 AI' },
    ],
    bareLatinIsFault: false,
    fontFloorPx: 12,
    boxGridPx: 4,
    scriptRe: '[A-Za-z]',
    why: '英文按需：账本骨架先立（0 件＝待录入），迁移票按批次录入；不得与中文列共用同一份账本。',
  },
};

/** 取某语言的排印名册（未识别即抛）。 */
export function registerOf(lang) {
  const t = normalizeLang(lang);
  return LANG_REGISTERS[t];
}

/** 某语言是否判「裸拉丁词」为缺陷。 */
export function bareLatinIsFault(lang) {
  return registerOf(lang).bareLatinIsFault;
}

/** 全部语言名册（列表用；顺序＝LANGUAGES）。 */
export function allRegisters() {
  return LANGUAGES.map((l) => ({ lang: l, ...LANG_REGISTERS[l] }));
}

// 扫描面纪律

/** 范围为空时的判词（照 tooling/check-base-floor.mjs:22／:139 先例）。 */
export const EMPTY_SCOPE_VERDICT = '范围 0 件：扫描面为空——缩面＝放宽，不许空转当绿（先登记范围清单）';

/** 范围为空时的报法：**必须**显式印出来，不许静默绿（新门起步绿 ≠ 空转绿）。 */
export function reportEmptyScope(name, scopeFile) {
  return 'EMPTY-SCOPE ' + name + ' ' + EMPTY_SCOPE_VERDICT + '（清单：' + scopeFile + '）';
}

// 对账与 CLI

/** LANGUAGES 与产品侧唯一定义地的对账（由调用方喂两份名单）。 */
export function sameRoster(a, b) {
  const x = [...a].sort();
  const y = [...b].sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

const isEntry = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tooling/i18n-langs.mjs');

if (isEntry) {
  const argv = process.argv.slice(2);
  if (argv.includes('--list')) {
    for (const r of allRegisters()) {
      console.log([r.lang, r.label,
        'separators=' + JSON.stringify(r.separators),
        'maxSegChars=' + r.maxSegChars,
        'fontFloorPx=' + r.fontFloorPx,
        'bareLatinIsFault=' + r.bareLatinIsFault,
        'ledger=' + ledgerPath('tooling/skill-html.snapshot.json', r.lang),
      ].join('  '));
      console.log('  why: ' + r.why);
    }
    console.log('RESULT: languages=' + LANGUAGES.length + ' default=' + DEFAULT_LANGUAGE);
    process.exit(0);
  }
  if (argv.includes('--selftest')) {
    const bad = [];
    const want = (cond, msg) => { if (!cond) bad.push(msg); };
    want(ledgerPath('tooling/skill-html.snapshot.json', 'zh') === 'tooling/skill-html.snapshot.json',
      '中文列必须落在存量路径上（不加后缀）');
    want(ledgerPath('tooling/skill-html.snapshot.json', 'en') === 'tooling/skill-html.snapshot.en.json',
      '英文列必须另起一份账本');
    want(ledgerPath('tooling/calorie-html.snapshot.json', 'zh') === 'tooling/calorie-html.snapshot.json',
      'calorie 中文列必须落在存量路径上');
    want(normalizeLang('') === 'zh' && normalizeLang(undefined) === 'zh', '空值须落缺省语言');
    want(langFromArgv(['--lang', 'en']) === 'en' && langFromArgv([]) === 'zh', 'argv 摘取');
    want(registerOf('zh').maxSegChars < registerOf('en').maxSegChars, '英文段长上限须宽于中文');
    want(registerOf('en').separators.length === 0, '英文列不得把半角分号当懒政');
    want(STRUCTURAL_RULES.length >= 3, '语言无关结构约束至少三条');
    let threw = false;
    try { normalizeLang('ja'); } catch { threw = true; }
    want(threw, '未识别语言必须抛（不许静默落缺省）');
    if (bad.length) { for (const b of bad) console.error('FAIL ' + b); process.exit(1); }
    console.log('SELFTEST: 语言列路径／缺省／名册阀值分列 OK（' + LANGUAGES.length + ' 门语言）');
    process.exit(0);
  }
  console.error('用法：node tooling/i18n-langs.mjs --list|--selftest');
  process.exit(2);
}
