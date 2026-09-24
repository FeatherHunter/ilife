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
import { renderDataTable, renderDisclosure, renderKpiGrid } from 'base-paint/blocks';
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
import { buildChangeSheetDoc } from './sheetDoc.js';
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

/** 写前页＝**档案变更单**（2026-09-24 用户敲定的最终样子）：渲染半边整支搬进同目录 `sheetDoc.ts`。
 *
 *  本件只留「取数 ＋ 草稿 ＋ 三条写入词的字段集 ＋ 复制口径」，渲染与页内重算归 sheetDoc；
 *  旧版三节字段面／提示词模板整段／`renderParamForm` 那条路一并退役（理由见 sheetDoc.ts 件头）。 */
/** 写前页＝**档案变更单**（2026-09-24 用户敲定的最终样子）：渲染半边整支搬进同目录 `sheetDoc.ts`。
 *  本件只留「取数 ＋ 草稿 ＋ 三条写入词的字段集 ＋ 复制口径」，渲染与页内重算归 sheetDoc。 */
export function buildProfileSettingDoc(v: ProfileSettingView): string {
  return buildChangeSheetDoc(v);
}

/** 「推荐活动量」一格：档位 ＋ 系数 ＋ 每日消耗影响（四要素缺哪项就写哪项，不算数字）。
 *  推荐口径＝按「日常活动情况」在五档里判定的档位；它由页面按**库内现值 ＋ 最近体重**算出。 */
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
    // 宽屏单列锁（同上）：写后回执的读数卡与写后档案表同样收回 880 正文列。
    lockColumn: true,
  });
}
