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

export const XUNJI_KEY_STATUS_KEY = 'calorie.view.xunji-key';
export const XUNJI_KEY_SET_KEY = 'calorie.workout.xunji-key-set';
export const XUNJI_KEY_CLEAR_KEY = 'calorie.workout.xunji-key-clear';
const XUNJI_KEY_STATUS_WAKE = '查训记KEY状态';
const XUNJI_KEY_SET_WAKE = '设训记KEY';
const XUNJI_KEY_CLEAR_WAKE = '清训记KEY';
const DOC_TITLE = '卡路里·健身计划回执';
const KEY_SOURCE = '配置文件里的 xunji.key（卡路里设置页同源）';

/** 下一步文案里的两条可复制命令（全仓只此一处，缺 KEY 的四处报错都引它）。 */
export const XUNJI_KEY_STATUS_CMD = 'calorie-cmd-read ' + XUNJI_KEY_STATUS_KEY;
export const XUNJI_KEY_SET_CMD = 'calorie-cmd-read ' + XUNJI_KEY_SET_KEY + ' --params \'{"xunjiKey":"<KEY值>"}\'';

/** 缺 KEY 错误的后半句（前半句保留「本地缺 KEY（没调远端）」老子串，旧测试不断）。 */
export function xunjiKeyNext(): string {
  return '先跑 ' + XUNJI_KEY_STATUS_CMD + ' 查状态，再跑 ' + XUNJI_KEY_SET_CMD + ' 写入后重试';
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
    ? { k: '训记 KEY', v: '已配（预演不验有效性，实跑以远端为准；401／403 即 KEY 不对，回来重设）' }
    : {
      k: '训记 KEY',
      v: '未配（实跑要调训记的步骤会停在缺 KEY：有段的推送、以及每天的回写——即使当天 0 段也要回写）：'
        + xunjiKeyNext(),
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
      { label: '状态', value: configured ? '已配' : '未配', detail: '只查配了没有，值不在这里显示' },
      { label: '预览', value: preview ?? '—', detail: configured ? '前 4 字＋…＋末 2 字' : '没配就没有预览' },
      { label: '落点', value: 'xunji.key', detail: KEY_SOURCE },
    ]),
    renderDataTable({
      columns: [{ key: 'step', label: '下一步' }, { key: 'does', label: '做什么' }],
      rows: configured
        ? [
          { step: '验有效', does: '跑一次带 dryRun 的同步（如同步到训记 dryRun），远端 401／403 即 KEY 不对' },
          { step: '换 KEY', does: '跑 设训记KEY：' + XUNJI_KEY_SET_CMD },
          { step: '不用训记', does: '跑 清训记KEY：calorie-cmd-read ' + XUNJI_KEY_CLEAR_KEY + ' --params \'{"confirm":true}\'' },
        ]
        : [
          { step: '写入', does: '找训记 App 里的 KEY，跑 设训记KEY：' + XUNJI_KEY_SET_CMD },
          { step: '重验', does: '写完再跑一次 查训记KEY状态（本命令），状态应变已配' },
          { step: '再落地', does: '接着跑落地训练（建议先 dryRun 预演）' },
        ],
      caption: '下一步',
    }),
  ].join('');
  const html = assembleDocPage({
    docTitle: DOC_TITLE,
    title: XUNJI_KEY_STATUS_WAKE,
    eyebrow: '健身计划',
    subtitle: configured ? '已配' : '未配（按页上下一步写入）',
    content,
    pageUi: true,
  });
  return { data, html };
}

/** `xunjiKey` 参数：兼容旧话术里 `key` 那一位（报错提示仍只教 `xunjiKey`）。 */
function readXunjiKey(params: Record<string, unknown>): string {
  const v = params['xunjiKey'] ?? params['key'];
  if (typeof v !== 'string' || v.trim() === '') {
    fail(2, '设训记 KEY 要给 xunjiKey（用法：' + XUNJI_KEY_SET_CMD + '；KEY 值不回显、不进仓）');
  }
  const trimmed = (v as string).trim();
  if (trimmed.length > 1024) fail(2, 'KEY 过长（> 1024 字符），疑似输入错误');
  return trimmed;
}

