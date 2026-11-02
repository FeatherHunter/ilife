/** plugin-bill-ilife · 词条表（英文列：与 `zh.ts` 同 key）。
 *
 *  空串＝未录（#1306：缺词条门判红），迁移票内必须补齐。
 *  key 集合的权威是 `zh.ts`；拼错 key 编译期红（`PluginBillIlifeMessageId` 从 zh 派生，见 `index.ts`）。
 */
import type { MessageTable } from 'base-entries';

export const en = {
  /* ── packages/plugin-bill-ilife/src/index.ts（#1229 迁入） ── */
  'plugin-bill-ilife.index.c001': "Payload must be {key: string, params: object}",
  'plugin-bill-ilife.index.c002': "Payload must be {values: object}",
  'plugin-bill-ilife.index.c003': "Unknown endpoint: {p0}",
  'plugin-bill-ilife.index.c004': "[dsh-bill-ilife] connection.fetch is missing: the settings page config endpoint is not registered",
  /* ── packages/plugin-bill-ilife/src/skill-tool.ts（#1229 迁入） ── */
  'plugin-bill-ilife.skill-tool.c001': "Command (a bill.* key), e.g. bill.help.lookup",
  'plugin-bill-ilife.skill-tool.c002': "Optional params object, passed through to the skill exit (--params JSON)",
  'plugin-bill-ilife.skill-tool.c003': "The only exit for running the bill skill (argv+JSON+exit); returns envelope JSON. The only way to write or read bill data; no shell, no PATH. Example keys: bill.help.lookup (Cookie Accounting HELP), bill.record.add (record an entry). If a file path is included this time, hand the file to the user and quote its path; if not, answer in text only and never invent a file.",
  /* ── packages/plugin-bill-ilife/src/settings.ts（#1229 迁入） ── */
  'plugin-bill-ilife.settings.c001': "Data directory",
  'plugin-bill-ilife.settings.c002': "Root directory for the library file and backups. Empty = use the default directory.",
  'plugin-bill-ilife.settings.c003': "Library file name",
  'plugin-bill-ilife.settings.c004': "The library file under the data directory.",
  'plugin-bill-ilife.settings.c005': "Budget/account file name",
  'plugin-bill-ilife.settings.c006': "Budget and account files in the same directory as the library.",
  'plugin-bill-ilife.settings.c007': "HELP output directory name",
  'plugin-bill-ilife.settings.c008': "Directory for HELP files and quick-reference sheets.",
  'plugin-bill-ilife.settings.c009': "Backup directory",
  'plugin-bill-ilife.settings.c010': "Directory read and written for backup and restore.",
  'plugin-bill-ilife.settings.c011': "Backup file name prefix",
  'plugin-bill-ilife.settings.c012': "Prefix for backup file names; a timestamp is appended automatically.",
  /* ── packages/plugin-bill-ilife/src/index.ts（#1229 迁入·协议报文） ── */
  'plugin-bill-ilife.index.c005': "body is not JSON",
  'plugin-bill-ilife.index.c006': "Invalid bill request.",
  /* ══ #1231 共享词条：由 tooling/gen-shared-copy.mjs 自 tooling/shared-copy.json 生成，勿手改 ══ */
  'plugin-bill-ilife.slot.c001': "Cookie Accounting",
  'plugin-bill-ilife.settings.c013': "Advanced",
  'plugin-bill-ilife.bridge.c001': "Manager is missing; install it: dsh plugin add dsh-life-pack dsh-bill-ilife (never uninstall the manager alone)",
  /* ══ #1231 共享词条生成段结束 ══ */
} as const satisfies MessageTable;
