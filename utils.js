import fs from 'fs'
import fetch from 'node-fetch'

/**
 * @function readSettingJson
 * @returns {object|null}
 * @todo combine with other projects: Exh3ntai-downloader
 * */
export function readSettingJson() {
  if (!fs.existsSync('setting.json')) {
    console.log("There's no setting.json file.")
    return null
  }

  try {
    return JSON.parse(fs.readFileSync('setting.json'))
  } catch (e) {
    console.log('Parse setting.json file error!')
    return null
  }
}

/**
 * @typedef PromiseFunction
 * @returns {Promise}
 * */
/**
 * @function createFetchJobs
 * @param {Array} urls - iwara video detail url
 * @returns {PromiseFunction[]}
 * @description Create jobs of each fetch flow.
 * */
export function createFetchJobs(urls) {
  return urls.map(
    (url) => () =>
      fetch(url)
        .then((res) => res.json())
        .then((res) => {
          console.log(res)
          return res
        })
  )
}
