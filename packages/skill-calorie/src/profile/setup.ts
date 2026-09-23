/** #179 · 「设置资料」：设置档案／设活动量／改档案三条写入词共用的写前页（预检确认页）。
 *
 * #175 补齐（本文件第三节）：两条写入词的**写后回执页**除摘要外，还摆出写后档案的
 * 性别、推荐活动量（档位 ＋ 系数 ＋ 每日消耗影响）与设置时间；推荐口径取自库内现值与
 * 最近体重，**不进写命令参数**（写命令的字段允许清单只有 age/gender/heightCm/activityLevel/note）。
 *
 * #238 返修（清单 1–5、7–13 条）：这一页与两条回执页全部改成**用户视角**——库列名、SQL 函数名、
 * 内部编号、英文枚举、双重否定一律不再上页。三件东西落在这里：
 *   ① 中文说法走同目录 `labels.ts`（`fieldLabel`／`genderLabel`／`activityLabel`／`localizeEnums`），
 *      页面自己不再各写一套映射（上方卡片与下方表里对同一份数据说同一个词）；
 *   ② 页尾一个**对账信息**折叠区（`reconcileDisclosure`，`update.ts` 也用这一件）：原来摆在页尾的
 *      `M5 整行（旧版等价物）` 与眉标里的 `M5 契约 v1` 收进这里，不再占副标题与眉标；
 *   ③ 「没有值」这一页只有一个词（`未设置`）：卡片、表行、空态说明都用它。
 *  复制区（#238 清单 9 条）：不再出与按钮同名的「复制数据」大标题，按钮自成一行；预检确认页的
 *  指令块也不再挂「复制 prompt（必走）」小标题——那一页三个按钮就叫「复制指令／复制数据／复制日志」。
 *
 * 一页一事：字段面（身高／年龄／性别／活动量／备注）就是本子功能的题目，
 * 故这一页住本文件，`update.ts` 要用就从同目录取用（设计 §一，铁律五不另起转手件）。
 *
 * 取数：档案现值走 `fetch/profile.getProfile`（**不用** `buildProfileView`——它缺档案即抛
 * `missing-data`，会把预检页变成没有产物）；最新体重走同目录 `view.profileSnapshot`
 * 那一份查询（同一个取数不留两处）。页面层不自算口径：活动量系数取
 * `analysis/utils.TDEE_ACTIVITY_FACTORS` 正本，TDEE 走同文件 `energyOf`（缺身高/年龄/
 * 性别/体重/活动量时**不算**，不填默认值冒充；#177 起这条判据只此一处，看档案结果页同走它）。
 * 未知参数抛 `bad-input`（与 `src/photo/wizardPort.ts` 同字面「不支持字段: 」，出口 exit 2）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { renderDataTable, renderDisclosure, renderKpiGrid, renderParamForm, renderPreBlock } from 'base-paint/blocks';
import { renderActionBar } from 'base-paint';
import type { KpiCardInput } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import type { CrudReceipt } from '../render/receipt.js';
import type { ProfileRow } from '../fetch/profile.js';
import { ACTIVITY_LEVELS } from '../kcal.js';
import { TDEE_ACTIVITY_FACTORS, energyOf } from '../analysis/utils.js';
import { CalorieRenderError } from '../render/errors.js';
import { nowStamp } from '../render/receipt.js';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { CALORIE_COPY_ACTION } from '../render/copy.js';
import { reconcileDisclosure, statusCard } from '../shared/receiptParts.js';
import { activityLabel, fieldLabel, genderLabel, localizeEnums } from './labels.js';
import { profileSnapshot, PROFILE_SOURCE } from './view.js';

const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
const DOC_TITLE = '卡路里·档案预检';
/** 本页由哪条命令产出（写进「复制日志」第 4 段，可照抄重跑）。 */
const WIZARD_KEY = 'calorie.view.profile-wizard';

/** 首格状态卡的「写入去向」一句（#251 起由共用件收参数，本域说法只此一处定义）。 */
export const PROFILE_WRITTEN_DETAIL = '已写入档案';

/** 三条写入词（HELP `scene-07-profile.ts` 的 name，逐字）。 */
const SET_WORD = '设置档案';
const ACTIVITY_WORD = '设活动量';
const UPDATE_WORD = '改档案';
const WAKE_WORDS: readonly string[] = [SET_WORD, ACTIVITY_WORD, UPDATE_WORD];

