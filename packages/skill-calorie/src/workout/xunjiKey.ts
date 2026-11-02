/** 查／设／清训记 KEY（HELP 场景 05「健身计划」下一级「落地训练」）。
 *
 * 为什么是三个命令：用户在 DSH 会话里没有 `node`、调不了 `xunji key …` 子命令
 * （调用形态见 `docs/agents/技能调用契约.md` §三），而落地链天天要 KEY——
 * 查状态（只读）／写入（改配置文件）／清除各一条，唤醒词即命令名，当场可跑。
 *
 * 调用形态（与 `xunjiPush.ts` 同形，不深引 `xunji` 内部件）：
 * 经 `./xunjiRunner.js` 子进程调 `key status|set|clear`；父进程只做存在性预检 →
 * 限时调用 → 退出码翻译 → 按翻译失败（`fail` 直接退，不落成功页）。
 * 查状态是例外：子进程回码 2（未配置）对查询来说是有效答案，回 exit 0 的未配页。
 *
 * 保密：KEY 全串永不进读数／回执／HTML／日志。状态页只展子进程回的预览位
 * （前 4 字＋`...`＋末 2 字，短串展星号）；设 KEY 页的复制区用 *** 脱敏后的参数。
 *
 * 预演共用（本件是唯一定义地，`land.ts`／`landBatch.ts`／`xunjiPush.ts`／
 * `xunjiBackfill.ts` 四处预演页只引用不重写）：
 * - `isXunjiKeyConfigured()`：只问有无（与 `xunji/key.ts#readKey` 同式 presence 判断，
 *   预览以本件查状态命令为准，不在此处复刻预览公式）；
 * - `XUNJI_KEY_STATUS_CMD`／`XUNJI_KEY_SET_CMD`：下一步文案里的两条可复制命令。
 */
