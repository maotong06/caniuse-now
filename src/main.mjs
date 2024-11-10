// @ts-check
import fs from 'fs-extra'
import bcd from '@mdn/browser-compat-data/forLegacyNode';
import path from 'node:path'
import _ from 'lodash'
import { getMaxVersion, sumUsagePercY, compareVersion, getPropVersion,
  getMaxAddDate, getSupportPerc, checkIsAvailable, 
  toFixed, renameKey, filterWithCnDesc } from './utils.mjs'
import { formateBrowsersPercData } from './formatPercData.mjs'
import { dataToMd } from './toMd.mjs'
const cssProperties = bcd.css.properties
const bcdBrowsers = bcd.browsers

// 数据来源
// https://github.com/mdn/browser-compat-data/blob/main/schemas/compat-data-schema.md
// https://github.com/mdn/browser-compat-data?tab=readme-ov-file
// https://github.com/Fyrd/caniuse?tab=readme-ov-file
// https://github.com/Fyrd/caniuse/blob/main/CONTRIBUTING.md


/**
 * @typedef {import('../types').IAttributeValueStatistics} IAttributeValueStatistics
 * @typedef {import('../types').BrowserSupport} BrowserSupport
 * @typedef {import('../types').ComputeBrowserType} ComputeBrowserType
 * @typedef {import('@mdn/browser-compat-data').Identifier} Identifier
 * @typedef {import('@mdn/browser-compat-data').BrowserName} BrowserName
 */


// 第一个 blink 内核版本开始计算， 2013-07-09
const startChromeVersion = '28'
const browsersPercData = formateBrowsersPercData(fs.readJSONSync(path.resolve('./data/CN.json')))
const lv1css = fs.readJSONSync('./data/lv1-css.json')

main()
function main() {
  
  const allPropertiesSupportRes = genPropertyStatistics()
  // 写入文件
  fs.writeJSONSync('./dist/css属性占比.json', allPropertiesSupportRes, { spaces: 2 })

  // 转换为markdown
  const markdown = dataToMd(allPropertiesSupportRes)
  fs.writeFileSync(`./dist/css属性占比-${new Date().getFullYear()}.md`, markdown)
  const markdownUse = dataToMd(filterWithCnDesc(allPropertiesSupportRes))
  fs.writeFileSync(`./dist/css属性占比-常用属性-${new Date().getFullYear()}.md`, markdownUse)
}

// 处理需要的属性
function genPropertyStatistics() {
  const allPropertiesSupportRes = []
  let propsObj = Object.assign(
    {},
    cssProperties,
    _.pick(bcd.css.selectors, ['has', 'not', 'is']),
    renameKey(_.pick(bcd.css['at-rules'], ['container']), 'container', '@container')
  )
  _.forEach(propsObj, (propertyInfo, property) => {
    if (property.startsWith('-webkit-') || property.startsWith('-moz-')) return
    if (propertyInfo.__compat?.spec_url?.includes('https://svgwg.org')) return
    if (!getPropVersion(propertyInfo)) return
    if (!checkIsAvailable(propertyInfo)) return

    const values_statistics = genAttributeValueStatistics(propertyInfo)
    if (values_statistics.length === 0 && compareVersion(getPropVersion(propertyInfo), startChromeVersion) < 0) return
    /**
     * 输出结果
     * @type {IAttributeValueStatistics}
     */
    const propertyInfoRes = {
      name: property,
      ...genAttributeValueStatisticsBase(propertyInfo),
      values_statistics
    }
    allPropertiesSupportRes.push(propertyInfoRes)
  })
  return allPropertiesSupportRes
}