/** 设置档案 4 项（`scene-07-profile.ts:5` 的 data_fields）；参数名与写命令同形。
 *  性别那一格的括注照 HELP 的 prompt 写「男/女」（#238：不再写 `male/female`）。 */
const SET_FIELDS: readonly { camel: string; label: string }[] = [
  { camel: 'heightCm', label: '身高（cm）' },
  { camel: 'age', label: '年龄' },
  { camel: 'gender', label: '性别（男/女）' },
  { camel: 'activityLevel', label: '活动量（久坐/轻度/中度/活跃/高度活跃）' },
];
/** 改档案 5 项（单列，含备注；`scene-07-profile.ts:7`）。 */
const NOTE_FIELD = { camel: 'note', label: '备注' } as const;
const UPDATE_FIELDS: readonly { camel: string; label: string }[] = [...SET_FIELDS, NOTE_FIELD];
const NUM_FIELDS: readonly string[] = ['heightCm', 'age'];

export interface ProfileSettingView {
  /** 参数指定的写入词（三条之一）；缺省＝三条全列。 */
  wakeWord: string | null;
  /** 改前值（空库为 null，预检页不阻断）。 */
  before: ProfileRow | null;
  /** 参数预填的草稿（AI 已收集的值）。 */
  draft: { camel: string; label: string; value: string }[];
  filledCount: number;
  /** 活动量五档：档位／入库值／系数／每日消耗影响（四要素齐备才算，否则 null）＋缺哪几项。 */
  activityChoices: { level: string; label: string; factor: number; tdee: number | null; missing: string[] }[];
  latestWeightKg: number | null;
  prompt: string;
}

function strOrUndef(raw: unknown, field: string): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'string') throw new CalorieRenderError('bad-input', '参数 ' + field + ' 须为字符串');
  const s = raw.trim();
  return s === '' ? undefined : s;
}

function numOrUndef(raw: unknown, field: string): number | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n)) throw new CalorieRenderError('bad-input', '参数 ' + field + ' 须为 number：' + String(raw));
  return n;
}

/** 参数 → 草稿（键名与写命令同形；值只为展示，写入仍由三条写命令各自校验）。 */
function draftOf(raw: Record<string, unknown>): ProfileSettingView['draft'] {
  const allowed = new Set<string>(['wakeWord', 'key', ...UPDATE_FIELDS.map((f) => f.camel)]);
  for (const k of Object.keys(raw)) {
    if (!allowed.has(k)) throw new CalorieRenderError('bad-input', '不支持字段: ' + k);
  }
  const out: ProfileSettingView['draft'] = [];
  for (const f of UPDATE_FIELDS) {
    const v = NUM_FIELDS.includes(f.camel) ? numOrUndef(raw[f.camel], f.camel) : strOrUndef(raw[f.camel], f.camel);
    if (v !== undefined) out.push({ camel: f.camel, label: f.label, value: String(v) });
  }
  return out;
}

/** 参数名（camel）→ 档案行取值：`heightCm`／`activityLevel` 与库列名不同，逐条映射（不用宽化断言）。 */
function profileField(camel: string, p: ProfileRow | null): string | number | null {
  if (!p) return null;
  switch (camel) {
    case 'heightCm': return p.height_cm;
    case 'activityLevel': return p.activity_level;
    case 'age': return p.age;
    case 'gender': return p.gender;
    case 'note': return p.note;
    default: return null;
  }
}

/** 一格的显示值（#238 清单 7 条）：「没有值」这一页只有一个词＝`未设置`；性别／活动量走中文说法。 */
function cellOf(camel: string, raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined || raw === '') return '未设置';
  if (camel === 'gender') return genderLabel(String(raw));
  if (camel === 'activityLevel') return activityLabel(String(raw));
  return String(raw);
}

