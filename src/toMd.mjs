import tablemark from "tablemark"
import fs from 'fs-extra'
/**
 * @typedef {import('../types').IAttributeValueStatistics} IAttributeValueStatistics
 * @typedef {import('../types').BrowserSupport} BrowserSupport
 * @typedef {import('../types').ComputeBrowserType} ComputeBrowserType
 * @typedef {import('../types').ITableData} ITableData
 * @typedef {import('@mdn/browser-compat-data').Identifier} Identifier
 * @typedef {import('@mdn/browser-compat-data').BrowserName} BrowserName
 */


/** 生产 readme */
export function genReadme() {
  const readme = `# CSS 属性支持情况
  -----------
  浏览器占比只统计了chorme,firefox,safari 及其相同内核的浏览器。所以最高占比也只能达到 88.32 %。手机端的浏览器，qq，uc 等没法拿到版本数据，考虑到手机一般会自动更新 app，所以统一按 chrome 的活跃度最高内核版本来计算了。
  ----------------
  数据来源：[browser-compat-data](https://github.com/mdn/browser-compat-data);
  [caniuse](https://github.com/Fyrd/caniuse)
  `
  return readme
}

/**
 * 
 * @param {Array<IAttributeValueStatistics>} data 
 * @returns 
 */
export function dataToMd(data) {
  const tableData = transformJsonData(data)
  const columns = Object.keys(tableData[0]).map(key => ({ name: key }))
  const markdown = tablemark(tableData, {
    columns
  })
  return markdown
}

/**
 *  转换json数据
 * @param {Array<IAttributeValueStatistics>} json 
 * @returns 
 */
export function transformJsonData(json) {
  /**
   * @type {ITableData[]}
   */
  let tableData = []
  json.forEach(propItem => {
    if (checkIsNotCare(propItem)) return
    tableData.push({
      序号: tableData.length + 1,
      属性名: propItem.name,
      属性值: '',
      ...genCommonData(propItem)
    })
    propItem.values_statistics.forEach(valueItem => {
      if (checkIsNotCare(valueItem)) return
      tableData.push({
        序号: tableData.length + 1,
        属性名: '',
        属性值: valueItem.description ? valueItem.description : valueItem.name,
        ...genCommonData(valueItem)
      })
    })
  })


  function checkIsNotCare(item) {
    // const notCareTags = [
    //   'web-features:font-',
    //   'web-features:hyphens'
    // ]
    // if (notCareTags.some(tag => item.tags?.some(pTag => pTag.includes(tag)))) {
    //   return true
    // }
    return false
  }

  function genCommonData(item) {
    const mdnContent = item.mdn_url ? `[MDN](${item.mdn_url}),` : ''
    const spec_urlContent = item.spec_url.length > 0 ? item.spec_url.map((url, index) => `[规范${index + 1}](${url})`) : ''
    return {
      简要说明: item.cn_description || '',
      链接: mdnContent + spec_urlContent,
      浏览器占比: item.usage_perc_y.toFixed(2) + '%',
      全面支持年份: item.full_support_year,
      // tags: item.tags ? item.tags.join(',') : ''
    }
  }
  return tableData
}


