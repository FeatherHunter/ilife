#!/usr/bin/env node
/** #511 · P0 回查探针 **v3**：按页 ＋ 按类型 ＋ **全量判定**（v2 住 `.scratch/t509/p0-page-recheck.mjs`）。
 *
 * v2（#509）把「 / 分隔引文」「描述型引文」两类盲区变成了判据，但**面外的行只打印、不判绿**——
 * 于是「告示段」里的残留没人管。v3 收掉这个口子，并补上 v2 自己也有的第三类盲区：
 *
 *   · `substring` 型：照旧查片段，但**短词（不足 4 字）命中不当「还在」**——「常吃」在「常吃榜」里、
 *     「热量」在「热量（千卡）」里都会命中，可那不是残留。这类行必须有**登记判据**，没登记的报
 *     「判据待定」（旧口径在这里会把合法的长词误判成残留，或反过来静默算绿）。
 *   · `slash` 型：按「 / 」拆成备选**逐个在该页**查（不是整串、不是全文）；备选同样受短词口径管。
 *   · `desc` 型：必须命中**具名判据**（同形页判据／同源入口页判据），没登记判据即「判据待定」。
 *   · `已归位`：判据在**别的票的写集**里（落点不在本票声明路径），逐条记归属票与落点，
 *     **不算红、也不算绿**——单列一段，红绿都不吞。
 *
 * 页面范围＝ `row.where` 点名的**那一页**；页不在场即报「缺页」，不当「已清」。
 * 退出码：**全量** 87 条里还有「还在」／「判据待定」／「缺页」，或同形页／同源入口页检查不过 ⇒ 1。
 *
 * 跑法：
 *   node .scratch/t511/p0-page-recheck.mjs             # 全量判定，打逐页残留表
 *   node .scratch/t511/p0-page-recheck.mjs --all       # 另打 87 条逐条全表
 *   node .scratch/t511/p0-page-recheck.mjs --fixtures  # 四类盲区的夹具自证（改坏必红、还原必绿）
 */
import { copyFileSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = 'D:/ilife';
const P0 = join(ROOT, '.scratch/t155o/text-review-P0.md');
const DEFAULT_TEXT = join(ROOT, '.scratch/t511/text');

/** #509 面内的页（保留：逐页表按它分段，读数与上一票对得上）。 */
const SCOPE_PAGES = new Set([
  '33_校验批量导入.txt', '81_看批量导入预览.txt',
  '01_记一餐.txt', '02_记一餐（含备注）.txt', '03_补记饮食.txt',
  '05_拍营养表记一餐.txt', '06_拍营养表补记一餐.txt',
]);

/** #511 本票收的页（面外 10 条残留 ＋ 2 条同源入口页 ＋ 2 条同源入口页的另一半）。 */
const T511_PAGES = new Set([
  '78_看营养素明细.txt', '38_看营养素深度.txt', '80_看今日饮水.txt', '24_看今日喝水.txt',
  '41_看频繁吃榜.txt', '60_饮食复盘（本周）.txt', '75_搜食品.txt', '77_查营养配比.txt',
  '82_看营养分析.txt', '83_看每日六因素.txt',
  '18_看上周饮食.txt', '65_看早餐（最近 7 天）.txt',
]);

/* ── 归位：判据在别的票的写集里（不是本票范围，也不当残留算） ──────────────────────── */

/** #511 · 两条「现象还在、但落点不在本票声明路径」的行。编排者裁定（B）：
 *  归位交接——探针里标「已归位」，**不标红也不标绿**，另在证据件开一节写清现象／落点／建议改法／归属票。 */
const RELOCATED = {
  '18_看上周饮食.txt#43': {
    owner: '#271',
    where: 'packages/skill-calorie/src/render/dietDocs.ts:139-142（buildViewDietDoc 的「按日汇总」表）',
    why: '无记录日的行只出日期与目标值 1800，读者会当成「吃了 1800」（审查件第 43 条）。'
      + '改法是给那一格出不编数的明示（「—（无记录）」）。该件是 #271 票面写明的原地改点，本票声明路径不含它。',
  },
  '65_看早餐（最近 7 天）.txt#63': {
    owner: '#276',
    where: 'packages/skill-calorie/src/home/routes.ts:28 ＋ src/home/today.ts（calorie.view.diet 处理体）',
    why: '页名说只看早餐、正文通篇没有「早餐」二字（审查件第 63 条）。这不是文本问题：5 条餐别词'
      + '（看早餐／午餐／晚餐／加餐／全部餐别分布）全走 calorie.view.diet，参数只有 {"window":"7d"}、'
      + '**餐别参数整个丢失**——正是 #276 票面「接对 4 处」的第 4 处。该件是跨能力命令（场景 01 也走它），'
      + '改它要同时核场景 01，本票声明路径不含它。',
  },
};

/* ── 引文类型：v2 的分野 ＋ v3 的短词口径 ──────────────────────────────────────── */

/** 描述型引文的判据（**逐条具名**）：key ＝ 票面点名的页，值 ＝ 判据名 ＋ 判据函数。 */
const DESC_JUDGES = {
  '02_记一餐（含备注）.txt': {
    name: '不与 01_记一餐.txt 逐字节相同 ＋ 标题能看出「含备注」',
    run: (ctx) => {
      const same = ctx.sameBytes('02_记一餐（含备注）.txt', '01_记一餐.txt');
      const t = ctx.h1Of('02_记一餐（含备注）.txt');
      return { ok: !same && t.includes('备注'), note: '标题「' + t + '」；与 01 逐字节相同=' + same };
    },
  },
  '05_拍营养表记一餐.txt': {
    name: '不与 01_记一餐.txt 逐字节相同 ＋ 标题能看出「拍照／营养表」',
    run: (ctx) => {
      const same = ctx.sameBytes('05_拍营养表记一餐.txt', '01_记一餐.txt');
      const t = ctx.h1Of('05_拍营养表记一餐.txt');
      return { ok: !same && (t.includes('拍照') || t.includes('营养表')), note: '标题「' + t + '」；与 01 逐字节相同=' + same };
    },
  },
  /* #511 · 两条「判据待定」的同源入口页：作者裁定一（入口一个都不删、按唤醒词出对应标题）。
     判据＝两页不再逐字节相同 ＋ 各自页头能对上进来的那条唤醒词。 */
  '78_看营养素明细.txt': {
    name: '不与 38_看营养素深度.txt 逐字节相同 ＋ 标题对得上唤醒词「看营养素明细」',
    run: (ctx) => {
      const same = ctx.sameBytes('78_看营养素明细.txt', '38_看营养素深度.txt');
      const t = ctx.h1Of('78_看营养素明细.txt');
      return { ok: !same && t.includes('营养素明细'), note: '标题「' + t + '」；与 38 逐字节相同=' + same };
    },
  },
  '80_看今日饮水.txt': {
    name: '不与 24_看今日喝水.txt 逐字节相同 ＋ 标题对得上唤醒词「看今日饮水」',
    run: (ctx) => {
      const same = ctx.sameBytes('80_看今日饮水.txt', '24_看今日喝水.txt');
      const t = ctx.h1Of('80_看今日饮水.txt');
      return { ok: !same && t.includes('今日饮水'), note: '标题「' + t + '」；与 24 逐字节相同=' + same };
    },
  },
};

/** 「 / 」引文里**按票面判据该留**的备选（每条写清为什么）。
 *  没登记的备选一律当「必须消失」；登记了的按 `rule` 判。 */
const ALT_RULES = {
  '01_记一餐.txt': {
    鸡胸: {
      why: 'P0 第 19 条的「成功 / 鸡胸」是「状态串 ＋ 那条记录的食物名」——要清的是状态串「成功」，食物名是数据。',
      rule: () => ({ ok: true, note: '记录里的食物名（数据），不是内部词' }),
    },
  },
  '33_校验批量导入.txt': {
    未匹配: {
      why: '票面改法点名要写它（明细表「是否已匹配」那一列写「未匹配」）——它作为**读者的话**留在表里，只禁它再当读数卡的卡标签。',
      rule: (ctx) => {
        const kpi = ctx.kpiRegion('33_校验批量导入.txt');
        return { ok: !kpi.includes('未匹配'), note: '读数卡区还有「未匹配」这个卡标签=' + kpi.includes('未匹配') };
      },
    },
    警告: {
      why: '读数卡自带的告警徽章（公共层状态位 `warn` 的上屏字），不是内部词；票面判据的六个词里没有它。',
      rule: () => ({ ok: true, note: '读数卡状态徽章，票面六词之外' }),
    },
    匹配: {
      why: '「匹配」只准作为读者的话（是否已匹配／已匹配／未匹配）出现，不得再单独成行当表头。',
      rule: (ctx) => ({ ok: !ctx.hasBareLine('33_校验批量导入.txt', '匹配'), note: '还有单独成行的「匹配」表头=' + ctx.hasBareLine('33_校验批量导入.txt', '匹配') }),
    },
    '—': {
      why: '这一格原印缺值占位符「—」，票面要求换成「食品库中无此食物」。',
      rule: (ctx) => ({ ok: !ctx.hasBareLine('33_校验批量导入.txt', '—'), note: '还有单独成行的「—」=' + ctx.hasBareLine('33_校验批量导入.txt', '—') }),
    },
  },
  '81_看批量导入预览.txt': {
    未匹配: {
      why: '同 33（两页同一命令、逐字同形）。',
      rule: (ctx) => {
        const kpi = ctx.kpiRegion('81_看批量导入预览.txt');
        return { ok: !kpi.includes('未匹配'), note: '读数卡区还有「未匹配」这个卡标签=' + kpi.includes('未匹配') };
      },
    },
    警告: { why: '同 33。', rule: () => ({ ok: true, note: '读数卡状态徽章，票面六词之外' }) },
    匹配: {
      why: '同 33。',
      rule: (ctx) => ({ ok: !ctx.hasBareLine('81_看批量导入预览.txt', '匹配'), note: '还有单独成行的「匹配」表头=' + ctx.hasBareLine('81_看批量导入预览.txt', '匹配') }),
    },
    '—': {
      why: '同 33。',
      rule: (ctx) => ({ ok: !ctx.hasBareLine('81_看批量导入预览.txt', '—'), note: '还有单独成行的「—」=' + ctx.hasBareLine('81_看批量导入预览.txt', '—') }),
    },
  },
  '83_看每日六因素.txt': {
    热量: {
      why: 'P0 第 86 条的点是「全页没有一处说清热量的单位」——「热量」这两个字本身是读者的话，'
        + '要清的是**把它当一项的名字写出来却又不给单位**的那种地方（读数卡的卡标签、明细表「因素」列）。'
        + '判据两条：① 单独成行的项名不许是「热量」／「热量达标」，必须写成「热量（千卡）达标」；'
        + '② 全页要有一处写明热量按千卡算。副题那句枚举是 #496 的交付物、被 `test/t496-文案统一.test.mjs` '
        + '逐字钉住（该件不在本票声明路径内），故枚举里的「热量」是句子成分、不判残留。',
      rule: (ctx) => {
        const t = ctx.textOf('83_看每日六因素.txt') ?? '';
        const lines = t.split('\n').map((l) => l.trim());
        const bareLabel = lines.filter((l) => l === '热量' || l === '热量达标');
        const itemNamed = t.includes('热量（千卡）达标');
        const unitStated = t.includes('热量按千卡计');
        return {
          ok: bareLabel.length === 0 && itemNamed && unitStated,
          note: '不带单位的项名还有 ' + bareLabel.length + ' 处；项名写成「热量（千卡）达标」=' + itemNamed
            + '；页上有单位口径=' + unitStated,
        };
      },
    },
  },
  '75_搜食品.txt': {
    鸡胸肉: { why: '食品库里那条食品的名字（数据）。', rule: () => ({ ok: true, note: '食品名（数据）' }) },
    热量: { why: '食品卡里四个宏量格的**格名**（读者的话），不是内部词。', rule: () => ({ ok: true, note: '食品卡的宏量格名' }) },
    蛋白: { why: '同「热量」：宏量格名。', rule: () => ({ ok: true, note: '食品卡的宏量格名' }) },
    '165 卡': { why: '食品库里那条食品的热量读数（数据）。', rule: () => ({ ok: true, note: '食品库里的营养值（数据）' }) },
    '31.0 g': { why: '同上：蛋白质读数（数据）。单位 `g` 是 #274 照老实物钉住的口径（`diet-library-t274` 的断言逐字核它）。', rule: () => ({ ok: true, note: '食品库里的营养值（数据）' }) },
  },
};

/** 单行的备选改写：票面把「A / B / C 与单元格 x、y、z」写成一句时，后半段本身又是几件东西。 */
const ALT_OVERRIDES = {
  '33_校验批量导入.txt:19': ['热量卡', '库热量', '匹配', '✗ 缺库', '—'],
  '81_看批量导入预览.txt:19': ['热量卡', '库热量', '匹配', '✗ 缺库', '—'],
};

/** 短词（不足 4 字）的登记判据：**长的引文**在页面上原样出现就是残留，短词不是——
 *  它可能是更长词的一部分（「常吃」在「常吃榜」里）。没登记的短词命中一律报「判据待定」。 */
const SHORT_RULES = {
  '41_看频繁吃榜.txt#59': {
    name: '「常吃」只准作为「常吃榜」的一部分出现（不得单独成词／单独成行）',
    run: (ctx) => {
      const t = ctx.textOf('41_看频繁吃榜.txt') ?? '';
      const bare = [...t.matchAll(/常吃/g)].filter((m) => t.slice(m.index + 2, m.index + 3) !== '榜').length;
      return { ok: bare === 0 && t.includes('常吃榜'), note: '没跟「榜」的「常吃」有 ' + bare + ' 处；页上有「常吃榜」=' + t.includes('常吃榜') };
    },
  },
};

const isDesc = (q) => /逐字节相同|逐行相同/.test(q);
const isSlash = (q) => /\s\/\s/.test(q);

/* ── 读面 ───────────────────────────────────────────────────────────────── */

function loadTexts(dir) {
  const m = new Map();
  for (const f of readdirSync(dir)) if (f.endsWith('.txt')) m.set(f, readFileSync(join(dir, f), 'utf8'));
  return m;
}

function parseRows() {
  return readFileSync(P0, 'utf8').split('\n')
    .filter((l) => l.startsWith('P0 |'))
    .map((l, i) => {
      const c = l.split('|').map((s) => s.trim());
      const where = c[1] ?? '';
      const page = where.split(':')[0];
      const quote = (c[2] ?? '').replace(/`/g, '').replace(/^原文逐字[:：]?/, '').trim();
      return { n: i + 1, where, page, quote, why: c[3] ?? '', fix: c[4] ?? '' };
    });
}

/** 片断回退：引文可能被合并席截断，取其中足够独特的一段（与旧件同口径，40／24／14）。 */
function fragmentOf(s) {
  for (const len of [Math.min(s.length, 40), Math.min(s.length, 24), Math.min(s.length, 14)]) {
    if (len >= 4) return s.slice(0, len);
  }
  return s;
}

/* ── 判定 ───────────────────────────────────────────────────────────────── */

/** 把一行引文拆成「逐个可查的备选」：
 *  ① 先按「 / 」拆（票面把几件东西写在一格里，整串在页面上不存在）；
 *  ② 某一段里还带「… 与单元格 x、y、z」的，后半段本身又是几件东西，按顿号／逗号再拆；
 *  ③ 票面明写过的行（`ALT_OVERRIDES`）以票面的那几件为准，不靠切分猜。 */
function alternativesOf(row) {
  const key = row.page + ':' + (row.where.split(':')[1] ?? '').replace(/[^\d].*$/, '');
  if (ALT_OVERRIDES[key]) return ALT_OVERRIDES[key];
  return row.quote.split(/\s+\/\s+/)
    .flatMap((a) => (a.includes(' 与单元格 ')
      ? [a.split(' 与单元格 ')[0], ...a.split(' 与单元格 ')[1].split(/[、，]/)]
      : [a]))
    .map((a) => a.trim()).filter((a) => a !== '');
}

/** 一个备选在该页的判定（三型共用；短词口径在这里落地）。 */
function judgeAlt(row, alt, ctx) {
  const page = row.page;
  const text = ctx.textOf(page) ?? '';
  const rule = ALT_RULES[page]?.[alt];
  if (rule) {
    const r = rule.rule(ctx);
    return { alt, verdict: r.ok ? '该留' : '还在', detail: r.note, why: rule.why };
  }
  const hit = text.includes(fragmentOf(alt));
  if (!hit) return { alt, verdict: '已清', detail: '该页读不到' };
  if (alt.length < 4) {
    return { alt, verdict: '判据待定', detail: '短词（' + alt.length + ' 字）在该页命中，但没登记判据——它可能是更长词的一部分，不静默算绿也不算残留' };
  }
  return { alt, verdict: '还在', detail: '该页仍能读到「' + fragmentOf(alt) + '」' };
}

function judgePage(row, ctx) {
  const { page, quote } = row;
  const key = page + '#' + row.n;
  const reloc = RELOCATED[key];
  if (reloc) return { kind: 'relocated', verdict: '已归位', detail: '归 ' + reloc.owner + '；落点 ' + reloc.where };
  const text = ctx.textOf(page);
  if (text === null) return { kind: '缺页' };
  if (isDesc(quote)) {
    const j = DESC_JUDGES[page];
    if (!j) return { kind: 'desc', verdict: '判据待定', detail: '描述型引文，本页没有登记具名判据（旧件在这里静默算绿）' };
    const r = j.run(ctx);
    return { kind: 'desc', verdict: r.ok ? '已清' : '还在', detail: j.name + '：' + r.note };
  }
  if (isSlash(quote)) {
    const parts = alternativesOf(row).map((alt) => judgeAlt(row, alt, ctx));
    const alive = parts.filter((p) => p.verdict === '还在');
    const pending = parts.filter((p) => p.verdict === '判据待定');
    return { kind: 'slash', verdict: alive.length ? '还在' : (pending.length ? '判据待定' : '已清'), parts };
  }
  const short = SHORT_RULES[key];
  if (short) {
    const r = short.run(ctx);
    return { kind: 'substring', verdict: r.ok ? '已清' : '还在', shortRule: short.name, detail: r.note };
  }
  const hit = text.includes(fragmentOf(quote));
  if (!hit) return { kind: 'substring', verdict: '已清', detail: '' };
  if (quote.length < 4) {
    return { kind: 'substring', verdict: '判据待定', detail: '短词（' + quote.length + ' 字）在该页命中，但这一行没登记短词判据' };
  }
  return { kind: 'substring', verdict: '还在', detail: '该页仍能读到「' + fragmentOf(quote) + '」' };
}

/** #509 的五页（01／02／03／05／06 各自的标题对得上唤醒词）。 */
const HOMOGEN = [
  { page: '01_记一餐.txt', wake: '记一餐', must: (t) => t.includes('记一餐') && !t.includes('（') },
  { page: '02_记一餐（含备注）.txt', wake: '记一餐（含备注）', must: (t) => t.includes('备注') },
  { page: '03_补记饮食.txt', wake: '补记饮食', must: (t) => t.includes('补记') },
  { page: '05_拍营养表记一餐.txt', wake: '拍营养表记一餐', must: (t) => t.includes('拍照') || t.includes('营养表') },
  { page: '06_拍营养表补记一餐.txt', wake: '拍营养表补记一餐', must: (t) => t.includes('拍照') || t.includes('营养表') },
];

/** #511 · 两组同源入口页（一条命令两个入口）：四个入口都留，各自页头对上进来的那条词。 */
const HOMOLOG = [
  { page: '38_看营养素深度.txt', wake: '看营养素深度', must: (t) => t.includes('营养素深度'), peer: '78_看营养素明细.txt' },
  { page: '78_看营养素明细.txt', wake: '看营养素明细', must: (t) => t.includes('营养素明细'), peer: '38_看营养素深度.txt' },
  { page: '24_看今日喝水.txt', wake: '看今日喝水', must: (t) => t.includes('今日喝水'), peer: '80_看今日饮水.txt' },
  { page: '80_看今日饮水.txt', wake: '看今日饮水', must: (t) => t.includes('今日饮水'), peer: '24_看今日喝水.txt' },
];

function runProbe(dir) {
  const texts = loadTexts(dir);
  const ctx = {
    texts,
    textOf: (p) => texts.get(p) ?? null,
    sameBytes: (a, b) => texts.get(a) !== undefined && texts.get(a) === texts.get(b),
    /** 页头 H1：跳掉页头族名那两行（「卡路里·饮食」／「卡路里 · 饮食」、回执页的「卡路里·饮食回执」）。 */
    h1Of: (p) => (texts.get(p) ?? '').split('\n').map((l) => l.trim()).filter(Boolean)
      .find((l) => !/^卡路里\s*[·・]/.test(l)) ?? '',
    hasBareLine: (p, s) => (texts.get(p) ?? '').split('\n').map((l) => l.trim()).includes(s),
    kpiRegion: (p) => {
      const t = texts.get(p) ?? '';
      const i = t.indexOf('逐条预览');
      return i < 0 ? t : t.slice(0, i);
    },
  };
  const rows = parseRows().map((r) => ({ ...r, res: judgePage(r, ctx) }));

  const homogen = HOMOGEN.map((h) => {
    const t = ctx.h1Of(h.page);
    return { ...h, title: t, ok: texts.has(h.page) && h.must(t) };
  });
  const pairs = [];
  const pairOf = (a, b) => ({ a, b, same: ctx.sameBytes(a, b) });
  for (let i = 0; i < HOMOGEN.length; i++) {
    for (let j = i + 1; j < HOMOGEN.length; j++) pairs.push(pairOf(HOMOGEN[i].page, HOMOGEN[j].page));
  }
  const homolog = HOMOLOG.map((h) => {
    const t = ctx.h1Of(h.page);
    return { ...h, title: t, ok: texts.has(h.page) && h.must(t) && !ctx.sameBytes(h.page, h.peer) };
  });
  const homologPairs = [
    pairOf('38_看营养素深度.txt', '78_看营养素明细.txt'),
    pairOf('24_看今日喝水.txt', '80_看今日饮水.txt'),
  ];
  /* 全 81 页两两逐字节相同（比「同源入口页」更强的一条**告信息**：不只查点名的那两组）。
   *  它不判绿——那 41 对里绝大多数是同一条命令按不同窗口／不同入口出的页在夹具下数据相同
   *  （按设计同形），牵到 65_看早餐 的那一组与 P0 第 63 条是同一件事，已归位 #276。 */
  const names = [...texts.keys()].sort();
  const allSamePairs = [];
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) if (ctx.sameBytes(names[i], names[j])) allSamePairs.push([names[i], names[j]]);
  }

  const relocated = rows.filter((r) => r.res.verdict === '已归位');
  const judged = rows.filter((r) => r.res.verdict !== '已归位');
  const red = judged.filter((r) => r.res.verdict === '还在' || r.res.kind === '缺页' || r.res.verdict === '判据待定');
  const bad = red.length > 0
    || homogen.some((h) => !h.ok)
    || pairs.some((p) => p.same)
    || homolog.some((h) => !h.ok)
    || homologPairs.some((p) => p.same);
  return { rows, pairOf, homogen, pairs, homolog, homologPairs, allSamePairs, relocated, judged, red, bad, textDir: dir };
}

/* ── 打印 ───────────────────────────────────────────────────────────────── */

function lineOf(r) {
  if (r.res.parts) return r.res.parts.map((p) => p.alt + '=' + p.verdict).join('　');
  return r.res.verdict + (r.res.detail ? '（' + r.res.detail + '）' : '');
}

function printTable(res) {
  console.log('P0 总条目 =', res.rows.length, '｜#509 面内 =', res.rows.filter((r) => SCOPE_PAGES.has(r.page)).length,
    '｜#511 本票收的页 =', res.rows.filter((r) => T511_PAGES.has(r.page)).length);
  console.log('');
  console.log('按类型计数：' + ['substring', 'slash', 'desc'].map((k) => k + '=' + res.rows.filter((r) => r.res.kind === k).length).join('　'));
  console.log('');
  console.log('=== #509 面内逐页（16 条，上一票已清）===');
  for (const r of res.rows.filter((x) => SCOPE_PAGES.has(x.page))) {
    console.log('· ' + r.page.replace(/\.txt$/, '') + '  P0 #' + r.n + '  ' + r.res.kind.padEnd(9) + '  ' + lineOf(r));
  }
  console.log('');
  console.log('=== 同形页检查（01／02／03／05／06）===');
  for (const h of res.homogen) console.log('· ' + h.page.replace(/\.txt$/, '').padEnd(22) + ' 标题「' + h.title + '」  对上唤醒词「' + h.wake + '」=' + h.ok);
  console.log('· 两两逐字节相同 = ' + res.pairs.filter((p) => p.same).length + ' 对');
  console.log('');
  console.log('=== 同源入口页检查（78／38、80／24）===');
  for (const h of res.homolog) {
    console.log('· ' + h.page.replace(/\.txt$/, '').padEnd(22) + ' 标题「' + h.title + '」  对上唤醒词「' + h.wake + '」=' + h.ok
      + '　与 ' + h.peer.replace(/\.txt$/, '') + ' 逐字节相同=' + res.pairOf(h.page, h.peer).same);
  }
  const hs = res.homologPairs.filter((p) => p.same);
  console.log('· 同源入口页两两逐字节相同 = ' + hs.length + ' 对' + (hs.length ? '：' + hs.map((p) => p.a + '＝' + p.b).join('、') : ''));
  console.log('· 全 81 页两两逐字节相同 = ' + res.allSamePairs.length + ' 对（**告信息，不判绿**：同一条命令按不同窗口／'
    + '不同入口出的页在夹具下数据相同；牵到 65_看早餐 的那一组与 P0 第 63 条同一件事，已归位 #276）');
  console.log('');
  console.log('=== #511 逐页残留表（本票收的 10 页）===');
  for (const r of res.rows.filter((x) => T511_PAGES.has(x.page))) {
    console.log('· ' + r.page.replace(/\.txt$/, '').padEnd(22) + ' P0 #' + String(r.n).padStart(2) + '  ' + (r.res.kind ?? '').padEnd(9) + '  ' + lineOf(r));
  }
  console.log('');
  console.log('=== 归位（不是本票范围：判据在别的票的写集里）=== 共 ' + res.relocated.length + ' 条');
  for (const r of res.relocated) {
    const z = RELOCATED[r.page + '#' + r.n];
    console.log('· 归位 ' + r.page.replace(/\.txt$/, '') + ' P0 #' + r.n + ' → ' + z.owner + '；落点 ' + z.where);
    console.log('    ' + z.why);
  }
  console.log('');
  const out = res.rows.filter((r) => !SCOPE_PAGES.has(r.page) && !T511_PAGES.has(r.page));
  console.log('=== 其余面外（别的票，本件只读）=== 共 ' + out.length + ' 条：'
    + out.filter((r) => r.res.verdict === '已清' || r.res.verdict === '该留').length + ' 已清／该留　'
    + out.filter((r) => r.res.verdict === '还在').length + ' 还在　'
    + out.filter((r) => r.res.verdict === '判据待定').length + ' 判据待定');
  for (const r of out.filter((x) => x.res.verdict !== '已清' && x.res.verdict !== '该留')) {
    console.log('  · ' + r.res.verdict + ' ' + r.page + ' P0 #' + r.n + '：' + lineOf(r));
  }
  if (process.argv.includes('--all')) {
    console.log('');
    console.log('=== 全量逐条（87 条）===');
    for (const r of res.rows) {
      console.log('· ' + String(r.n).padStart(2) + ' ' + r.page.replace(/\.txt$/, '').padEnd(24) + ' ' + (r.res.kind ?? '').padEnd(9) + ' ' + lineOf(r));
    }
  }
  console.log('');
  console.log('RED = ' + res.red.length + ' 条（全量判定：面内 ＋ 面外）'); 
  for (const r of res.red) console.log('  ✖ ' + r.page + ' P0 #' + r.n + '：' + lineOf(r));
  console.log('RESULT: ' + (res.bad
    ? 'RED（全量里还有残留或没判据的行，或同形页／同源入口页未分家）'
    : 'GREEN（87 条全部已清／该留；同形页与同源入口页各自对上唤醒词；归位 2 条已交接、红绿都不吞）'));}

/* ── 夹具自证 ───────────────────────────────────────────────────────────── */

function sandbox(mutate) {
  const dir = mkdtempSync(join(tmpdir(), 't511-'));
  for (const f of readdirSync(DEFAULT_TEXT)) if (f.endsWith('.txt')) copyFileSync(join(DEFAULT_TEXT, f), join(dir, f));
  mutate(dir);
  return dir;
}

/** 旧件（`.scratch/t155o/p0-recheck.mjs`）的判定规则**照抄**一份：全文子串匹配 ＋ 40／24／14 片段回退。 */
function legacyProbe(texts) {
  return (q) => {
    const s = q.replace(/`/g, '').replace(/^原文逐字[:：]?/, '').trim();
    if (s.length < 4) return { n: 0, frag: s };
    for (const len of [Math.min(s.length, 40), Math.min(s.length, 24), Math.min(s.length, 14)]) {
      const frag = s.slice(0, len);
      const hits = [...texts.entries()].filter(([, t]) => t.includes(frag)).map(([f]) => f);
      if (hits.length) return { n: hits.length, frag, files: hits };
    }
    return { n: 0, frag: s.slice(0, 20) };
  };
}

/** v2（#509 件）的判定：只判面内，面外只打印。**照抄一份**用来做同一份字节上的三件对照。 */
function v2Probe(res) {
  return (r) => {
    if (!SCOPE_PAGES.has(r.page)) return '不判（面外只打印）';
    return res.rows.find((x) => x.n === r.n).res.verdict;
  };
}

function fixtures() {
  let bad = 0;
  const say = (ok, line) => { console.log((ok ? 'FIXTURE ok   ' : 'FIXTURE FAIL ') + line); if (!ok) bad++; };

  /* 夹具 A · 「 / 」分隔引文（P0 第 46 条那一套）：把「精确名匹配」塞回 33 页 → 必红；还原 → 必绿。 */
  {
    const clean = runProbe(DEFAULT_TEXT);
    const before = clean.rows.find((r) => r.page === '33_校验批量导入.txt' && r.n === 46);
    say(before.res.kind === 'slash' && before.res.verdict === '已清',
      'A 还原态：33 页 P0#46（slash 型）已清=' + (before.res.verdict === '已清'));
    const dirty = runProbe(sandbox((d) => {
      const p = join(d, '33_校验批量导入.txt');
      writeFileSync(p, readFileSync(p, 'utf8').replace('食品库里有同名的', '精确名匹配'), 'utf8');
    }));
    const r = dirty.rows.find((x) => x.page === '33_校验批量导入.txt' && x.n === 46);
    say(r.res.verdict === '还在' && dirty.bad === true,
      'A 改坏态：把「精确名匹配」塞回 33 页 → P0#46 还在=' + (r.res.verdict === '还在') + '　探针 RED=' + dirty.bad
      + '（旧件在这里恒绿：整串「精确名匹配 / 未匹配 / 导入后建议补录 / 警告」从来不在页面上）');
  }

  /* 夹具 B · 描述型引文（P0 第 27 条）：把 01 的字节盖回 05 页 → 必红；还原 → 必绿。 */
  {
    const dirty = runProbe(sandbox((d) => {
      copyFileSync(join(DEFAULT_TEXT, '01_记一餐.txt'), join(d, '05_拍营养表记一餐.txt'));
    }));
    const r = dirty.rows.find((x) => x.page === '05_拍营养表记一餐.txt' && x.n === 27);
    const pair = dirty.pairs.find((p) => [p.a, p.b].includes('05_拍营养表记一餐.txt') && [p.a, p.b].includes('01_记一餐.txt'));
    say(r.res.verdict === '还在' && pair.same === true && dirty.bad === true,
      'B 改坏态：把 01 的字节盖回 05 页 → P0#27 还在=' + (r.res.verdict === '还在') + '　05＝01 逐字节=' + pair.same
      + '　探针 RED=' + dirty.bad + '（旧件在这里也恒绿：「全页与 … 逐字节相同」不是页面上的字）');
  }

  /* 夹具 C **v3 新盲区**：短词（不足 4 字）命中不等于残留。
   *  ① 把 41 页的「常吃榜」改回「常吃」（三个名字又散开）→ P0#59 必红；
   *  ② 把 83 页的「热量（千卡）」改回裸「热量」→ P0#86 必红。 */
  {
    const clean = runProbe(DEFAULT_TEXT);
    const c59 = clean.rows.find((r) => r.page === '41_看频繁吃榜.txt' && r.n === 59);
    const c86 = clean.rows.find((r) => r.page === '83_看每日六因素.txt' && r.n === 86);
    say(c59.res.verdict === '已清' && c86.res.verdict === '已清',
      'C 还原态：41 页 P0#59（短词「常吃」）已清=' + (c59.res.verdict === '已清') + '　83 页 P0#86（短词「热量」）已清=' + (c86.res.verdict === '已清'));
    const dirty = runProbe(sandbox((d) => {
      const p41 = join(d, '41_看频繁吃榜.txt');
      writeFileSync(p41, readFileSync(p41, 'utf8').replace(/常吃榜/g, '常吃'), 'utf8');
      const p83 = join(d, '83_看每日六因素.txt');
      writeFileSync(p83, readFileSync(p83, 'utf8').replace(/热量（千卡）/g, '热量'), 'utf8');
    }));
    const r59 = dirty.rows.find((x) => x.page === '41_看频繁吃榜.txt' && x.n === 59);
    const r86 = dirty.rows.find((x) => x.page === '83_看每日六因素.txt' && x.n === 86);
    say(r59.res.verdict === '还在' && r86.res.verdict === '还在' && dirty.bad === true,
      'C 改坏态：把「常吃榜」拆回「常吃」→ P0#59 还在=' + (r59.res.verdict === '还在')
      + '；把「热量（千卡）」拆回裸「热量」→ P0#86 还在=' + (r86.res.verdict === '还在') + '　探针 RED=' + dirty.bad
      + '（v2 在这里只会拿 2 字片段做子串命中：短词一旦在页上出现就无从判）');
  }

  /* 夹具 D **v3 新盲区**：同源入口页（一条命令两个入口）——两页逐字节相同 → 必红。 */
  {
    const dirty = runProbe(sandbox((d) => {
      copyFileSync(join(DEFAULT_TEXT, '24_看今日喝水.txt'), join(d, '80_看今日饮水.txt'));
    }));
    const r = dirty.rows.find((x) => x.page === '80_看今日饮水.txt' && x.n === 81);
    const pair = dirty.homologPairs.find((p) => [p.a, p.b].includes('80_看今日饮水.txt'));
    const h = dirty.homolog.find((x) => x.page === '80_看今日饮水.txt');
    say(r.res.verdict === '还在' && pair.same === true && h.ok === false && dirty.bad === true,
      'D 改坏态：把 24 的字节盖回 80 页 → P0#81（desc 型）还在=' + (r.res.verdict === '还在')
      + '　80＝24 逐字节=' + pair.same + '　同源入口页检查过=' + h.ok + '　探针 RED=' + dirty.bad
      + '（v2 对这两行只报「判据待定」，且不判绿）');
  }

  /* 夹具 E **归位行的处置**：不算红也不算绿，单列一段；把归位表摘掉才回得到别的判定。 */
  {
    const clean = runProbe(DEFAULT_TEXT);
    const reloc = clean.relocated.map((r) => r.page.replace(/\.txt$/, '') + '#' + r.n).sort().join('、');
    const notCounted = clean.red.every((r) => r.res.verdict !== '已归位')
      && clean.judged.length === clean.rows.length - clean.relocated.length;
    say(reloc === '18_看上周饮食#43、65_看早餐（最近 7 天）#63' && notCounted,
      'E 归位态：单列 ' + clean.relocated.length + ' 条（' + reloc + '）；不进红点、也不进已清=' + notCounted
      + '　RED=' + clean.red.length + ' 条');
  }

  /* 新旧对照：同一份改坏的字节，旧件、v2、v3 各判一遍。 */
  {
    const dirtyDir = sandbox((d) => {
      const p = join(d, '33_校验批量导入.txt');
      writeFileSync(p, readFileSync(p, 'utf8')
        .replace('食品库里有同名的', '精确名匹配')
        .replace('这一条的热量（卡）', '热量卡')
        .replace('食品库里的热量（卡）', '库热量')
        .replace('食品库中无此食物', '✗ 缺库'), 'utf8');
      for (const f of ['02_记一餐（含备注）.txt', '05_拍营养表记一餐.txt']) {
        copyFileSync(join(DEFAULT_TEXT, '01_记一餐.txt'), join(d, f));
      }
    });
    const dirty = runProbe(dirtyDir);
    const legacy = legacyProbe(loadTexts(dirtyDir));
    const v2of = v2Probe(dirty);
    const rows = [46, 47, 21, 27].map((n) => dirty.rows.find((r) => r.n === n));
    console.log('');
    console.log('=== 同一份改坏的字节：旧件 vs v2（#509）vs v3（本件），四处 #509 盲区 ===');
    for (const r of rows) {
      const o = legacy(r.quote);
      console.log('· P0 #' + r.n + ' ' + r.page.replace(/\.txt$/, '') + '　旧件=' + (o.n ? '还在' : '已清')
        + '（片段「' + o.frag.slice(0, 26) + '」命中 ' + o.n + ' 页）　v2=' + v2of(r) + '　v3=' + r.res.verdict + '（' + r.res.kind + '）');
    }
    const missed = rows.filter((r) => legacy(r.quote).n === 0 && r.res.verdict === '还在').length;
    say(missed === rows.length,
      '新旧对照：旧件对 ' + rows.length + ' 处残留全部报「已清」（查不到就当清了），v3 全部报「还在」=' + missed + '/' + rows.length);
  }

  console.log('');
  console.log('FIXTURES ' + (bad === 0 ? 'PASS：五类盲区「改坏必红、还原必绿」都成立' : 'FAIL：' + bad + ' 条不成立'));
  return bad;
}

const RES = runProbe(DEFAULT_TEXT);
printTable(RES);
if (process.argv.includes('--fixtures')) {
  console.log('');
  const f = fixtures();
  process.exitCode = (RES.bad || f > 0) ? 1 : 0;
} else {
  process.exitCode = RES.bad ? 1 : 0;
}