/** 活动量五档：草稿优先于库值；TDEE 影响走 `energyOf`（#177 起四要素缺一即不出数字的唯一判据）。 */
function tdeeChoices(
  before: ProfileRow | null,
  draft: ProfileSettingView['draft'],
  latestWeightKg: number | null,
): ProfileSettingView['activityChoices'] {
  const pick = (camel: string): string | number | null => draft.find((d) => d.camel === camel)?.value ?? profileField(camel, before);
  return ACTIVITY_LEVELS.map((level) => {
    const energy = energyOf({
      weightKg: latestWeightKg,
      heightCm: pick('heightCm'),
      age: pick('age'),
      gender: pick('gender'),
      activityLevel: level,
    });
    return {
      level,
      label: activityLabel(level),
      factor: TDEE_ACTIVITY_FACTORS[level] as number,
      tdee: energy.tdee,
      missing: energy.missing,
    };
  });
}

/** 该写入词要写的字段（设置档案不含备注；设活动量只写活动量）。 */
function fieldsForWord(wakeWord: string | null): readonly { camel: string; label: string }[] {
  if (wakeWord === SET_WORD) return SET_FIELDS;
  if (wakeWord === ACTIVITY_WORD) return [SET_FIELDS[3] as { camel: string; label: string }];
  return UPDATE_FIELDS;
}

/** 写命令段（确认后跑哪条；三条单命令入口，参数名与写命令同形）。 */
function writeCommand(wakeWord: string, picked: Record<string, unknown>): string {
  const json = JSON.stringify(picked);
  if (wakeWord === UPDATE_WORD) return 'calorie-cmd-read calorie.profile.update --params \'{"fields":' + json + '}\'';
  if (wakeWord === ACTIVITY_WORD) return 'calorie-cmd-read calorie.profile.activity --params \'' + json + '\'';
  return 'calorie-cmd-read calorie.profile.set --params \'' + json + '\'';
}

/** 复制给 AI 的第一句话（#238 清单 14 条：自然句 ＋ 标点统一用全角）。
 *  这一句是用户要粘给 AI 的原话，不能写成「请帮我改档案到卡路里」这种内部说法。 */
function askSentence(wakeWord: string | null, hasDraft: boolean): string {
  if (wakeWord === ACTIVITY_WORD) return '请帮我把卡路里里的活动量改成下面这一项';
  if (wakeWord === SET_WORD && hasDraft) return '请帮我把卡路里里的基础档案设置成下面这些值';
  if (wakeWord === UPDATE_WORD && hasDraft) return '请帮我把卡路里里的基础档案改成下面这些值';
  return '请帮我把卡路里里的基础档案写成下面这些值';
}

function settingPrompt(wakeWord: string | null, draft: ProfileSettingView['draft'], before: ProfileRow | null): string {
  if (draft.length === 0) {
    return '// 请至少填 1 项（设置档案 4 项：身高/年龄/性别/活动量；改档案 5 项另含备注；设活动量 5 档见下方对照表）';
  }
  const lines = draft.map((d) => '- ' + d.label.replace(/（.*）$/, '') + '：' + d.value);
  const head = askSentence(wakeWord, true) + '\n\n参数：'
    + (wakeWord ? '\n- 写入词：' + wakeWord : '')
    + '\n' + lines.join('\n');
  const beforeNote = before
    ? '\n\n改前值已在页面「档案现值（改前值）」一节列出；写入前请与库内现值核对，对不上就停下来问我。'
    : '\n\n库内还没有档案：本次是首次设置，没有改前值可比对。';
  if (!wakeWord) return head + beforeNote;
  const keep = fieldsForWord(wakeWord).map((f) => f.camel);
  const picked: Record<string, unknown> = {};
  for (const d of draft) {
    if (!keep.includes(d.camel)) continue;
    picked[d.camel] = d.camel === 'note' ? d.value : (NUM_FIELDS.includes(d.camel) ? Number(d.value) : d.value);
  }
  if (Object.keys(picked).length === 0) return head + beforeNote;
  return head + beforeNote + '\n\n命令：\n```bash\n' + writeCommand(wakeWord, picked) + '\n```\n完成后返回写库回执。';
}

