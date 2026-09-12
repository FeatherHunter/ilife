/** #179 · 「设置资料」：设置档案／设活动量／改档案三条写入词共用的写前页（预检确认页）。
 *
 * 一页一事：字段面（身高／年龄／性别／活动量／备注）就是本子功能的题目，
 * 故这一页住本文件，`update.ts` 要用就从同目录取用（设计 §一，铁律五不另起转手件）。
 *
 * 取数：档案现值走 `fetch/profile.getProfile`（**不用** `buildProfileView`——它缺档案即抛
 * `missing-data`，会把预检页变成没有产物）；最新体重走同目录 `view.profileSnapshot`
 * 那一份查询（同一个取数不留两处）。页面层不自算口径：活动量系数取
 * `analysis/utils.TDEE_ACTIVITY_FACTORS` 正本，TDEE 走同文件 `calcTdee`（缺身高/年龄/
 * 性别/体重时**不算**，不填默认值冒充）。
 * 未知参数抛 `bad-input`（与 `render/wizardPort.ts` 同字面「不支持字段: 」，出口 exit 2）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { renderDataTable, renderDisclosure, renderKpiGrid, renderParamForm } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import type { CrudReceipt } from '../render/receipt.js';
import type { ProfileRow } from '../fetch/profile.js';
import { ACTIVITY_LEVELS } from '../kcal.js';
import { ACTIVITY_LEVEL_LABELS, TDEE_ACTIVITY_FACTORS, calcTdee } from '../analysis/utils.js';
import { CalorieRenderError } from '../render/errors.js';
import { nowStamp } from '../render/receipt.js';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { profileSnapshot, PROFILE_SOURCE } from './view.js';

const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
const DOC_TITLE = '卡路里·档案预检';
/** 本页由哪条命令产出（写进「复制日志」第 4 段，可照抄重跑）。 */
const WIZARD_KEY = 'calorie.view.profile-wizard';

/** 三条写入词（HELP `scene-07-profile.ts` 的 name，逐字）。 */
const SET_WORD = '设置档案';
const ACTIVITY_WORD = '设活动量';
const UPDATE_WORD = '改档案';
const WAKE_WORDS: readonly string[] = [SET_WORD, ACTIVITY_WORD, UPDATE_WORD];

/** 设置档案 4 项（`scene-07-profile.ts:5` 的 data_fields）；参数名与写命令同形。 */
const SET_FIELDS: readonly { camel: string; label: string }[] = [
  { camel: 'heightCm', label: '身高（cm）' },
  { camel: 'age', label: '年龄' },
  { camel: 'gender', label: '性别（male/female 或 男/女）' },
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
  /** 活动量五档：档位／入库值／系数／TDEE 影响（四要素齐备才算，否则 null）。 */
  activityChoices: { level: string; label: string; factor: number; tdee: number | null }[];
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

/** TDEE 影响：草稿优先于库值；四要素缺一即 null（不拿默认值算）。 */
function tdeeChoices(
  before: ProfileRow | null,
  draft: ProfileSettingView['draft'],
  latestWeightKg: number | null,
): ProfileSettingView['activityChoices'] {
  const pick = (camel: string): string | number | null => draft.find((d) => d.camel === camel)?.value ?? profileField(camel, before);
  const height = Number(pick('heightCm'));
  const age = Number(pick('age'));
  const gender = pick('gender');
  const ready = Number.isFinite(height) && height > 0 && Number.isFinite(age) && age > 0
    && typeof gender === 'string' && gender !== '' && latestWeightKg !== null;
  return ACTIVITY_LEVELS.map((level) => ({
    level,
    label: ACTIVITY_LEVEL_LABELS[level] as string,
    factor: TDEE_ACTIVITY_FACTORS[level] as number,
    tdee: ready ? calcTdee(latestWeightKg, height, age, gender, level) : null,
  }));
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

function settingPrompt(wakeWord: string | null, draft: ProfileSettingView['draft'], before: ProfileRow | null): string {
  if (draft.length === 0) {
    return '// 请至少填 1 项（设置档案 4 项：身高/年龄/性别/活动量；改档案 5 项另含备注；设活动量 5 档见下方对照表）';
  }
  const lines = draft.map((d) => '- ' + d.label.replace(/（.*）$/, '') + ':' + d.value);
  const head = '请帮我' + (wakeWord ?? '写档案') + '到卡路里\n\n参数:'
    + (wakeWord ? '\n- 写入词:' + wakeWord : '')
    + '\n' + lines.join('\n');
  const beforeNote = before
    ? '\n\n改前值已在页面「档案现值（改前值）」区列出；写库前与库内现值核对，不一致停下问我。'
    : '\n\n库内还没有档案（空库）：本次是首次设置，无改前值可比对。';
  if (!wakeWord) return head + beforeNote;
  const keep = fieldsForWord(wakeWord).map((f) => f.camel);
  const picked: Record<string, unknown> = {};
  for (const d of draft) {
    if (!keep.includes(d.camel)) continue;
    picked[d.camel] = d.camel === 'note' ? d.value : (NUM_FIELDS.includes(d.camel) ? Number(d.value) : d.value);
  }
  if (Object.keys(picked).length === 0) return head + beforeNote;
  return head + beforeNote + '\n\n命令:\n```bash\n' + writeCommand(wakeWord, picked) + '\n```\n完成后返回写库回执。';
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
      const prev = profileField(f.camel, b);
      return { field: f.label.replace(/（.*）$/, ''), before: prev ?? '—', after: hit ? hit.value : '（未改）' };
    }),
    caption: '改档案 5 项：改前 → 改后对照（改前值取自 user_profile#1）',
  });
}