function keyWriteReceipt(wake: string, message: string, params: Record<string, unknown>, fields: string[]): CrudReceipt {
  return R(wake, 'create', message, wake, KEY_SOURCE, {
    recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, fields),
    items: [{ status: '成功', reason: '', detail: message }],
  });
}

/** `calorie.workout.xunji-key-set` · 设训记 KEY（写配置文件，下次调用即生效）。 */
export function writeXunjiKeySet(params: Record<string, unknown>, _db: DatabaseSync): WriteOut {
  const value = readXunjiKey(params);
  const call = invokeXunji(['key', 'set', value], XUNJI_KEY_SET_WAKE);
  if (call.code !== 0) {
    fail(xunjiExitToCmd(call.code), '设训记 KEY 失败：' + (call.stderr !== '' ? call.stderr : '写配置文件没达成'));
  }
  const message = '训记 KEY 已写入（' + 'xunji.key' + '）：下次调用即生效（值不回显）';
  const receipt = keyWriteReceipt(XUNJI_KEY_SET_WAKE, message, params, ['xunjiKey']);
  const redacted = { ...params, xunjiKey: '***', key: params['key'] === undefined ? undefined : '***' };
  const content = [
    renderKpiGrid([
      { label: '结果', value: '已写入', detail: '落点 xunji.key' },
      { label: '生效', value: '下次调用', detail: '含子进程，不用重启' },
      { label: '回显', value: '不显示值', detail: '本页任何位置都没有 KEY 全串' },
    ]),
    renderDataTable({
      columns: [{ key: 'step', label: '下一步' }, { key: 'does', label: '做什么' }],
      rows: [
        { step: '验状态', does: '跑 查训记KEY状态：' + XUNJI_KEY_STATUS_CMD },
        { step: '先预演', does: 'calorie-cmd-read calorie.workout.xunji-push --params \'{"date":"今日","dryRun":true}\'' },
      ],
      caption: '下一步',
    }),
    copyBlock(XUNJI_KEY_SET_KEY, redacted, receipt, KEY_SOURCE),
  ].join('');
  return {
    data: { ok: true, message, receipt },
    html: assembleDocPage({ docTitle: DOC_TITLE, title: XUNJI_KEY_SET_WAKE, eyebrow: '健身计划', subtitle: '结果页', content, pageUi: true }),
  };
}

/** `calorie.workout.xunji-key-clear` · 清训记 KEY（`confirm:true` 才清）。 */
export function writeXunjiKeyClear(params: Record<string, unknown>, _db: DatabaseSync): WriteOut {
  if (params['confirm'] !== true) {
    fail(2, '清训记 KEY 要给 confirm:true（用法：calorie-cmd-read ' + XUNJI_KEY_CLEAR_KEY + ' --params \'{"confirm":true}\'）');
  }
  const call = invokeXunji(['key', 'clear'], XUNJI_KEY_CLEAR_WAKE);
  if (call.code !== 0) {
    fail(xunjiExitToCmd(call.code), '清训记 KEY 失败：' + (call.stderr !== '' ? call.stderr : '写配置文件没达成'));
  }
  const message = '训记 KEY 已清除：落地链的推送／回写会停在缺 KEY，需要时重设';
  const receipt = keyWriteReceipt(XUNJI_KEY_CLEAR_WAKE, message, params, ['confirm']);
  const content = [
    renderKpiGrid([
      { label: '结果', value: '已清除', detail: '落点 xunji.key 已写空' },
      { label: '影响', value: '推送回写会停', detail: '缺 KEY 即 exit 3，不调远端' },
      { label: '重设', value: '随时可设', detail: '按本页下一步重设' },
    ]),
    renderDataTable({
      columns: [{ key: 'step', label: '下一步' }, { key: 'does', label: '做什么' }],
      rows: [
        { step: '验状态', does: XUNJI_KEY_STATUS_CMD },
        { step: '重设', does: XUNJI_KEY_SET_CMD },
      ],
      caption: '下一步',
    }),
    copyBlock(XUNJI_KEY_CLEAR_KEY, params, receipt, KEY_SOURCE),
  ].join('');
  return {
    data: { ok: true, message, receipt },
    html: assembleDocPage({ docTitle: DOC_TITLE, title: XUNJI_KEY_CLEAR_WAKE, eyebrow: '健身计划', subtitle: '结果页', content, pageUi: true }),
  };
}