/** ① 取数：改前值（`getProfile`，可缺）＋ 待写草稿＋活动量五档＋最近体重＋复制 prompt。 */
export function buildProfileSettingView(db: DatabaseSync, raw: Record<string, unknown>): ProfileSettingView {
  const draft = draftOf(raw);
  const rawWord = strOrUndef(raw['wakeWord'], 'wakeWord');
  if (rawWord !== undefined && !WAKE_WORDS.includes(rawWord)) {
    throw new CalorieRenderError('bad-input', '参数 wakeWord 非法（' + WAKE_WORDS.join('/') + '）：' + rawWord);
  }
  const { profile, latestWeightKg } = profileSnapshot(db);
  return {
    wakeWord: rawWord ?? null,
    before: profile,
    draft,
    filledCount: draft.length,
    activityChoices: tdeeChoices(profile, draft, latestWeightKg),
    latestWeightKg,
    prompt: settingPrompt(rawWord ?? null, draft, profile),
  };
}

function beforeTable(v: ProfileSettingView): string {
  if (!v.before) return renderDataTable({
    columns: [{ key: 'field', label: '字段' }, { key: 'value', label: '改前值' }],
    rows: [],
    emptyText: '尚无档案（空库；本次为首次设置，无改前值）',
  });
  const b = v.before;
  return renderDataTable({
    columns: [{ key: 'field', label: '字段' }, { key: 'before', label: '改前值' }, { key: 'after', label: '本次拟写' }],
    rows: UPDATE_FIELDS.map((f) => {
      const hit = v.draft.find((d) => d.camel === f.camel);
      return {
        field: f.label.replace(/（.*）$/, ''),
        before: cellOf(f.camel, profileField(f.camel, b)),
        after: hit ? cellOf(f.camel, hit.value) : '（未改）',
      };
    }),
    caption: '改档案 5 项：改前 → 改后对照',
  });
}

/** 活动量五档表（#238 清单 15 条）：列头改人话、公式不占表题、缺数据时整列收起改一句话说明。
 *  五档的系数与体重无关，缺项时照列；「预计每日消耗」缺四要素就不出数字（`energyOf` 的判据）。 */
function activityTable(v: ProfileSettingView): string {
  const first = v.activityChoices[0];
  const missing = first?.missing ?? [];
  const hasEnergy = v.activityChoices.some((c) => c.tdee !== null);
  const caption = hasEnergy
    ? '预计每日消耗 ＝ 基础代谢 × 活动系数，运动消耗另计；体重取最近一次 ' + v.latestWeightKg + ' kg'
    : '预计每日消耗要身高／年龄／性别／体重齐备才算；本次缺' + (missing.join('／') || '数据')
      + '，不算（系数与体重无关，照列）';
  const columns = hasEnergy
    ? [{ key: 'label', label: '档位' }, { key: 'factor', label: '系数' }, { key: 'tdee', label: '预计每日消耗' }]
    : [{ key: 'label', label: '档位' }, { key: 'factor', label: '系数' }];
  return renderDataTable({
    columns,
    rows: v.activityChoices.map((c) => ({
      label: c.label, factor: c.factor, tdee: c.tdee === null ? '未设置' : c.tdee + ' 卡',
    })),
    caption,
  });
}

function formOf(v: ProfileSettingView, fields: readonly { camel: string; label: string }[]): string {
  return renderParamForm({
    fields: fields.map((f) => {
      const hit = v.draft.find((d) => d.camel === f.camel);
      return { name: f.camel, label: f.label, value: hit ? hit.value : '' };
    }),
  });
}

/** 本页唯一的复制区（#239 三样一个区）：指令块 ＋ 三颗按钮——复制指令／复制数据（三格式菜单）／复制日志。
 *
 *  **指令那一颗为什么不走 `copyArea` 的 `prompt` 位**（#494）：那一路是共用件 `promptCopyArea`，
 *  它把 prompt 挂在 `renderActionBar` 的**数据位**上；公共层 `controls.ts:1389-1396` 的 #336 兜底
 *  （「数据位在场、日志位缺席」）随即补一颗**禁用态「复制日志」**，一页于是有两颗同名按钮
 *  （实测 `data-action-id` 三处：prompt／disabled log／真 log，#494 报的正是这一条）。
 *  本页把指令挂**日志位**（日志位单独给一颗，不触发兜底）：actionId 与文案仍取冻结表
 *  `CALORIE_COPY_ACTION`（`../render/copy.js`，概念唯一出处，不另造名字），按下的仍是 prompt 原文；
 *  同款做法见目标预检页 `src/goal/precheck.ts` 的 `copyZone()`（那页的注释记了同一处兜底）。
 *  数据位与日志位合成**一个** `copyArea`（两者都在场，兜底同样不触发）。 */