import type { DatabaseSync } from 'node:sqlite';
import { renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import { loadCalorieConfig } from '../config.js';
import { assembleDocPage } from '../shared/docPage.js';
import { copyBlock } from '../shared/copyBlock.js';
import { fail } from '../shared/params.js';
import { R, provided } from '../shared/writeParts.js';
import type { ViewOut, WriteOut } from '../shared/commandSpec.js';
import type { CrudReceipt } from '../render/receipt.js';
import { invokeXunji, xunjiExitToCmd } from './xunjiRunner.js';
import { m } from '../entries/index.js';

export const XUNJI_KEY_STATUS_KEY = 'calorie.view.xunji-key';
export const XUNJI_KEY_SET_KEY = 'calorie.workout.xunji-key-set';
export const XUNJI_KEY_CLEAR_KEY = 'calorie.workout.xunji-key-clear';
const XUNJI_KEY_STATUS_WAKE = '查训记KEY状态';
const XUNJI_KEY_SET_WAKE = '设训记KEY';
const XUNJI_KEY_CLEAR_WAKE = '清训记KEY';
const DOC_TITLE = (): string => m('skill-calorie.workout-xunjiKey.c076');
const KEY_SOURCE = (): string => m('skill-calorie.workout-xunjiKey.c077');

/** 下一步文案里的两条可复制命令（全仓只此一处，缺 KEY 的四处报错都引它）。 */
export const XUNJI_KEY_STATUS_CMD = 'calorie-cmd-read ' + XUNJI_KEY_STATUS_KEY;
export const XUNJI_KEY_SET_CMD = 'calorie-cmd-read ' + XUNJI_KEY_SET_KEY + ' --params \'{"xunjiKey":"<KEY值>"}\'';

/** 缺 KEY 错误的后半句（前半句保留「本地缺 KEY（没调远端）」老子串，旧测试不断）。 */
export function xunjiKeyNext(): string {
  return m('skill-calorie.workout-xunjiKey.c001', {
    p0: String(XUNJI_KEY_STATUS_CMD),
    p1: String(XUNJI_KEY_SET_CMD),
  });
}

/** 预演页只问有无（见件头：预览以查状态命令为准）。读不到配置即按未配处理。 */
export function isXunjiKeyConfigured(): boolean {
  try {
    const v = loadCalorieConfig().values.xunji.key;
    return typeof v === 'string' && v.trim() !== '';
  } catch {
    return false;
  }
}

/** 子进程 `key status` stdout 的形状（`xunji/key.ts#KeyStatus`，无全串位）。 */
interface KeyStatusRead {
  readonly key_field: string;
  readonly configured: boolean;
  readonly active_key_preview: string | null;
  readonly recommendation: string;
}

function asKeyStatus(data: unknown): KeyStatusRead | null {
  const o = data as Partial<KeyStatusRead> | null | undefined;
  if (typeof o !== 'object' || o === null || typeof o.configured !== 'boolean') return null;
  return {
    key_field: typeof o.key_field === 'string' ? o.key_field : 'xunji.key',
    configured: o.configured,
    active_key_preview: typeof o.active_key_preview === 'string' ? o.active_key_preview : null,
    recommendation: typeof o.recommendation === 'string' ? o.recommendation : '',
  };
}

/** 预演页与报错页共用的 KEY 行（配了／没配两态，没配即点名下一步）。 */
export function xunjiKeyRow(): { k: string; v: string } {
  return isXunjiKeyConfigured()
    ? { k: m('skill-calorie.workout-xunjiKey.c002'), v: m('skill-calorie.workout-xunjiKey.c003') }
    : {
      k: m('skill-calorie.workout-xunjiKey.c004'),
      v: m('skill-calorie.workout-xunjiKey.c005', { p0: String(xunjiKeyNext()) }),
    };
}

/** `calorie.view.xunji-key` · 查训记 KEY 状态（只读；配了／没配都 exit 0 出页）。 */
export function viewXunjiKeyStatus(_params: Record<string, unknown>, _db: DatabaseSync): ViewOut {
  const call = invokeXunji(['key', 'status'], XUNJI_KEY_STATUS_WAKE);
  const read = asKeyStatus(call.data);
  const configured = read !== null ? read.configured : call.code === 0;
  const preview = read?.active_key_preview ?? null;
  const data = {
    // `stat` 形守卫要 `metrics` 全 number（见 `render/envelope.ts#assertStatMetrics`），
    // 其余平铺位照既有读命令的习惯给（页与测试都读它们）。
    metrics: { configured: configured ? 1 : 0 },
    configured,
    keyField: read?.key_field ?? 'xunji.key',
    preview,
    checkedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
  };
  const content = [
    renderKpiGrid([
      { label: m('skill-calorie.workout-xunjiKey.c006'), value: configured ? m('skill-calorie.workout-xunjiKey.c007') : m('skill-calorie.workout-xunjiKey.c008'), detail: m('skill-calorie.workout-xunjiKey.c009') },
      { label: m('skill-calorie.workout-xunjiKey.c010'), value: preview ?? '—', detail: configured ? m('skill-calorie.workout-xunjiKey.c011') : m('skill-calorie.workout-xunjiKey.c012') },
      { label: m('skill-calorie.workout-xunjiKey.c013'), value: 'xunji.key', detail: KEY_SOURCE() },
    ]),
    renderDataTable({
      columns: [{ key: 'step', label: m('skill-calorie.workout-xunjiKey.c014') }, { key: 'does', label: m('skill-calorie.workout-xunjiKey.c015') }],
      rows: configured
        ? [
          { step: m('skill-calorie.workout-xunjiKey.c016'), does: m('skill-calorie.workout-xunjiKey.c017') },
          { step: m('skill-calorie.workout-xunjiKey.c018'), does: m('skill-calorie.workout-xunjiKey.c019', { p0: String(XUNJI_KEY_SET_CMD) }) },
          { step: m('skill-calorie.workout-xunjiKey.c020'), does: m('skill-calorie.workout-xunjiKey.c021', { p0: String(XUNJI_KEY_CLEAR_KEY) }) },
        ]
        : [
          { step: m('skill-calorie.workout-xunjiKey.c022'), does: m('skill-calorie.workout-xunjiKey.c023', { p0: String(XUNJI_KEY_SET_CMD) }) },
          { step: m('skill-calorie.workout-xunjiKey.c024'), does: m('skill-calorie.workout-xunjiKey.c025') },
          { step: m('skill-calorie.workout-xunjiKey.c026'), does: m('skill-calorie.workout-xunjiKey.c027') },
        ],
      caption: m('skill-calorie.workout-xunjiKey.c028'),
    }),
  ].join('');
  const html = assembleDocPage({
    docTitle: DOC_TITLE(),
    title: XUNJI_KEY_STATUS_WAKE,
    eyebrow: m('skill-calorie.workout-xunjiKey.c029'),
    subtitle: configured ? m('skill-calorie.workout-xunjiKey.c030') : m('skill-calorie.workout-xunjiKey.c031'),
    content,
    pageUi: true,
  });
  return { data, html };
}

/** `xunjiKey` 参数：兼容旧话术里 `key` 那一位（报错提示仍只教 `xunjiKey`）。 */
function readXunjiKey(params: Record<string, unknown>): string {
  const v = params['xunjiKey'] ?? params['key'];
  if (typeof v !== 'string' || v.trim() === '') {
    fail(2, m('skill-calorie.workout-xunjiKey.c032', { p0: String(XUNJI_KEY_SET_CMD) }));
  }
  const trimmed = (v as string).trim();
  if (trimmed.length > 1024) fail(2, m('skill-calorie.workout-xunjiKey.c033'));
  return trimmed;
}

function keyWriteReceipt(wake: string, message: string, params: Record<string, unknown>, fields: string[]): CrudReceipt {
  return R(wake, 'create', message, wake, KEY_SOURCE(), {
    recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, fields),
    items: [{ status: m('skill-calorie.workout-xunjiKey.c034'), reason: '', detail: message }],
  });
}

