/** plugin-chef · 词条表（英文列：与 `zh.ts` 同 key）。
 *
 *  空串＝未录（#1306：缺词条门判红），迁移票内必须补齐。
 *  key 集合的权威是 `zh.ts`；拼错 key 编译期红（`PluginChefMessageId` 从 zh 派生，见 `index.ts`）。
 */
import type { MessageTable } from 'base-entries';

export const en = {
  /* ── packages/plugin-chef/src/index.ts（#1229 迁入） ── */
  'plugin-chef.index.c001': "Payload must be {values: object}",
  'plugin-chef.index.c002': "Unknown endpoint: {p0}",
  'plugin-chef.index.c003': "[dsh-chef] connection.fetch is missing: the settings page config endpoint is not registered",
  /* ── packages/plugin-chef/src/skill-tool.ts（#1229 迁入） ── */
  'plugin-chef.skill-tool.c001': "Command (a chef.* key), e.g. chef.help.lookup",
  'plugin-chef.skill-tool.c002': "Optional params object, passed through to the skill exit (--params JSON)",
  'plugin-chef.skill-tool.c003': "The only exit for running the chef skill (argv+JSON+exit); returns envelope JSON. The only way to write or read chef data; no shell, no PATH. Example keys: chef.help.lookup (Private Chef HELP), chef.recipe.view (view a recipe). If a file path is included this time, hand the file to the user and quote its path; if not, answer in text only and never invent a file.",
  /* ── packages/plugin-chef/src/bridge.ts（#1229 迁入） ── */
  'plugin-chef.bridge.c001': "Manager is missing; install it: dsh plugin add dsh-life-pack dsh-chef (never uninstall the manager alone)",
  /* ── packages/plugin-chef/src/settings.ts（#1229 迁入） ── */
  'plugin-chef.settings.c001': "Data directory",
  'plugin-chef.settings.c002': "Root directory for the library file and outputs. Empty = use the default directory.",
  'plugin-chef.settings.c003': "Library file name",
  'plugin-chef.settings.c004': "The library file under the data directory.",
  'plugin-chef.settings.c005': "HELP output directory",
  'plugin-chef.settings.c006': "Directory for HELP files and quick-reference sheets.",
  'plugin-chef.settings.c007': "Scene output directory",
  'plugin-chef.settings.c008': "Directory for scene pages.",
  'plugin-chef.settings.c009': "Advanced",
  /* ── packages/plugin-chef/src/slot.ts（#1229 迁入） ── */
  'plugin-chef.slot.c001': "Private Chef",
  /* ── packages/plugin-chef/src/index.ts（#1229 迁入·协议报文） ── */
  'plugin-chef.index.c004': "body is not JSON",
  'plugin-chef.index.c005': "Invalid chef request.",
} as const satisfies MessageTable;
