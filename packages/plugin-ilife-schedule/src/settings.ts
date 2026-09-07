/** dsh-ilife-schedule 设置页（P10 脚手架：设置页住单品包）。
 *
 * 一次 registerTab，两处呈现：边栏 + 号菜单多一项，DSH 设置页侧边卡片
 * 分区自动多一张小卡片（注册表驱动、无硬编码，开关缺省启用）。
 * 本文件只声明本单品自己的设置行；总管不声明设置（见 boundaries 断言）。
 */

export const SETTINGS_OWNER = 'dsh-ilife-schedule' as const;
export const SETTINGS_SLOT = 'ilife:schedule' as const;

export interface SettingRow {
  readonly key: string;
  readonly title: string;
  readonly control: 'switch' | 'text' | 'number';
}

/** 脚手架期唯一设置行：总开关（缺省启用，与官方关闭语义对齐）。 */
export const SETTING_ROWS: readonly SettingRow[] = [
  { key: 'enabled', title: '作息面板启用', control: 'switch' },
];
