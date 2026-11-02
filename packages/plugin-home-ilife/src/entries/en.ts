/** plugin-home-ilife · 词条表（英文列：与 `zh.ts` 同 key）。
 *
 *  空串＝未录（#1306：缺词条门判红），迁移票内必须补齐。
 *  key 集合的权威是 `zh.ts`；拼错 key 编译期红（`PluginHomeIlifeMessageId` 从 zh 派生，见 `index.ts`）。
 */
import type { MessageTable } from 'base-entries';

export const en = {
  /* ── packages/plugin-home-ilife/src/index.ts（#1229 迁入） ── */
  'plugin-home-ilife.index.c001': "Payload must be {values: object}",
  'plugin-home-ilife.index.c002': "Unknown endpoint: {p0}",
  'plugin-home-ilife.index.c003': "[dsh-home-ilife] connection.fetch is missing: the settings page config endpoint is not registered",
  /* ── packages/plugin-home-ilife/src/skill-tool.ts（#1229 迁入） ── */
  'plugin-home-ilife.skill-tool.c001': "Command (a home.* key), e.g. home.help.lookup",
  'plugin-home-ilife.skill-tool.c002': "Optional params object, passed through to the skill exit (--params JSON)",
  'plugin-home-ilife.skill-tool.c003': "The only exit for running the home skill (argv+JSON+exit); returns envelope JSON. The only way to write or read home data; no shell, no PATH. Example keys: home.help.lookup (Home Keeper HELP), home.item.search (search items). If a file path is included this time, hand the file to the user and quote its path; if not, answer in text only and never invent a file.",
  /* ── packages/plugin-home-ilife/src/settings.ts（#1229 迁入） ── */
  'plugin-home-ilife.settings.c001': "Data directory",
  'plugin-home-ilife.settings.c002': "Root directory for the library file and outputs. Empty = use the default directory.",
  'plugin-home-ilife.settings.c003': "Library file name",
  'plugin-home-ilife.settings.c004': "The library file under the data directory.",
  'plugin-home-ilife.settings.c005': "HTML output directory",
  'plugin-home-ilife.settings.c006': "Directory for delivered pages. `.` or empty = outputs go to the library root.",
  'plugin-home-ilife.settings.c007': "Backup directory",
  'plugin-home-ilife.settings.c008': "Directory read and written for backup and restore.",
  'plugin-home-ilife.settings.c009': "Master key file",
  'plugin-home-ilife.settings.c010': "Location of the master key file.",
  /* ── packages/plugin-home-ilife/src/index.ts（#1229 迁入·协议报文） ── */
  'plugin-home-ilife.index.c004': "body is not JSON",
  'plugin-home-ilife.index.c005': "Invalid home request.",
  /* ══ #1231 共享词条：由 tooling/gen-shared-copy.mjs 自 tooling/shared-copy.json 生成，勿手改 ══ */
  'plugin-home-ilife.slot.c001': "Home Keeper",
  'plugin-home-ilife.settings.c011': "Advanced",
  'plugin-home-ilife.bridge.c001': "Manager is missing; install it: dsh plugin add dsh-life-pack dsh-home-ilife (never uninstall the manager alone)",
  /* ══ #1231 共享词条生成段结束 ══ */
} as const satisfies MessageTable;