function activityTable(v: ProfileSettingView): string {
  return renderDataTable({
    columns: [
      { key: 'label', label: '档位' }, { key: 'level', label: '入库值' },
      { key: 'factor', label: '系数' }, { key: 'tdee', label: 'TDEE 影响' },
    ],
    rows: v.activityChoices.map((c) => ({
      label: c.label, level: c.level, factor: c.factor,
      tdee: c.tdee === null ? '—（缺身高/年龄/性别/体重，不算）' : c.tdee + ' 卡',
    })),
    caption: '设活动量 5 档：TDEE ＝ 基础代谢（Mifflin-St Jeor）× 系数'
      + (v.latestWeightKg === null ? '；最近体重缺，故只列系数' : '；体重取最近一次 ' + v.latestWeightKg + ' kg'),
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

/** ② 写前页整页：三条写入词各自的字段与槽位 ＋ 改前→改后对照 ＋ 复制 prompt。
 *
 *  复制区（#239）：prompt／数据／日志三样一个 `copyArea` 出——复制 prompt 区与今天逐字相同，
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
  const content = [
    renderKpiGrid([
      // #179 内容级排版：KPI 卡的 value 槽是给一个**短值**的（28px 粗体），19 字长句塞进去
      // 在 390px 下会折成 4 行、把整排卡片一起拉高 → 值只写入词本身，长句落 12px 的 detail。
      {
        label: '写入词',
        value: v.wakeWord ?? '三条全列',
        detail: v.wakeWord ? '填表 → 复制 prompt → AI 写库' : '设置档案／改档案／设活动量',
      },
      { label: '已填', value: v.filledCount + ' 项', detail: '至少 1 项才有 prompt' },
      { label: '改前值', value: v.before ? '有' : '无', detail: v.before ? '档案已在库' : '空库：首次设置' },
      { label: '当前活动量', value: current ? (currentRow?.label ?? current) : '—', detail: current && currentRow ? '系数 ' + currentRow.factor : '' },
      { label: '最近体重', value: v.latestWeightKg === null ? '—' : v.latestWeightKg + ' kg', detail: '推荐活动量与 TDEE 用它' },
    ]),
    renderDisclosure({ title: '档案现值（改前值，user_profile#1）', contentHtml: beforeTable(v), open: true }),
    renderDisclosure({ title: '设置档案 4 项（身高／年龄／性别／活动量）', contentHtml: formOf(v, SET_FIELDS), open: true }),
    renderDisclosure({ title: '改档案 5 项（另含备注；空库无改前值）', contentHtml: formOf(v, UPDATE_FIELDS) }),
    renderDisclosure({ title: '设活动量 5 档（系数与 TDEE 影响）', contentHtml: activityTable(v) }),
    copyArea({
      title: '复制数据',
      prompt: v.prompt,
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command: 'calorie-cmd-read ' + WIZARD_KEY, source: PROFILE_SOURCE,
          actionAt: nowStamp(), version: DOC_VERSION,
        }),
      },
    }),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '档案预检',
    eyebrow: '基础信息 · 写前预检（填表→复制 prompt→AI 写库）',
    subtitle: '改前值取自库内现值；写入仍走三条写命令，本页不写库',
    content,
  });
}

/** ③ 两条写命令（设置档案／设活动量）的写后回执页；改档案回执页在 `update.ts`（它的对照区不同）。
 *  `command` ＝ AI 真跑那条写命令的原文（`cli/write.ts` 从分派处传进来），进「复制日志」第 4 段。 */
export function buildProfileSettingReceiptDoc(receipt: CrudReceipt, command: string): string {
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: receipt.meta.wakeWord,
    data: { ok: true, message: receipt.summary },
  };
  const content = [
    renderKpiGrid([
      { label: '动作', value: receipt.scene, detail: 'op=' + receipt.op },
      { label: '影响行数', value: receipt.affectedRows + ' 行', detail: receipt.affectedRowsSource },
      { label: '写入字段', value: receipt.writtenFields.length + ' 项', detail: receipt.writtenFields.join('、') || '—' },
    ]),
    renderDataTable({
      columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
      rows: [
        { k: '摘要', v: receipt.summary },
        { k: '记录 id', v: receipt.recordId === null ? 'n/a' : String(receipt.recordId) },
        { k: 'id 口径', v: receipt.idSource },
        { k: '写入时刻', v: receipt.meta.actionAt },
        { k: '无变化', v: receipt.noChange ? '是' : '否' },
      ],
      caption: receipt.meta.entityType + '（写库回执）',
    }),
    copyArea({
      title: '复制数据',
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
    eyebrow: '基础信息 · 写后回执（M5 契约 v' + receipt.m5Contract + '）',
    subtitle: receipt.m5Line,
    content,
  });
}
