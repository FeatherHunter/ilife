/** #873 · 复制区共用件：复制数据恒三格式菜单 ＋ 复制日志六段。
 *
 * 形状照抄卡路里 `packages/skill-calorie/src/shared/copyArea.ts`（#239 件 ＋ #247 三格式）：
 * 本件只装私家大厨要的两样 —— `chefCopyArea`（数据位恒出「复制数据 ＋ 纯文本／JSON／CSV
 * 三选一菜单」，调用方不声明开关）与 `chefCopyLog`（复制日志第 2–6 段入参）。
 * `promptCopyArea`／`notice` 本包没有调用方，不装。
 *
 * 三件东西只接线、不重造（base-render 侧改动为零）：
 * ① 复制按钮与区块 → `base-paint/blocks` 的 `renderCopyBlock({ dataFormats, logText })`
 *   （`dataFormats` 与 `dataText` 互斥，本件恒走前者）；
 * ② 复制文本 → `base-paint` 的 `buildDataText`（`detail`／`list`／`receipt`／`stat` 四种通用形，
 *    调用方给纯域数据、本件套信封）／`buildLogText`（6 段日志）；
 * ③ 复制成功与失败的提示 → 页面运行时的菜单委派（`buildSharedHelpersJs`，私家大厨页经
 *    `renderSceneShell` → `renderDocShell` 已注入，本件不产第二条提示通道）。
 *
 * 谁在用（共用位须写得出哪两个在用）：录入／做菜／数据管理／历史／派生／开始使用／采购／查看
 * 8 个域装配件 ＋ 搜索筛选／修改 2 个产物驱动器（共 18 处调用，清单见 `t873-席复制按钮.md`）。
 *
 * 对外 2 个名字：`chefCopyArea`／`chefCopyLog`。入参类型不导出 —— 调用方传字面量即可
 * （同卡路里 `copyArea.ts` 的口径）。
 */
import { renderCopyBlock, renderEmptyBlock } from 'base-paint/blocks';
import { buildDataText, buildLogText } from 'base-paint';
import type { CopyLogFields, DataTextInput, SerializableEnvelope } from 'base-paint';
import { createEnvelope } from 'base-link-core';
import { CHEF_CONFIG_DEFAULTS } from '../config.js';

/** 技能名（包名即技能名；与 `render/envelope.ts` 的 `buildChefEnvelope` 同字面）。 */
const CHEF_SKILL = 'chef';
/** 日志第 2 段（AI 思考链）：本包页面一律由本地命令渲染（含产物驱动器），不落 `(未知)` 占位。 */
const LOG_THINKING = '本页由本地命令渲染，无 AI 链';
/** 日志第 6 段（异常）：正常产出即「无」。 */
const LOG_EXCEPTION = '无';
/** 复制区空态缺省句（数据与日志两样全没给时出这一句、不出按钮）。 */
const COPY_EMPTY_TEXT = '本页没有可复制的数据';
/** 三格式菜单里三项的用途提示：本技能一律留空（顺序＝`COPY_FORMATS`）。
 *
 * 传空串而非撤掉 `hints` 位：公共层的三格式菜单对空串不渲染那行小字
 * （`controls.ts:1376`），形状与「不给 hints」一致，但不依赖公共层那一支的缺省值
 * （与卡路里 `MENU_HINTS` 同口径）。 */
const MENU_HINTS: readonly string[] = ['', '', ''];
/** 复制区口径：只留动作不留说明文本 —— `title` 与复制按钮同名（「复制数据」）时只留按钮、
 *  不出标题（公共层 `renderCopyBlock` 另有 #336 兜底；本件与它同口径，双层一致）。 */
const COPY_TITLE_DUP_OF_BUTTON = '复制数据';
/** 库文件名（日志第 3 段前半的固定位）：唯一定义地是 `config.ts` 的
 *  `CHEF_CONFIG_DEFAULTS.db.name`，本件只引用、不重写。 */
const DB_NAME = CHEF_CONFIG_DEFAULTS.db.name;

/** 数据位的纯域数据（四种通用形；信封由本件套，调用方不拼 `version`／`skill`）。 */
type ChefCopyData =
  | { readonly key: string; readonly shape: 'detail'; readonly item: Record<string, unknown> }
  | { readonly key: string; readonly shape: 'list'; readonly items: unknown[]; readonly total?: number }
  | { readonly key: string; readonly shape: 'receipt'; readonly ok: boolean; readonly message: string }
  | { readonly key: string; readonly shape: 'stat'; readonly metrics: Record<string, number> };

/** 复制日志的入参：本次执行的过程证据（第 1 段「场景标识」由数据信封派生，不在这里填）。
 *  给不出的项如实缺省（`buildLogText` 按 `(未知)` 口径渲染），不编数冒充。 */
interface ChefCopyLog {
  /** 渲染本页（或写库）的命令原文，可照抄重跑。 */
  readonly command?: string;
  /** 本次数据来源（第 3 段后半）。 */
  readonly source?: string;
  /** 写库回执的 M5 整行（第 4 段后半；库里写了哪些字段、影响几行）。 */
  readonly m5Line?: string;
  /** 时间戳（第 5 段；给得出才给，给不出就缺省）。 */
  readonly actionAt?: string;
  /** 文档版本（第 5 段后半）；不给则不写这半句。 */
  readonly version?: string;
}

