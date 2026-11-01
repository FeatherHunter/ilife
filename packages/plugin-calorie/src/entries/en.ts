/** plugin-calorie · 词条表（英文列：与 `zh.ts` 同 key）。
 *
 *  空串＝未录（#1306：缺词条门判红），迁移票内必须补齐。
 *  key 集合的权威是 `zh.ts`；拼错 key 编译期红（`PluginCalorieMessageId` 从 zh 派生，见 `index.ts`）。
 */
import type { MessageTable } from 'base-entries';

export const en = {
  /* ── packages/plugin-calorie/src/client.ts（#1229 迁入） ── */
  'plugin-calorie.client.c001': "{p0} · skill {p1}",
  'plugin-calorie.client.c002': "Host connection missing: connection.rpc.call is unavailable",
  'plugin-calorie.client.c003': "Malformed receipt envelope (not an ok envelope)",
  'plugin-calorie.client.c004': "Fetch timed out (20s): no reply from the host; check the host logs and DB environment first",
  'plugin-calorie.client.c005': "Fetch failed: {p0}",
  'plugin-calorie.client.c006': "Skill exit missing (missing-cli): {p0}",
  'plugin-calorie.client.c007': "Fetch failed ({p0}): {p1}",
  'plugin-calorie.client.c008': "Fetch returned nothing (do not fake a normal state)",
  'plugin-calorie.client.c009': "Fetch failed: {p0}",
  'plugin-calorie.client.c010': "Calories loading",
  'plugin-calorie.client.c011': "Calories · {p0}",
  'plugin-calorie.client.c012': "Calories",
  /* ── packages/plugin-calorie/src/index.ts（#1229 迁入） ── */
  'plugin-calorie.index.c001': "Payload must be {key: string, params: object}",
  'plugin-calorie.index.c002': "Payload must be {values: object}",
  'plugin-calorie.index.c003': "Unknown endpoint: {p0}",
  /* ── packages/plugin-calorie/src/skill-tool.ts（#1229 迁入） ── */
  'plugin-calorie.skill-tool.c001': "Command (a calorie.* key), e.g. calorie.help.center",
  'plugin-calorie.skill-tool.c002': "Optional params object, passed through to the skill exit (--params JSON)",
  'plugin-calorie.skill-tool.c003': "The only exit for running the calorie skill (argv+JSON+exit); returns envelope JSON. The only way to write or read calorie data; no shell, no PATH. Example keys: calorie.help.center (Calories HELP), calorie.view.home (view today's home page), calorie.diet.add (log a meal). If a file path is included this time, hand the file to the user and quote its path; if not, answer in text only and never invent a file.",
  /* ── packages/plugin-calorie/src/bridge.ts（#1229 迁入） ── */
  'plugin-calorie.bridge.c001': "Manager is missing; install it: dsh plugin add dsh-life-pack dsh-calorie (never uninstall the manager alone)",
  /* ── packages/plugin-calorie/src/settings.ts（#1229 迁入） ── */
  'plugin-calorie.settings.c001': "Data directory",
  'plugin-calorie.settings.c002': "Root directory for the library file and all outputs. Empty = use the default directory.",
  'plugin-calorie.settings.c003': "Library file name",
  'plugin-calorie.settings.c004': "The database file under the data directory.",
  'plugin-calorie.settings.c005': "HTML output directory name",
  'plugin-calorie.settings.c006': "Subdirectory under the data directory for delivered pages.",
  'plugin-calorie.settings.c007': "Photo directory",
  'plugin-calorie.settings.c008': "Directory for body photos. Empty = use the default directory (photos under the data directory).",
  'plugin-calorie.settings.c009': "Xunji KEY",
  'plugin-calorie.settings.c010': "Credentials for Xunji. Empty = not configured; pushes and write-backs will be blocked.",
  'plugin-calorie.settings.c011': "Photo GIF subdirectory",
  'plugin-calorie.settings.c012': "Subdirectory under the photo directory for GIFs.",
  'plugin-calorie.settings.c013': "Xunji state file directory",
  'plugin-calorie.settings.c014': "Directory for Xunji rate-limit and sync cursor files.",
  'plugin-calorie.settings.c015': "Xunji exercise library path",
  'plugin-calorie.settings.c016': "Exercise library used to match exercise names.",
  'plugin-calorie.settings.c017': "Default write-back days",
  'plugin-calorie.settings.c018': "Default number of days to look back when pulling actuals from Xunji.",
  'plugin-calorie.settings.c019': "Xunji call timeout (seconds)",
  'plugin-calorie.settings.c020': "Timeout in seconds for Xunji calls.",
  'plugin-calorie.settings.c021': "Grounding call timeout (seconds)",
  'plugin-calorie.settings.c022': "Timeout in seconds for each grounding-training step.",
  'plugin-calorie.settings.c023': "Advanced",
  /* ── packages/plugin-calorie/src/slot.ts（#1229 迁入） ── */
  'plugin-calorie.slot.c001': "Calories",
  /* ── packages/plugin-calorie/src/index.ts（#1229 迁入·协议报文） ── */
  'plugin-calorie.index.c004': "body is not JSON",
  'plugin-calorie.index.c005': "Invalid calorie request.",
  /* ── packages/plugin-calorie/src/client.ts（#1229 迁入·超时提示） ── */
  'plugin-calorie.client.c013': "Fetch timed out ({p0}s): no reply from the host; check the host logs and DB environment first",
} as const satisfies MessageTable;
