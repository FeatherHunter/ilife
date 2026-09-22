/** #873 · 复制区共用件：复制数据恒三格式菜单 ＋ 复制日志六段。
 *
 * 本件只装私家大厨要的两样 —— `chefCopyArea`（数据位恒出「复制数据 ＋ 纯文本／JSON／CSV
 * 三选一菜单」，调用方不声明开关）与 `chefCopyLog`（复制日志第 2–6 段入参）。
 * `promptCopyArea`／`notice` 本包没有调用方，不装。
 *
 * **2026-09-22 用户两次裁定，形状与旧版不同（读这段再改）**：
 * ① **日志位恒出**：每张页都要有「复制日志」那颗按钮（改前 53 件产物里只有 8 件有）；
 * ② **卡片与标题全去**（裁定「乙」）：不再出 `<section class="ilife-block-copy-block">`、
 *    不再出标题，只剩一行 ghost 动作排。**故本件不再走 `renderCopyBlock`**，改直连
 *    `base-paint` 的 `renderActionBar` ＋ `COPY_ACTION_IDS`（`renderCopyBlock` 内部调的
 *    就是同一个 `renderActionBar`，本件不重写编排、也不抄常量）。
 *
 * 三件东西只接线、不重造（**base-render 侧改动为零**）：
 * ① 复制按钮与动作排 → `base-paint` 的 `renderActionBar({ copyData, copyLog })`
 *   （`formats` 与 `text` 互斥，数据位恒走前者）；
 * ② 复制文本 → `base-paint` 的 `buildDataText`（`detail`／`list`／`receipt`／`stat` 四种通用形，
 *    调用方给纯域数据、本件套信封）／`buildLogText`（6 段日志）；
 * ③ 复制成功与失败的提示 → 页面运行时的菜单委派（`buildSharedHelpersJs`，私家大厨页经
 *    `renderSceneShell` → `renderDocShell` 已注入，本件不产第二条提示通道）。
 *
 * ⚠️ **只改了本包**：`base-render` 的 `copyBlock` 仍留在它的「12 区块闭集」里，另外五个技能
 * （卡路里／记账／居家管家／备忘录／作息）的复制区一个字节没动。要不要一起推平，等维护者裁
 * —— 动公共层须先立公共层 issue（总纲 09）＋ 补 CHANGELOG。
 *
 * 谁在用（共用位须写得出哪两个在用）：录入／做菜／数据管理／历史／派生／开始使用／采购／查看
 * 8 个域装配件 ＋ 搜索筛选／修改 2 个产物驱动器（共 15 处调用，清单见 `t873-席复制按钮.md`）。
 *
 * 对外 2 个名字：`chefCopyArea`／`chefCopyLog`。入参类型不导出 —— 调用方传字面量即可
 * （同卡路里 `copyArea.ts` 的口径）。
 */
import { COPY_ACTION_IDS, renderEmptyBlock } from 'base-paint/blocks';
import { buildDataText, buildLogText, renderActionBar } from 'base-paint';
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
  /** 复制数据按钮的 `actionId`（须页内唯一；不给＝公共层缺省）。 */
  readonly dataActionId?: string;
  /** 复制日志按钮的 `actionId`（须页内唯一；不给＝公共层缺省）。 */
  readonly logActionId?: string;
  /** 给了就出「复制数据」（三格式菜单），内部走 `buildDataText`。 */
  readonly data?: ChefCopyData;
  /** 复制日志的过程证据（第 2–6 段入参）。**不给也出「复制日志」**——退到 `{ command: data.key }`
   *  （见 `chefCopyArea` 头注）；给了就按给的填，未给的项照 `buildLogText` 的 `(未知)` 口径。 */
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

/** 复制区（**2026-09-22 用户裁定「乙」：卡片与标题全去**）。
 *
 *  **不再出区块壳**：没有 `<section class="ilife-block-copy-block">`、没有标题，只剩一行 ghost 动作排
 *  —— `复制数据 ▾`（三格式菜单）＋ `复制日志`，形状与页面其它动作排同列同宽。
 *  改动只在**本包**（走公共层 `renderActionBar` ＋ `COPY_ACTION_IDS`，不抄常量、不重写编排）；
 *  `base-render` 的 `copyBlock` 仍留在它的「12 区块闭集」里，其它五个技能的复制区一个字节没动
 *  —— 要不要一起推平，等维护者裁（动公共层须先立公共层 issue ＋ 补 CHANGELOG）。
 *
 *  **日志位恒出**（同日裁定）：调用方给 `log` 就用它，没给则退到 `{ command: data.key }` ——
 *  命令键本来就随 `data` 一起进来，退出的六段仍是**真读数**（调用链＝这条命令、数据结构＝库名），
 *  不是占位。「给不出就整颗不出」是旧口径，已废：它让 45/53 张页没有复制日志按钮。
 *
 *  两样全不给 ＝ 一句空态、不出按钮（空态不是按钮排，仍走 `renderEmptyBlock`）。 */
export function chefCopyArea(input: ChefCopyAreaInput): string {
  const data = input.data;
  const log = input.log;
  if (data !== undefined || log !== undefined) {
    if (data === undefined) throw new Error('chefCopyArea: log 位须与 data 位同给（日志场景由数据信封派生）');
    const envelope = dataEnvelopeOf(data);
    const logText = buildLogText({
      envelope: sceneEnvelopeOf(envelope),
      copyLog: chefCopyLog(log ?? { command: data.key }),
    });
    return renderActionBar({
      copyData: {
        actionId: input.dataActionId ?? COPY_ACTION_IDS.actionBar.copyData,
        formats: formatsOf({ envelope }),
      },
      copyLog: {
        actionId: input.logActionId ?? COPY_ACTION_IDS.actionBar.copyLog,
        text: logText,
      },
    });
  }
  return renderEmptyBlock({
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
