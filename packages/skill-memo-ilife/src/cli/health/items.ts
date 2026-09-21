/** 配置体检 · **九条体检项**（票 #706 的检查表落地，票 #855 从这里分件出来）。
 *
 * 检查项与检查表 `docs/research/check-table-671-life-panel-20260917.html` 逐条对应：
 * 六家通用 5 条（配置文件本身／数据目录／库文件表数／产物目录／这个值从哪来）
 * ＋ 备忘特有 4 条（附件目录／飞书 CLI／包内模板＋公共组件／场景资产）。
 * 「附件」那一项的形状跟着 #712 走：附件从「字符串前缀」改成**真目录 ＋ 真包含判定**。
 *
 * 口径（票面「开工前的形状裁定」）：
 *   · **判据住技能侧**——每条的有效值（库在哪、产物落哪个目录、包内预置件在不在）只有本包算得出来；
 *     插件包与总管只透传与渲染，不重写这里的任何一个字。
 *   · **只报不改**——不建目录、不写文件、不落那份默认配置；因此**不许**调 `loadMemoConfig()`（文件不在即落默认件）。
 *   · 判据查的路径一律是**新仓的**：检查表里那些老仓文件名只作注释里的出处，不进用户看到的报文。
 *
 * 搬迁状态（#855）：九条今天同住本件；按域归位（`src/<域>/health.ts`）随各域目录建立时落，届时本件只留聚合。
 */
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { configPaths } from 'base-link-core';
import { MEMO_CONFIG_DEFAULTS, MEMO_CONFIG_STEM } from '../../config.js';
import { mediaDirOf } from '../../fetch/paths.js';
import { projectOnDefaults, readMemoConfigReadOnly, readValue, sourceOf, textOf } from './configRead.js';
import {
  DB_TABLE_THRESHOLD,
  dirVerdict,
  findLarkCli,
  larkTier,
  p,
  packageRoot,
  splitDirSegments,
  tableCount,
  templateFileCount,
} from './probe.js';

/** 报告里的三档判据（与面板侧镜像同值）。 */
export type HealthStatus = 'red' | 'yellow' | 'green';

export interface HealthItem {
  readonly id: string;
  readonly title: string;
  readonly status: HealthStatus;
  readonly message: string;
  readonly action: string;
  readonly source?: string;
}

export interface MemoHealthReport {
  readonly skill: string;
  readonly configPath: string;
  readonly dataDir: string;
  readonly items: readonly HealthItem[];
}

const SKILL = 'memo' as const;

