// @ts-check

import _ from 'lodash'
import {getPopularVersion, sumUsagePercY} from './utils.mjs'

// 合并，处理没有版本的数据， 重命名
export function formateBrowsersPercData(bData) {
  _.forEach(bData.data, (browserData, borwser) => {
    for (const version in browserData) {
      if (browserData[version] === null || browserData[version] === 0) {
        delete browserData[version]
      } else {
        if (version.includes('-')) {
          // 分割版本号，并平分数量
          const [start, end] = version.split('-')
          browserData[start] = browserData[version] / 2
          browserData[end] = browserData[version] / 2
          delete browserData[version]
        }
      }
    }
  })
  // getTotal()

  // 合并mob浏览器支持数据
  const mergeBrowsersPercMap = {
    chrome: ['op_mob', 'and_uc', 'and_chr', 'baidu', 'and_qq', 'op_mini'],
    firefox: ['and_ff']
  }
  _.forEach(mergeBrowsersPercMap, (mergeBrowsers, browser) => {
    const browserData = bData.data[browser]
    const maxVersion = getPopularVersion(browserData)
    if (!maxVersion) { return }

    _.forEach(mergeBrowsers, (mergeBrowser) => {
      const mergeBrowserData = bData.data[mergeBrowser]
      _.forEach(mergeBrowserData, (perc) => {
        browserData[maxVersion] += perc
      })
    })
  })

  // 统一命名
  const nameMap = {
    ios_saf: 'safari_ios',
    samsung: 'samsunginternet_android'
  }
  _.forEach(nameMap, (newName, oldName) => {
    bData.data[newName] = bData.data[oldName]
    delete bData.data[oldName]
  })


  
  return bData.data

  function getTotal() {
    // 计算总量除了ie
    let total = 0
    let totalMap = {}
    _.forEach(bData.data, (browserData, browser) => {
      if (!totalMap[browser]) {
        totalMap[browser] = 0
      } 
      if (browser === 'ie' || browser === 'android') { return }
      Object.values(browserData).forEach((perc) => {
        total += perc
        totalMap[browser] += perc
      })
    })

    console.log('total',total, totalMap)
  }
}