/** `chefCopyArea` 的可填位：给了什么出什么，数据位恒出三格式菜单。 */
interface ChefCopyAreaInput {
  /** 区块标题；不给＝不出标题。与复制按钮同名（「复制数据」）＝不出标题（只留动作不留说明文本）。 */
  readonly title?: string;
  /** 复制数据按钮的 `actionId`（须页内唯一；不给＝公共层缺省）。 */
  readonly dataActionId?: string;
  /** 复制日志按钮的 `actionId`（须页内唯一；不给＝公共层缺省）。 */
  readonly logActionId?: string;
  /** 给了就出「复制数据」（三格式菜单），内部走 `buildDataText`。 */
  readonly data?: ChefCopyData;
  /** 给了就出「复制日志」，内部走 `buildLogText`（须与 `data` 同给：场景由数据信封派生）。 */
  readonly log?: ChefCopyLog;
  /** 数据与日志两样全没给时的那句话（缺省也有一句，见 `COPY_EMPTY_TEXT`）。 */
  readonly emptyText?: string;
}

/** 纯域数据 → 数据信封（`createEnvelope` 逐形状全字段校验：缺字段即抛，不返空冒充）。 */
function dataEnvelopeOf(input: ChefCopyData): SerializableEnvelope {
  switch (input.shape) {
    case 'detail':
      return createEnvelope({ skill: CHEF_SKILL, shape: 'detail', key: input.key, data: { item: input.item } });
    case 'list':
      return createEnvelope({
        skill: CHEF_SKILL, shape: 'list', key: input.key,
        data: input.total === undefined ? { items: input.items } : { items: input.items, total: input.total },
      });
    case 'receipt':
      return createEnvelope({ skill: CHEF_SKILL, shape: 'receipt', key: input.key, data: { ok: input.ok, message: input.message } });
    case 'stat':
      return createEnvelope({ skill: CHEF_SKILL, shape: 'stat', key: input.key, data: { metrics: input.metrics } });
  }
}

/** 场景键归一（口径出处：卡路里 `src/shared/sceneEnvelope.ts` #550）。
 *
 * 公共层场景标识的算式是 `skill ＋ '.' ＋ key`，而本包信封的 `key` 是注册表整名
 * （如 `chef.recipe.write`）⇒ 不归一会印成 `chef.chef.recipe.write`（一个不存在的命令键）。
 * `key` 不以 `{skill}.` 开头时返回入参那一只对象本身（引用相等，逐字节不变）。 */
function sceneEnvelopeOf(envelope: SerializableEnvelope): SerializableEnvelope {
  const skill = typeof envelope.skill === 'string' ? envelope.skill : '';
  const key = typeof envelope.key === 'string' ? envelope.key : '';
  if (skill === '' || key === '') return envelope;
  const prefix = skill + '.';
  if (key.indexOf(prefix) !== 0) return envelope;
  return { ...envelope, key: key.slice(prefix.length) };
}

/** 三格式形态的入参：`data` 位的那份数据 → 三种格式各算一份 ＋ 菜单提示（三空串）。 */
function formatsOf(data: DataTextInput): {
  readonly text: string;
  readonly json: string;
  readonly csv: string;
  readonly hints: readonly string[];
} {
  return {
    text: buildDataText({ ...data, format: 'text' }),
    json: buildDataText({ ...data, format: 'json' }),
    csv: buildDataText({ ...data, format: 'csv' }),
    hints: MENU_HINTS,
  };
}

/** 复制区：数据位恒出三格式菜单（调用方不需要声明）；日志位走 6 段。两样全不给＝一句空态、不出按钮。 */
export function chefCopyArea(input: ChefCopyAreaInput): string {
  const data = input.data;
  const log = input.log;
  const title = input.title === COPY_TITLE_DUP_OF_BUTTON ? undefined : input.title;
  if (data !== undefined || log !== undefined) {
    if (data === undefined) throw new Error('chefCopyArea: log 位须与 data 位同给（日志场景由数据信封派生）');
    const envelope = dataEnvelopeOf(data);
    const logText = log === undefined
      ? undefined
      : buildLogText({ envelope: sceneEnvelopeOf(envelope), copyLog: chefCopyLog(log) });
    return renderCopyBlock({
      ...(title === undefined ? {} : { title }),
      ...(input.dataActionId === undefined ? {} : { dataActionId: input.dataActionId }),
      ...(input.logActionId === undefined ? {} : { logActionId: input.logActionId }),
      dataFormats: formatsOf({ envelope }),
      ...(logText === undefined ? {} : { logText }),
    });
  }
  return renderEmptyBlock({
    ...(title === undefined ? {} : { title }),
    text: input.emptyText ?? COPY_EMPTY_TEXT,
  });
}

/** 复制日志的第 2–6 段入参：本页由哪条命令渲染、数据从哪来、写了多少行、什么时候。 */
export function chefCopyLog(input: ChefCopyLog): CopyLogFields {
  const command = input.command ?? '';
  const m5Line = input.m5Line ?? '';
  const actionAt = input.actionAt ?? '';
  const version = input.version ?? '';
  return {
    thinking: LOG_THINKING,
    dataStructure: DB_NAME + (input.source === undefined || input.source === '' ? '' : ' ｜ ' + input.source),
    callChain: m5Line === '' ? command : (command === '' ? m5Line : command + ' ｜ ' + m5Line),
    timestamp: version === '' ? actionAt : (actionAt === '' ? '版本 ' + version : actionAt + ' · 版本 ' + version),
    exception: LOG_EXCEPTION,
  };
}