function copyZone(v: ProfileSettingView, envelope: SerializableEnvelope): string {
  const instruction = renderPreBlock({ command: v.prompt })
    + renderActionBar({
      copyLog: { actionId: CALORIE_COPY_ACTION.actionId, label: CALORIE_COPY_ACTION.label, text: v.prompt },
    });
  return instruction + copyArea({
    // 粘贴出去的页名写中文（#238 清单 13 条 / 票面裁定 3）：内部命令名对用户没有意义。
    data: { envelope, title: '【calorie · 档案预检】' },
    log: {
      envelope,
      copyLog: copyLog({
        command: 'calorie-cmd-read ' + WIZARD_KEY, source: PROFILE_SOURCE,
        actionAt: nowStamp(), version: DOC_VERSION,
      }),
    },
  });
}

/** ② 写前页整页：三条写入词各自的字段与槽位 ＋ 改前→改后对照 ＋ 复制指令。
 *
 *  复制区（#239）：指令／数据／日志三样一个区——指令块与三个按钮一个叫法
 *  （复制指令／复制数据／复制日志），不再给按钮配一个同名大标题（#238 清单 9 条）。
 *  数据区多接一颗「复制日志」（日志里写的是产出本页那条命令，本页不写库）。 */
export function buildProfileSettingDoc(v: ProfileSettingView): string {
  const current = v.before?.activity_level ?? null;
  const currentRow = v.activityChoices.find((c) => c.level === current);
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: WIZARD_KEY,
    data: {
      metrics: metricsOf({
        filledCount: v.filledCount,
        hasProfile: v.before ? 1 : 0,
        latestWeightKg: v.latestWeightKg,
        activityLevels: v.activityChoices.length,
        tdeeReady: v.activityChoices[0]?.tdee === null ? 0 : 1,
      }),
    },
  };
  // 空库时那两张卡（当前活动量／最近体重）本来只有占位，改成一句空态说明并进「改前值」卡
  // （#238 清单 11 条）。**不挂 `notice()` 的提示块**：共享 toast 的关闭按钮实测 60×25、对比度
  // 2.22，上页即让本票的门槛四关红两项（触控 + AA），而这一句本来就是卡片小字要说的事。
  const cards: KpiCardInput[] = [
    { label: '写入词', value: v.wakeWord ?? '三条全列', detail: v.wakeWord ? '填好表再复制指令' : '设置档案／改档案／设活动量' },
    { label: '已填', value: v.filledCount + ' 项', detail: '至少填 1 项才能出指令' },
    {
      label: '改前值',
      value: v.before ? '有' : '未设置',
      detail: v.before ? '档案已在库' : '空库：本次是首次设置，当前活动量与最近体重也还没有值',
    },
  ];
  if (v.before) {
    cards.push(
      { label: '当前活动量', value: activityLabel(current), detail: currentRow ? '系数 ×' + currentRow.factor : '' },
      {
        label: '最近体重',
        value: v.latestWeightKg === null ? '未设置' : v.latestWeightKg + ' kg',
        detail: '推荐活动量与每日消耗按它算',
      },
    );
  }
  const content = [
    renderKpiGrid(cards),
    renderDisclosure({ title: '档案现值（改前值）', contentHtml: beforeTable(v), open: true }),
    renderDisclosure({ title: '设置档案 4 项（身高／年龄／性别／活动量）', contentHtml: formOf(v, SET_FIELDS), open: openFor(v, SET_WORD) }),
    // 空库才写「空库无改前值」——有档案时那句话与上面的卡片互相打架（#238 清单 10 条）。
    renderDisclosure({
      title: '改档案 5 项（另含备注' + (v.before ? '' : '；空库无改前值') + '）',
      contentHtml: formOf(v, UPDATE_FIELDS), open: openFor(v, UPDATE_WORD),
    }),
    renderDisclosure({ title: '设活动量 5 档（系数与预计每日消耗）', contentHtml: activityTable(v), open: openFor(v, ACTIVITY_WORD) }),
    copyZone(v, envelope),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '档案预检',
    eyebrow: '基础信息 · 预检确认',
    subtitle: '这一页只做预检、不写档案；确认下面的值无误后，把指令复制给 AI 执行',
    content, pageUi: true,
  });
}