/** 跑一次体检，返回整份报告。**只读**：任何一处都不落盘（只有写探针那一个文件，且当场删掉）。 */
export function buildMemoHealthReport(): MemoHealthReport {
  const paths = configPaths(MEMO_CONFIG_STEM);
  const items: HealthItem[] = [];
  const read = readMemoConfigReadOnly();
  const values = read.kind === 'ok' ? read.values : projectOnDefaults({});
  const present: ReadonlySet<string> = read.kind === 'ok' ? read.present : new Set<string>();

  // ① 配置文件本身：能不能解析；它落在默认位置还是别处（只陈述，不评价）。
  const defaultConfigFile = join(homedir(), '.ilife', MEMO_CONFIG_STEM + '.yaml');
  const relocated = paths.configFile !== defaultConfigFile;
  const where = relocated ? '位置与默认不同（见配置文件落点）' : '默认位置';
  if (read.kind === 'bad') {
    items.push({
      id: 'config.file', title: '配置文件', status: 'red',
      message: read.message,
      action: '照报文指的行号改回「键: 值」的写法；改不动就删掉这个文件，让技能按默认值重落一份。',
      source: '配置文件',
    });
  } else if (read.kind === 'missing') {
    items.push({
      id: 'config.file', title: '配置文件', status: 'yellow',
      message: '配置文件还不存在：' + p(paths.configFile) + '（现在跑的是默认值）。',
      action: '在面板上保存一次即会落一份；也可点「重置为默认」。',
      source: '默认值',
    });
  } else {
    items.push({
      id: 'config.file', title: '配置文件', status: 'green',
      message: '能解析：' + p(paths.configFile) + '（' + where + '）。',
      action: '',
      source: '配置文件',
    });
  }

  // ② 数据目录：在不在、能不能写。
  const dbDirConfigured = textOf(readValue(values, 'db', 'dir'));
  const dataDir = dbDirConfigured !== '' ? dbDirConfigured : paths.dataDir;
  const dataDirSource = sourceOf(present, 'db.dir');
  const dataDirVerdict = dirVerdict(dataDir);
  items.push({
    id: 'db.dir', title: '数据目录',
    status: !dataDirVerdict.exists || !dataDirVerdict.writable ? 'red' : 'green',
    message: !dataDirVerdict.exists
      ? '不在：' + p(dataDir) + (dataDirVerdict.reason !== '' ? '（' + dataDirVerdict.reason + '）' : '')
      : dataDirVerdict.writable
        ? '在且能写：' + p(dataDir) + '。'
        : '在，但写不进去：' + p(dataDir) + '（' + dataDirVerdict.reason + '）。',
    action: !dataDirVerdict.exists
      ? '先建这个目录，或把配置里的「数据目录」改到一个已存在的位置。'
      : dataDirVerdict.writable ? '' : '去掉这个目录的只读属性，或把「数据目录」改到别处。',
    source: dataDirSource,
  });

  // ③ 库文件：在不在 ＋ 表数够不够。
  const dbNameConfigured = textOf(readValue(values, 'db', 'name'));
  const dbName = dbNameConfigured !== '' ? dbNameConfigured : String(MEMO_CONFIG_DEFAULTS.db.name);
  const dbFile = join(dataDir, dbName);
  const dbSource = sourceOf(present, 'db.name');
  if (!existsSync(dbFile)) {
    items.push({
      id: 'db.file', title: '库文件', status: 'red',
      message: '不在：' + p(dbFile) + '。',
      action: '确认「数据目录」与「库文件名」对不对（库文件名只读，要改请编辑配置文件）；本技能直连老库、**不建空库**，所以要由老技能或初始化建出它。',
      source: dbSource,
    });
  } else {
    const tables = tableCount(dbFile);
    if (!tables.ok) {
      items.push({
        id: 'db.file', title: '库文件', status: 'red',
        message: '在，但打不开：' + p(dbFile) + '（' + tables.reason + '）。',
        action: '这个文件可能不是库文件或已损坏；先备份，再看要不要让技能重建一份。',
        source: dbSource,
      });
    } else if (tables.count < DB_TABLE_THRESHOLD) {
      items.push({
        id: 'db.file', title: '库文件', status: 'yellow',
        message: '在，但表不全：' + p(dbFile) + '（' + String(tables.count) + ' / ' + String(DB_TABLE_THRESHOLD) + ' 张表）。',
        action: '缺表会让对应的功能报错；跑一次会写库的命令让它补齐，或从备份恢复。',
        source: dbSource,
      });
    } else {
      items.push({
        id: 'db.file', title: '库文件', status: 'green',
        message: '在，' + String(tables.count) + ' 张表齐：' + p(dbFile) + '。',
        action: '',
        source: dbSource,
      });
    }
  }

  // ④ 产物目录：在不在、能不能写（还没建＝绿：交付页面时才落这里，那时自动建）。
  const htmlDirValue = textOf(readValue(values, 'html', 'dir'));
  const htmlDir = join(dataDir, ...splitDirSegments(htmlDirValue !== '' ? htmlDirValue : String(MEMO_CONFIG_DEFAULTS.html.dir)));
  const htmlVerdict = dirVerdict(htmlDir);
  const htmlSource = sourceOf(present, 'html.dir');
  items.push({
    id: 'html.dir', title: '产物目录',
    status: !htmlVerdict.exists ? 'green' : htmlVerdict.writable ? 'green' : 'yellow',
    message: !htmlVerdict.exists
      ? '还没建：' + p(htmlDir) + '（交付页面时才落这里，那时自动建）。'
      : htmlVerdict.writable
        ? '在且能写：' + p(htmlDir) + '。'
        : '在，但写不进去：' + p(htmlDir) + '（交付会转成内联回执，不再落盘）。',
    action: !htmlVerdict.exists || htmlVerdict.writable ? '' : '去掉这个目录的只读属性，或改配置文件里的 html.dir（该项只读，面板上不给改）。',
    source: htmlSource,
  });

  // ⑤ 这个值从哪来：只陈述数据目录与库文件名的来源，不判好坏（六家通用最后一条）。
  items.push({
    id: 'value.source', title: '这个值从哪来', status: 'green',
    message: '数据目录走「' + dataDirSource + '」，库文件名走「' + dbSource + '」'
      + (read.kind === 'missing' ? '（配置文件还不存在，落点全按默认值）。' : '。'),
    action: '', source: dataDirSource,
  });

  // ⑥ 附件目录（备忘特有，#712 起的形状；#760 起默认＝`<数据目录>/media`）：没配≠未配——
  // 空串即默认落点，判那个目录在不在；配了但目录不在＝黄；在且能写＝绿。显式相对值按进程工作目录解
  // （与 `resolveMediaDir()` 同一算式 `mediaDirOf`，本件只调纯函数，不触发配置落盘）。
  const mediaConfigured = textOf(readValue(values, 'media', 'dir'));
  const mediaDir = mediaDirOf(dataDir, mediaConfigured);
  const mediaVerdict = dirVerdict(mediaDir);
  const mediaMissing = mediaConfigured === '' ? '默认落点目录不在：' : '配了但目录不在：';
  items.push({
    id: 'media.dir', title: '附件目录',
    status: mediaVerdict.exists && mediaVerdict.writable ? 'green' : 'yellow',
    message: !mediaVerdict.exists
      ? mediaMissing + p(mediaDir) + '。'
      : mediaVerdict.writable
        ? '在且能写：' + p(mediaDir) + '。'
        : '在，但写不进去：' + p(mediaDir) + '（' + mediaVerdict.reason + '）。',
    action: mediaVerdict.exists && mediaVerdict.writable ? '' : '建出这个目录（或去掉只读），或把「附件目录」改到别处。',
    source: sourceOf(present, 'media.dir'),
  });

  // ⑦ 飞书 CLI（备忘特有）：三档——找不到＝黄；找得到但没登录／没授权＝黄；登录且 task 域可写＝绿。
  // #760 起 `lark:` 整组出配置表：来源固定按默认值，指引改指复制安装指引（授权三支已退役）。
  const larkCli = findLarkCli('');
  const tier = larkTier(larkCli);
  const larkWhere = larkCli === null ? '' : p(larkCli);
  items.push({
    id: 'lark.cli', title: '飞书 CLI',
    status: tier === 'full' ? 'green' : 'yellow',
    message: tier === 'missing'
      ? '找不到 lark-cli：飞书同步用不了（其余功能不受影响）。'
      : tier === 'partial'
        ? '找得到 lark-cli，但还没登录或没拿到 task 域授权：飞书同步用不了。'
        : '已登录且 task 域可写：' + larkWhere + '。',
    action: tier === 'missing'
      ? '要用飞书同步就装它：npm install -g @larksuite/cli（官方包是 @larksuite/cli，bin 名恰为 lark-cli；npm 上的 lark-cli 是僵尸包，别装）。飞书CLI官网为：https://www.feishu.cn/feishu-cli。完整安装指引（含复制给 AI 的 prompt）见 memo.config.read 回执的 lark.prompt，面板「飞书 CLI」状态行有同一个复制按钮。'
      : tier === 'partial' ? '补授权：照 memo.config.read 回执 lark.prompt 里那段做（登录后要能过 lark-cli auth check --scope task）。' : '',
    source: '默认值',
  });

  // ⑧ 包内模板目录（备忘特有）：整页交付模板是包内固定件，缺了页面就渲染不出来 ⇒ 红。报文给件数。
  const templatesDir = join(packageRoot(), 'templates');
  const templatesOk = existsSync(templatesDir);
  const templateCount = templatesOk ? templateFileCount(templatesDir) : 0;
  items.push({
    id: 'templates.dir', title: '包内模板目录',
    status: templatesOk ? 'green' : 'red',
    message: templatesOk
      ? '在，' + String(templateCount) + ' 件模板：' + p(templatesDir) + '。'
      : '不在：' + p(templatesDir) + '。',
    action: templatesOk ? '' : '技能包装得不完整：重装这个技能包，或跑一次它的构建。',
  });

  // ⑨ 场景资产（备忘特有）：查的是**新仓这份事实源**＝`src/help/sceneData.ts`（8 个域数据件
  // `src/help/scenes/*.ts` 的组装件，生成器 `scripts/gen-help-assets.mjs` 读它；老仓那个
  // `references/scenarios.yaml` 只作注释里的出处，不出现报文里——新仓没有 `references/` 这个目录）。
  // 不在＝红：缺的是 HELP 与场景面的事实源，重装包即补齐（档位＝检查表原话「不在＝红」）。
  const scenariosFile = join(packageRoot(), 'src', 'help', 'sceneData.ts');
  const scenariosExists = existsSync(scenariosFile);
  items.push({
    id: 'scenarios.file', title: '场景资产',
    status: scenariosExists ? 'green' : 'red',
    message: scenariosExists
      ? '在：' + p(scenariosFile) + '（新仓的场景资产事实源住这里）。'
      : '不在：' + p(scenariosFile) + '（新仓的场景资产事实源；缺了 HELP 与场景面取不到）。',
    action: scenariosExists ? '' : '技能包装得不完整：重装这个技能包即会补齐。',
  });

  return { skill: SKILL, configPath: p(paths.configFile), dataDir: p(dataDir), items };
}