// 生成值的支持情况
function genAttributeValueStatistics(propertyInfo) {
  const res = []
  _.forEach(propertyInfo, (valueInfo, valueName) => {
    if (valueName === '__compat') return
    if (!getPropVersion(valueInfo)) return
    if (!checkIsAvailable(valueInfo)) return
    if (compareVersion(getPropVersion(valueInfo), startChromeVersion) < 0) {
      return
    }
    res.push({
      name: valueName,
      ...genAttributeValueStatisticsBase(valueInfo)
    })
  })
  return res
}

/**
 * 计算浏览器支持情况，用于css属性和值
 * @param {Identifier} cssPropertyInfo 
 * @returns 
 */
function genAttributeValueStatisticsBase(cssPropertyInfo) {
  const chromeSupport = getSupporDateAndPerc(cssPropertyInfo, 'chrome')
  const firefoxSupport = getSupporDateAndPerc(cssPropertyInfo, 'firefox')
  const safariSupport = getSupporDateAndPerc(cssPropertyInfo, 'safari')
  const support = {
    chrome: chromeSupport,
    firefox: firefoxSupport,
    safari: safariSupport,
  }
  return {
    description: cssPropertyInfo.__compat?.description,
    mdn_url: cssPropertyInfo.__compat?.mdn_url,
    spec_url: cssPropertyInfo.__compat?.spec_url ?
      (Array.isArray(cssPropertyInfo.__compat?.spec_url) ?
        cssPropertyInfo.__compat?.spec_url
        : [cssPropertyInfo.__compat?.spec_url])
      : [],
    tags: cssPropertyInfo.__compat?.tags,
    usage_perc_y: toFixed(sumUsagePercY(support)),
    full_support_year: getMaxAddDate(support),
    support: support,
  }
}


/**
 * 根据详情和浏览器，获取属性的版本号，年份，支持情况
 * @param {Identifier} cssIdentifierInfo 
 * @param {ComputeBrowserType} browser 
 */
function getSupporDateAndPerc(cssIdentifierInfo, browser) {
  let originVersion = getPropVersion(cssIdentifierInfo, browser)
  let version = originVersion
  if (!version) {
    return {
      add_version: false,
    }
  }
  if (browser === 'chrome' && compareVersion(version, startChromeVersion) < 0) {
    version = startChromeVersion
  }
  const browserInfo = bcdBrowsers[browser]
  const add_date = browserInfo.releases[originVersion]?.release_date

  const engineName = browserInfo.releases[version]?.engine
  const engine_version = browserInfo.releases[version]?.engine_version
  const sameCoreSupportMap = getSameCoreBrowsers(engineName, engine_version)
  // console.log('sameCoreSupportMap', browser, sameCoreSupportMap, engineName, engine_version)
  return {
    add_version: originVersion,
    add_date,
    usage_perc_y: toFixed(sumUsagePercY(sameCoreSupportMap))
  }


  // 获取相同内核浏览器和对应的版本号
  function getSameCoreBrowsers(engineName, engine_version) {
    /**
     * @type {Record<string, BrowserSupport>}
     */
    const res = {
    }
    _.forEach(bcdBrowsers, (browserInfo, browser) => {
      if (!browsersPercData[browser]) return
      // 最小版本限制, 只计算最新引擎
      const maxVersion = getMaxVersion(browserInfo.releases)
      if (!maxVersion) return
      const lastEngineName = browserInfo.releases[maxVersion].engine
  
      _.forEach(browserInfo.releases, (releasesInfo, version) => {
        if (releasesInfo.engine !== lastEngineName) return
        if (
          releasesInfo.engine === engineName &&
          compareVersion(releasesInfo.engine_version, engine_version) >= 0
        )
          {
          if ((res[browser] && compareVersion(res[browser].add_version, version) > 0)
              ||
              !res[browser]) {
                // console.log('engineName', engineName, releasesInfo.engine, browser, res)
            res[browser] = {
              add_version: version,
              add_date: releasesInfo.release_date,
              usage_perc_y: toFixed(getSupportPerc(browsersPercData, browser, version))
            }
          }
        }
      })
    })
    return res
  }
}