/** `calorie.workout.xunji-key-set` · 设训记 KEY（写配置文件，下次调用即生效）。 */
export function writeXunjiKeySet(params: Record<string, unknown>, _db: DatabaseSync): WriteOut {
  const value = readXunjiKey(params);
  const call = invokeXunji(['key', 'set', value], XUNJI_KEY_SET_WAKE);
  if (call.code !== 0) {
    const errText = call.stderr !== '' ? call.stderr : m('skill-calorie.workout-xunjiKey.c035');
    fail(xunjiExitToCmd(call.code), m('skill-calorie.workout-xunjiKey.c036', { p0: String(errText) }));
  }
  const message = m('skill-calorie.workout-xunjiKey.c037');
  const receipt = keyWriteReceipt(XUNJI_KEY_SET_WAKE, message, params, ['xunjiKey']);
  const redacted = { ...params, xunjiKey: '***', key: params['key'] === undefined ? undefined : '***' };
  const content = [
    renderKpiGrid([
      { label: m('skill-calorie.workout-xunjiKey.c038'), value: m('skill-calorie.workout-xunjiKey.c039'), detail: m('skill-calorie.workout-xunjiKey.c040') },
      { label: m('skill-calorie.workout-xunjiKey.c041'), value: m('skill-calorie.workout-xunjiKey.c042'), detail: m('skill-calorie.workout-xunjiKey.c043') },
      { label: m('skill-calorie.workout-xunjiKey.c044'), value: m('skill-calorie.workout-xunjiKey.c045'), detail: m('skill-calorie.workout-xunjiKey.c046') },
    ]),
    renderDataTable({
      columns: [{ key: 'step', label: m('skill-calorie.workout-xunjiKey.c047') }, { key: 'does', label: m('skill-calorie.workout-xunjiKey.c048') }],
      rows: [
        { step: m('skill-calorie.workout-xunjiKey.c049'), does: m('skill-calorie.workout-xunjiKey.c050', { p0: String(XUNJI_KEY_STATUS_CMD) }) },
        { step: m('skill-calorie.workout-xunjiKey.c051'), does: m('skill-calorie.workout-xunjiKey.c052') },
      ],
      caption: m('skill-calorie.workout-xunjiKey.c053'),
    }),
    copyBlock(XUNJI_KEY_SET_KEY, redacted, receipt, KEY_SOURCE()),
  ].join('');
  return {
    data: { ok: true, message, receipt },
    html: assembleDocPage({ docTitle: DOC_TITLE(), title: XUNJI_KEY_SET_WAKE, eyebrow: m('skill-calorie.workout-xunjiKey.c054'), subtitle: m('skill-calorie.workout-xunjiKey.c055'), content, pageUi: true }),
  };
}

/** `calorie.workout.xunji-key-clear` · 清训记 KEY（`confirm:true` 才清）。 */
export function writeXunjiKeyClear(params: Record<string, unknown>, _db: DatabaseSync): WriteOut {
  if (params['confirm'] !== true) {
    fail(2, m('skill-calorie.workout-xunjiKey.c056', { p0: String(XUNJI_KEY_CLEAR_KEY) }));
  }
  const call = invokeXunji(['key', 'clear'], XUNJI_KEY_CLEAR_WAKE);
  if (call.code !== 0) {
    const errText = call.stderr !== '' ? call.stderr : m('skill-calorie.workout-xunjiKey.c057');
    fail(xunjiExitToCmd(call.code), m('skill-calorie.workout-xunjiKey.c058', { p0: String(errText) }));
  }
  const message = m('skill-calorie.workout-xunjiKey.c059');
  const receipt = keyWriteReceipt(XUNJI_KEY_CLEAR_WAKE, message, params, ['confirm']);
  const content = [
    renderKpiGrid([
      { label: m('skill-calorie.workout-xunjiKey.c060'), value: m('skill-calorie.workout-xunjiKey.c061'), detail: m('skill-calorie.workout-xunjiKey.c062') },
      { label: m('skill-calorie.workout-xunjiKey.c063'), value: m('skill-calorie.workout-xunjiKey.c064'), detail: m('skill-calorie.workout-xunjiKey.c065') },
      { label: m('skill-calorie.workout-xunjiKey.c066'), value: m('skill-calorie.workout-xunjiKey.c067'), detail: m('skill-calorie.workout-xunjiKey.c068') },
    ]),
    renderDataTable({
      columns: [{ key: 'step', label: m('skill-calorie.workout-xunjiKey.c069') }, { key: 'does', label: m('skill-calorie.workout-xunjiKey.c070') }],
      rows: [
        { step: m('skill-calorie.workout-xunjiKey.c071'), does: XUNJI_KEY_STATUS_CMD },
        { step: m('skill-calorie.workout-xunjiKey.c072'), does: XUNJI_KEY_SET_CMD },
      ],
      caption: m('skill-calorie.workout-xunjiKey.c073'),
    }),
    copyBlock(XUNJI_KEY_CLEAR_KEY, params, receipt, KEY_SOURCE()),
  ].join('');
  return {
    data: { ok: true, message, receipt },
    html: assembleDocPage({ docTitle: DOC_TITLE(), title: XUNJI_KEY_CLEAR_WAKE, eyebrow: m('skill-calorie.workout-xunjiKey.c074'), subtitle: m('skill-calorie.workout-xunjiKey.c075'), content, pageUi: true }),
  };
}
