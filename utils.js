import fs from 'fs'
import fetch from 'node-fetch'

const IWARA_DETAIL_API_PREFIX = 'https://api.iwara.tv/video/'
const URL_ID_REGEXP = /\/video\/(\w+)\/\w+/

/**
 * @function createIwaraApiUrl
 * @param {string} urlId - split from url
 * @returns {string}
 * */
function createIwaraApiUrl(urlId) {
  return `${IWARA_DETAIL_API_PREFIX}${urlId}`
}

/**
 * @function readSettingJson
 * @returns {object|null}
 * @todo combine with other projects: Exh3ntai-downloader
 * */
export function readSettingJson() {
  if (!fs.existsSync('setting.json')) {
    console.error("There's no setting.json file.")
    return null
  }

  try {
    return JSON.parse(fs.readFileSync('setting.json'))
  } catch (e) {
    console.error('Parse setting.json file error!')
    return null
  }
}

/**
 * @function Iwara
 * @returns {IwaraInstance}
 * */
function Iwara(config) {
  if (config == null) {
    console.error(`[Error] Iwara: config should be an Object`)
    return null
  }

  const neededKeys = ['id', 'title', 'fileUrl']
  const defaultObject = Object.assign(this, Object.fromEntries(neededKeys.map((key) => [key, null])))

  const check = neededKeys.every((key) => {
    if (config[key] == null) {
      console.error(`[Error] Iwara: Missing required key \`${key}\``)
      return false
    }
    return true
  })

  if (!check) return defaultObject
  return Object.assign(this, Object.fromEntries(neededKeys.map((key) => [key, config[key]])))
}

/**
 * @typedef IwaraInstance
 * @property {string} id
 * @property {string} title
 * @property {string} fileUrl
 * */
/**
 * @typedef SingleJobFunction
 * @type function
 * @returns {Promise<IwaraInstance>}
 * */
/**
 * @function createFetchJobs
 * @param {Array} urls - iwara video detail url
 * @returns {SingleJobFunction[]}
 * @description Create jobs of each fetch flow.
 * */
export function createFetchJobs(urls) {
  return urls.map((url) => () => {
    const urlInfo = new URL(url)
    const id = urlInfo.pathname.match(URL_ID_REGEXP)[1]

    const iwaraApiUrl = createIwaraApiUrl(id)

    return fetch(iwaraApiUrl)
      .then((res) => res.json())
      .then((res) => {
        const { title, id, fileUrl } = res
        return new Iwara({ id, title, fileUrl })
      })
  })
}
