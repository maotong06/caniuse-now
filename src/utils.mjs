// @ts-check

import _ from 'lodash'
import fs from 'fs-extra'

/**
 * @typedef {import('../types').IAttributeValueStatistics} IAttributeValueStatistics
 * @typedef {import('../types').BrowserSupport} BrowserSupport
 * @typedef {import('../types').ComputeBrowserType} ComputeBrowserType
 * @typedef {import('../types').ITableData} ITableData
 * @typedef {import('@mdn/browser-compat-data').Identifier} Identifier
 * @typedef {import('@mdn/browser-compat-data').BrowserName} BrowserName
 */


// 获取对象的最大版本号
export function getMaxVersion(obj) {
  if (Object.keys(obj).length === 0) {
    return
  }
  let maxVersion = '0'
  for (const version in obj) {
    if (compareVersion(version, maxVersion) >= 0) {
      maxVersion = version
    }
  }
  return maxVersion
}

// 获取最受欢迎的版本号
export function getPopularVersion(obj) {
  if (Object.keys(obj).length === 0) {
    return
  }
  let maxVersion = '0'
  let maxPerc = 0
  for (const version in obj) {
    if (obj[version] > maxPerc) {
      maxPerc = obj[version]
      maxVersion = version
    }
  }
  return maxVersion
}

// 计算出对象中 add_date 的最大值
export function getMaxAddDate(support) {
  if (Object.keys(support).length === 0) {
    return
  }
  let maxDate = 0
  let notSupportList = []
  for (const browser in support) {
    if (!support[browser].add_version) {
      notSupportList.push(browser)
    } else if (support[browser].add_date) {
      const date = new Date(support[browser].add_date).getTime()
      if (date > maxDate) {
        maxDate = date
      }
    }
  }
  if (notSupportList.length) {
    return '❌' + notSupportList.join(',')
  } else {
    // 返回年份
    return String(new Date(maxDate).getFullYear())
  }
}


// 合计对象中的 userage_perc_y
export function sumUsagePercY(obj) {
  let res = 0
  for (const browser in obj) {
    if (obj[browser].usage_perc_y) {
      res += obj[browser].usage_perc_y
    }
  }
  return res
}

// 版本号对比
export function compareVersion(version1, version2) {
  const v1 = version1.split('.')
  const v2 = version2.split('.')
  for (let i = 0; i < v1.length; i++) {
    if (Number(v1[i]) > Number(v2[i])) {
      return 1
    } else if (Number(v1[i]) < Number(v2[i])) {
      return -1
    }
  }
  return 0
}

// 递归遍历对象， 对于属性 usage_perc_y 进行 toFixed 处理
export function toFixedObjKey(obj, fixKey, fixed = 2) {
  for (const key in obj) {
    if (_.isObject(obj[key]) || _.isArray(obj[key])) {
      toFixedObjKey(obj[key], fixed)
    } else {
      if (key === fixKey) {
        obj[key] = Number(obj[key].toFixed(fixed))
      }
    }
  }
}

// 保留指定小数
export function toFixed(value, fixed = 5) {
  return Number(value.toFixed(fixed))
}

// 获取属性值的支持情况版本号
export function getPropVersion(cssInfo, browser = 'chrome') {
  const support = cssInfo.__compat.support[browser]
  /**
   * @type {string}
   */
  let version
  if (Array.isArray(support)) {
    version = support[0].version_added
  } else {
    version = support.version_added
  }
  // 正则匹配数字和点组成的版本号
  if (version) {
    version = version.replace(/[^0-9.]/g, '')
    // 特殊处理chrome 28 版本
    // if (browser === 'chrome' && compareVersion(version, '28') < 0) {
    //   version = '28'
    // }
    return version
  } else {
    return version
  }
}

// 获取版本支持比例情况， 从最小版本开始计算，想上累加
export function getSupportPerc(browsersPercData, browser, version) {
  if (browsersPercData[browser]) {
    let res = 0
    for (const v in browsersPercData[browser]) {
      if (compareVersion(v, version) >= 0) {
        res += browsersPercData[browser][v]
      }
    }
    return res
  }
}
// 检查是否是可用的属性
export function checkIsAvailable(cssInfo) {
  return cssInfo.__compat.status.standard_track === true &&
    cssInfo.__compat.status.experimental === false &&
    cssInfo.__compat.status.deprecated === false
}
// 重命名对象的某个 key
export function renameKey(obj, oldKey, newKey) {
  if (obj[oldKey]) {
    obj[newKey] = obj[oldKey]
    delete obj[oldKey]
  }
  return obj
}

/**
 * 根据中文说明进行过滤，保留关键的, 并赋值. 并过滤不全部支持的属性
 * @param {Array<IAttributeValueStatistics>} data 
 */
export function filterWithCnDesc(data) {
  const lv1css = fs.readJSONSync('./data/lv1-css.json')
  data = _.cloneDeep(data)
  return data.filter(propItem => {
    if (!lv1css[propItem.name]) return false
    if (!checkIsAllSupport(propItem)) {
      return false
    }
    resetYear(propItem)
    propItem.values_statistics = propItem.values_statistics
      ?.filter(i => checkIsAllSupport(i))
    
    if (typeof lv1css[propItem.name] === 'string') {
      propItem.cn_description = lv1css[propItem.name]
      return true
    } else {
      propItem.values_statistics = propItem.values_statistics
        ?.filter(valueItem => {
          if (lv1css[propItem.name][valueItem.name]) {
            valueItem.cn_description = lv1css[propItem.name][valueItem.name]
            resetYear(valueItem)
            return true
          }
        })
    }
  })

  function resetYear(item) {
    item.full_support_year = item.full_support_year < 2020 ? '✅' : item.full_support_year
    return item
  }

  function checkIsAllSupport(item) {
    return /^\d+$/.test(item.full_support_year || '')
  }
}


