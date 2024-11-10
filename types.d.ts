/** 需要计算的浏览器类型 */
export type ComputeBrowserType = 'chrome' | 'firefox' | 'safari'

/** 浏览器支持情况 */
export type BrowserSupport = {
  /** 首次支持的版本 */
  add_version: string | boolean
  /** 首次支持的时间 */
  add_date?: string
  /** 版本占比 */
  usage_perc_y?: number
}

/** 属性或值统计数据 */ 
export interface IAttributeValueStatistics {
  /** 属性名 */ 
  name: string;
  /** 描述 */ 
  description?: string;
  /** mdn */
  mdn_url?: string;
  /** 规范url */
  spec_url?: string | string[];
  /** 标记 */
  tags?: string[];
  /** 中文说明 */
  cn_description?: string;
  /** 市场占比 */ 
  usage_perc_y?: number;
  /** 全面可用年份 */ 
  full_support_year?: string;
  /** 浏览器支持情况 */ 
  support: {
    [key: string]: BrowserSupport;
  }
  /** 值的统计信息， */
  values_statistics?: IAttributeValueStatistics[]
}

/** md 表格数据 */
export interface ITableData {
  属性名: string;
  描述: string;
  属性值: string;
  浏览器占比: string;
  全面支持年份: string;
}
