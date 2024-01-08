import fs from 'fs'
import path from 'path'

export const IWARA_AUTHOR_API_PREFIX = 'https://api.iwara.tv/profile/'
export const IWARA_DETAIL_API_PREFIX = 'https://api.iwara.tv/video/'
export const REFERER_VALUE = 'https://www.iwara.tv/'
export const IWARA_DETAIL_PAGE_PREFIX = 'https://www.iwara.tv/video/'
export const AUTHOR_URL_REGEXP = /\/profile\/([^/]+)/
export const SOURCE_FILE_NAME_VALUE = 'Source'
export const X_VERSION_HEADER_VALUE = 'X-Version'
export const SAVED_FOLDER = 'saved'
export const LOG_FOLDER = 'log'
const MAC_DS_STORE = '.DS_Store'
const CACHE_FILE_NAME = '.cache'

/**
 * @function createRelativeFolder
 * */
export function createRelativeFolder() {
  if (!fs.existsSync(LOG_FOLDER)) fs.mkdirSync(LOG_FOLDER)
  if (!fs.existsSync(SAVED_FOLDER)) fs.mkdirSync(SAVED_FOLDER)
}

/**
 * @function createCacheFile
 * @todo document stuff
 * */
export function createCacheFile() {
  const regExpGetIdAndSlug = /-([A-Za-z0-9]+)_([\w-]+)\.\w+$/

  const cacheContentList = fs
    .readdirSync(SAVED_FOLDER)
    .filter((authorName) => authorName !== MAC_DS_STORE)
    .map((authorName) => {
      const authorPath = path.join(SAVED_FOLDER, authorName)
      return { authorName, iwaraList: fs.readdirSync(authorPath) }
    })

    .map((authorInfo) => {
      authorInfo.iwaraList = authorInfo.iwaraList
        .filter((iwaraName) => iwaraName !== MAC_DS_STORE)

        // TEST 這個是測試用的, 整理完畢後可以刪除
        .filter((iwaraName) => iwaraName.match(regExpGetIdAndSlug) != null)
      return authorInfo
    })

    .map((authorInfo) => {
      const { authorName, iwaraList } = authorInfo
      return iwaraList.map((iwaraName) => {
        const [, id, slug] = iwaraName.match(regExpGetIdAndSlug)
        return [createCacheKey(id, slug), { authorName, id, slug }]
      })
    })
    .flat()

  const cacheContentMap = Object.fromEntries(cacheContentList)

  fs.writeFileSync(CACHE_FILE_NAME, JSON.stringify(cacheContentMap, null, 2))
  return cacheContentMap
}

/**
 * @function createCacheKey
 * @todo document
 * */
export function createCacheKey(iwaraId, slug = '_') {
  return `${iwaraId}-${slug}`
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
export async function xVersionGenerator(id, expires, config = {}) {
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
 * @function urlFormatter
 * @param {string} url
 * @description Add prefix protocal `https` to url which start without it.
 * */
export function urlFormatter(url) {
  return /^https?:/.test(url) ? url : `https:${url}`
}

/**
 * @function getUrlIdAndSlug
 * @todo document
 * */
export function getUrlIdAndSlug(url) {
  const URL_ID_REGEXP = /\/video\/(\w+)\/([\w-]+)/
  let matchResult = url.match(URL_ID_REGEXP)

  if (matchResult != null) {
    return {
      id: matchResult[1],
      slug: matchResult[2],
    }
  }

  const URL_ID_REGEXP_WITHOUT_SLUG = /\/video\/(\w+)/
  matchResult = url.match(URL_ID_REGEXP_WITHOUT_SLUG)
  return {
    id: matchResult[1],
    slug: '_',
  }
}

/**
 * @function createIwaraApiUrl
 * @param {string} urlId - split from url
 * @returns {string}
 * */
export function createIwaraApiUrl(urlId) {
  return `${IWARA_DETAIL_API_PREFIX}${urlId}`
}

/**
 * @function createIwaraAuthorApiUrl
 * @param {string} username - split from url
 * @returns {string}
 * */
export function createIwaraAuthorApiUrl(username) {
  return `${IWARA_AUTHOR_API_PREFIX}${username}`
}

/**
 * @function getIwaraListByUserId
 * @todo document
 * */
export function getIwaraListByUserId(userId, config = {}) {
  const { limit = 1, page = 0 } = config
  const apiUrl = 'https://api.iwara.tv/videos'
  const query = {
    user: userId,
    limit,
    page,
  }
  const queryString = new URLSearchParams(query).toString()

  const fetchApi = `${apiUrl}?${queryString}`
  return fetch(fetchApi).then((res) => res.json())
}

/**
 * @function settingCheck
 * @returns {boolean}
 * @description Check setting file is validated or not.
 * */
export function settingCheck() {
  const setting = readSettingJson()
  if (setting == null) return null

  const { urls, authors } = setting
  if (urls != null && !Array.isArray(urls)) {
    console.error(`[Error] Key \`url\` in \`setting.json\` is not an array`)
    return null
  }
  if (authors != null && !Array.isArray(authors)) {
    console.error(`[Error] Key \`authors\` in \`setting.json\` is not an array`)
    return null
  }

  if (urls != null && urls.some((url) => typeof url !== 'string')) {
    console.error(`[Error] All items in key \`url\` must be a string`)
    return null
  }
  if (authors != null && authors.some((author) => typeof author !== 'string')) {
    console.error(`[Error] All items in key \`authors\` must be a string`)
    return null
  }

  return { urls, authors }
}