/** 三处配置里该展开哪一处：按写入词开对应那一处（缺省＝设置档案，即三条全列时的主配置）。
 *  另两处仍留在页上、收起来作参考——三条词共用这一页，展开的那处就是本词要填的。 */
function openFor(v: ProfileSettingView, wakeWord: string): boolean {
  if (v.wakeWord === null) return wakeWord === SET_WORD;
  return v.wakeWord === wakeWord;
}

/* 页尾「对账信息」折叠区与首格状态卡自 #251 起上移到共用位 `../shared/receiptParts.js`
 * （目标管理域是第二个用法，故跟它一起上移）。本文件与 `update.ts` 都从那里取用；
 * 「写入去向」那句说明按本域措辞传入，见上方 `PROFILE_WRITTEN_DETAIL`。 */

/** 「推荐活动量」一格：档位 ＋ 系数 ＋ 每日消耗影响（四要素缺哪项就写哪项，不算数字）。
 *  推荐口径＝按「日常活动情况」在五档里判定的档位（老技能推荐规则），本次入库即该档；
 *  它由页面按**库内现值 ＋ 最近体重**算出（不是写命令参数——字段允许清单里没有这一项）。 */
function recommendedActivityText(profile: ProfileRow | null, latestWeightKg: number | null): string {
  const level = profile?.activity_level ?? null;
  if (level === null || level === '') return '未设置（档案里没有活动量）';
  const head = activityLabel(level) + '（系数 ×' + (TDEE_ACTIVITY_FACTORS[level] ?? '未设置') + '）';
  const energy = energyOf({
    weightKg: latestWeightKg,
    heightCm: profile?.height_cm,
    age: profile?.age,
    gender: profile?.gender,
    activityLevel: level,
  });
  if (energy.tdee === null) return head + ' · TDEE 待补（缺' + energy.missing.join('／') + '，不算）';
  return head + ' · TDEE 约 ' + energy.tdee + ' 卡/天（按最近体重 ' + latestWeightKg + ' kg）';
}

/** ③ 两条写命令（设置档案／设活动量）的写后回执页；改档案回执页在 `update.ts`（它的对照区不同）。
 *  `db` ＝ 同一份库（写已完成，此处读**写后档案现值**算性别／推荐活动量）；
 *  `command` ＝ AI 真跑那条写命令的原文（`cli/write.ts` 从分派处传进来），进「复制日志」第 4 段。 */
export function buildProfileSettingReceiptDoc(db: DatabaseSync, receipt: CrudReceipt, command: string): string {
  const { profile, latestWeightKg } = profileSnapshot(db);
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: receipt.meta.wakeWord,
    data: { ok: true, message: receipt.summary },
  };
  const content = [
    renderKpiGrid([
      statusCard(receipt, PROFILE_WRITTEN_DETAIL),
      { label: '影响行数', value: receipt.affectedRows + ' 行', detail: '本次写入的行数' },
      {
        label: '写入字段',
        value: receipt.writtenFields.length + ' 项',
        detail: receipt.writtenFields.map(fieldLabel).join('、') || '未设置',
      },
    ]),
    renderDataTable({
      columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
      rows: [
        { k: '身高(cm)', v: cellOf('heightCm', profile?.height_cm) },
        { k: '年龄', v: cellOf('age', profile?.age) },
        { k: '性别', v: genderLabel(profile?.gender) },
        { k: '推荐活动量', v: recommendedActivityText(profile, latestWeightKg) },
        { k: '设置时间', v: receipt.meta.actionAt },
      ],
      caption: '写后档案：推荐活动量＝按日常活动情况在五档里判定的档位，算法与预检页一致',
    }),
    reconcileDisclosure(receipt),
    copyArea({
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command, source: receipt.meta.source, m5Line: receipt.m5Line,
          actionAt: receipt.meta.actionAt, version: DOC_VERSION,
        }),
      },
    }),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: receipt.scene + ' · 回执',
    eyebrow: '基础信息 · 写后回执',
    subtitle: localizeEnums(receipt.summary),
    content, pageUi: true,
  });
}
