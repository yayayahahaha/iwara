import fs from 'fs'
import fetch from 'node-fetch'

const IWARA_DETAIL_API_PREFIX = 'https://api.iwara.tv/video/'
const REFERER_VALUE = 'https://www.iwara.tv/'
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
 * @todo it's a little bit hard to read, refactor later
 * */
export function createFetchJobs(urls) {
  return urls.map((url) => () => {
    const urlInfo = new URL(url)
    const id = urlInfo.pathname.match(URL_ID_REGEXP)[1]

    const iwaraApiUrl = createIwaraApiUrl(id)

    return fetch(iwaraApiUrl)
      .then((res) => res.json())
      .then((res) => {
        const {
          title,
          fileUrl,
          file: { id: fileId },
        } = res

        const { expires } = Object.fromEntries(new URLSearchParams(new URL(fileUrl).search))

        // HINT 為了把各式各樣的東西傳下去才這樣寫
        return xVersionGenerator(fileId, expires).then((xVersion) => ({
          xVersion,
          fileId,
          fileUrl,
          title,
        }))
      })
      .then((payload) => {
        const { fileUrl, fileId, xVersion, title } = payload

        return fetch(fileUrl, {
          method: 'get',
          headers: { 'X-Version': xVersion, referer: REFERER_VALUE },
        })
          .then((res) => res.json())
          .then((fileSourceInfo) => {
            console.log('fileSourceInfo:', fileSourceInfo)

            const sourceFileUrl = ''
            return { sourceFileUrl, id, fileId, title }
          })
      })
  })
}

/**
 * @typedef xVersionGeneratorConfig
 * @prooperty {boolean|false} verbose - Display more detail.
 * */
/**
 * @function xVersionGenerator
 * @param id
 * @param expires
 * @returns {Promise<string>}
 * @example xVersionGenerator('c6382434-6ca7-4921-8398-d8137b4bc9fc', '1703705947205') -> 'b6be4437688a886d75a8555de91c7cc310d85d93'
 * */
function xVersionGenerator(id, expires, config = {}) {
  const defaultConfig = [['verbose', false]]
  const runningConfig = Object.fromEntries(
    defaultConfig.map(([key, defaultValue]) => (config[key] != null ? [key, config[key]] : [key, defaultValue]))
  )

  const HASH_KEY = '5nFp9kmbNnHdAFhaqMvt'
  const hashedText = `${id}_${expires}_${HASH_KEY}`
  const { verbose } = runningConfig

  if (verbose) {
    console.log('[xVersionGenerator] HASH_KEY:', HASH_KEY)
    console.log('[xVersionGenerator] hashedText:', hashedText)
  }

  return crypto.subtle.digest('SHA-1', new TextEncoder().encode(hashedText)).then((arrayBuffer) => {
    const result = Array.from(new Uint8Array(arrayBuffer))
      .map((e) => e.toString(16).padStart(2, '0'))
      .join('')

    if (verbose) {
      console.log('[xVersionGenerator] arrayBuffer:', arrayBuffer)
      console.log('[xVersionGenerator] result:', result)
    }

    return result
  })
}
