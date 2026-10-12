/** 开始使用域·当前配置读写（`bill.setup.run` 的 `config-read`／`config-write` 两支的取值与落盘）。
 *
 * 谁在用（两个调用点，指名）：`./run.js` 的 `runConfigRead`／`runConfigWrite`。
 * 本件只做三件事：读那份 YAML（经 `../config.js` 的门，不自己解析）、写那份 YAML（经同一道门）、
 * 把当刻值摆成上屏行。页面块序不住这里（住 `./template-config.js`），场景差异不住这里（住 `scene-config-*.js`）。
 *
 * 路径口径（用户 2026-10-13 裁定，票 #1276 条目 24）：**上屏就是真路径，不脱敏**——
 * 「路径不能脱敏，用户需要看到，不然给一个脱敏的路径，用户都找不到文件」。
 * （`2a3a255b` 曾在 `./configOps.js` 里把家目录前缀换成 `~`；那一版已删，见本件 git 历史。）
 */
import { BILL_CONFIG_DEFAULTS } from '../config.js';
import { loadBillConfig, saveBillConfig } from '../config.js';
import { resolvedBillPaths } from '../fetch/paths.js';
import type { ConfigRecord } from 'base-link-core';

/** 当前配置的上屏行：设置页那 6 键的当刻值 ＋ 解析后的落点（真路径）。 */
export interface ConfigView {
  readonly configPath: string;
  readonly dataDir: string;
  readonly rows: readonly { readonly key: string; readonly label: string; readonly value: string }[];
  readonly resolved: readonly { readonly label: string; readonly value: string }[];
}

/** 读一份上屏视图（只读，不落盘；文件不在即按默认值读，`created` 进载荷不进页）。 */
export function readConfigView(): ConfigView {
  const c = loadBillConfig();
  const v = c.values;
  const paths = resolvedBillPaths();
  const rows = [
    { key: 'db.dir', label: '数据目录', value: v.db.dir === '' ? c.dataDir : v.db.dir },
    { key: 'db.name', label: '库文件名', value: v.db.name === '' ? BILL_CONFIG_DEFAULTS.db.name : v.db.name },
    { key: 'db.goals', label: '目标文件名', value: v.db.goals === '' ? BILL_CONFIG_DEFAULTS.db.goals : v.db.goals },
    { key: 'backup.dir', label: '备份目录', value: v.backup.dir === '' ? paths.backupDir : v.backup.dir },
    { key: 'backup.stem', label: '备份名前缀', value: v.backup.stem === '' ? BILL_CONFIG_DEFAULTS.backup.stem : v.backup.stem },
    { key: 'html.dir', label: '产物目录名', value: v.html.dir === '' ? BILL_CONFIG_DEFAULTS.html.dir : v.html.dir },
  ];
  const resolved = [
    { label: '库文件', value: paths.dbFile },
    { label: '产物目录', value: paths.htmlDir },
    { label: '备份目录', value: paths.backupDir },
  ];
  return { configPath: c.path, dataDir: c.dataDir, rows, resolved };
}

/** 写参→`ConfigRecord`（只收本场景露出的四格；空串＝没给，不覆盖现值）。 */
export function configValuesFrom(params: Record<string, unknown>): ConfigRecord {
  const out: Record<string, Record<string, unknown>> = {};
  const put = (group: string, key: string, v: unknown): void => {
    if (typeof v !== 'string' || v.trim() === '') return;
    const g = out[group] ?? {};
    g[key] = v.trim();
    out[group] = g;
  };
  put('db', 'dir', params.db_dir ?? params.dbDir ?? params.dir);
  put('db', 'name', params.db_name ?? params.dbName);
  put('backup', 'dir', params.backup_dir ?? params.backupDir);
  put('html', 'dir', params.html_dir ?? params.htmlDir);
  return out as unknown as ConfigRecord;
}

/** 有没有给至少一项（全空＝预览页，不落盘）。 */
export function hasConfigValues(params: Record<string, unknown>): boolean {
  return Object.keys(configValuesFrom(params)).length > 0;
}

/** 局部合并写（与 `src/cli/config.js` 的 `mergeValues` 同义：给的组按键覆盖，组里没给的子项保留现值）。
 *  本件不 import 那一处（那件是 CLI 私有），复述一次（取值语义逐字同：对象组浅合并，非组直盖）。 */
function mergeValues(current: ConfigRecord, incoming: ConfigRecord): ConfigRecord {
  const out: ConfigRecord = {};
  for (const [key, value] of Object.entries(current)) out[key] = value;
  for (const [key, value] of Object.entries(incoming)) {
    const group = typeof value === 'object' && value !== null && !Array.isArray(value);
    const base = out[key];
    if (!group) {
      out[key] = value as ConfigRecord[string];
      continue;
    }
    const merged: Record<string, unknown> = { ...(typeof base === 'object' && base !== null ? (base as Record<string, unknown>) : {}) };
    for (const [child, inner] of Object.entries(value as Record<string, unknown>)) merged[child] = inner;
    out[key] = merged as ConfigRecord[string];
  }
  return out;
}

/** 写一份（先合并再落盘；返回落盘路径与合并后的全量值）。 */
export function writeConfigValues(params: Record<string, unknown>): { path: string; values: ConfigRecord } {
  const current = loadBillConfig().values as unknown as ConfigRecord;
  const merged = mergeValues(current, configValuesFrom(params));
  const r = saveBillConfig(merged);
  return { path: r.path, values: merged };
}
