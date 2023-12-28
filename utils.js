import fs from 'fs'
import fetch from 'node-fetch'
import youtubeDl from 'youtube-dl-exec'
import loggerFunction from 'progress-estimator'
import { TaskSystem } from 'npm-flyc'
const logger = loggerFunction()

const IWARA_AUTHOR_API_PREFIX = 'https://api.iwara.tv/profile/'
const IWARA_DETAIL_API_PREFIX = 'https://api.iwara.tv/video/'
const REFERER_VALUE = 'https://www.iwara.tv/'
const URL_ID_REGEXP = /\/video\/(\w+)\/(\w+)/
const SOURCE_FILE_NAME_VALUE = 'Source'
const X_VERSION_HEADER_VALUE = 'X-Version'
const SAVED_FOLDER = 'saved'

/**
 * @function createIwaraApiUrl
 * @param {string} urlId - split from url
 * @returns {string}
 * */
function createIwaraApiUrl(urlId) {
  return `${IWARA_DETAIL_API_PREFIX}${urlId}`
}

/**
 * @function createIwaraAuthorApiUrl
 * @param {string} username - split from url
 * @returns {string}
 * */
function createIwaraAuthorApiUrl(username) {
  return `${IWARA_AUTHOR_API_PREFIX}${username}`
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
 * @function downloadByUrls
 * @param {string[]} urls
 * @returns {Promise}
 * @todo config implement and document
 * */
export function downloadByUrls(urls, taskSystemConfig = {}) {
  const { taskNumber = 3 } = taskSystemConfig

  const jobs = createFetchJobs(urls)
  const tasks = new TaskSystem(jobs, taskNumber)

  return tasks
    .doPromise()
    .then((res) => {
      console.log(res)
      // TODO 做檢查, taskSystem 的 status 那些的, 再看看要除錯還是寫個 log 就好之類的
    })
    .catch(() => {
      // TODO 做 error handler
    })
}

/**
 * @typedef SingleJobFunction
 * @type function
 * @returns {Promise}
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
    const urlMatchResult = urlInfo.pathname.match(URL_ID_REGEXP)
    const [, id, slug] = urlMatchResult

    const iwaraApiUrl = createIwaraApiUrl(id)

    return fetch(iwaraApiUrl)
      .then((res) => res.json())
      .then((res) => {
        const {
          fileUrl,
          title,
          user: { username },
          file: { id: fileId },
        } = res

        const { expires } = Object.fromEntries(new URLSearchParams(new URL(fileUrl).search))

        // HINT 為了把各式各樣的東西傳下去才這樣寫
        return xVersionGenerator(fileId, expires).then((xVersion) => ({
          xVersion,
          title,
          username,
          fileUrl,
        }))
      })
      .then((payload) => {
        const { xVersion, title, username, fileUrl } = payload

        return fetch(fileUrl, {
          method: 'get',
          headers: { [X_VERSION_HEADER_VALUE]: xVersion, referer: REFERER_VALUE },
        })
          .then((res) => res.json())
          .then((fileSourceInfo) => {
            const sourceFileInfo = fileSourceInfo.find((info) => info.name === SOURCE_FILE_NAME_VALUE)
            // TODO 創建下載失敗的 log 檔案
            if (sourceFileInfo == null) throw new Error(`[Error] url ${url} has no Source url!`)

            const {
              src: { view },
            } = sourceFileInfo
            const downloadUrl = urlFormatter(view)

            return { id, slug, title, username, downloadUrl }
          })
      })
      .then((iwaraInfo) => {
        const { id, slug, title, username, downloadUrl } = iwaraInfo

        // 這裡用 path 來改寫，像是 join 或 resolve
        const fileName = `${SAVED_FOLDER}/${username}/${title}-${id}_${slug}.mp4`

        const downloadPromise = youtubeDl(downloadUrl, { o: fileName, dumpJson: true })
          // HINT 上面那個 dumpJson 如果不加的話沒有辦法偵測到 download failed,
          // 加了的話沒辦法下載，所以先執行兩次。暫時沒有去找更優雅的解法
          .then(() => youtubeDl(downloadUrl, { o: fileName }))
          .catch((error) => {
            // TODO error log to a file or something
            throw new Error(error)
          })

        return logger(downloadPromise, `Obtaining ${fileName}`)
      })
  })
}

/**
 * @function urlFormatter
 * @param {string} url
 * @description Add prefix protocal `https` to url which start without it.
 * */
function urlFormatter(url) {
  return /^https?:/.test(url) ? url : `https:${url}`
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
