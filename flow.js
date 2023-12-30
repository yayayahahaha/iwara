import fetch from 'node-fetch'
import youtubeDl from 'youtube-dl-exec'
import { TaskSystem } from 'npm-flyc'
const { Job } = TaskSystem

import {
  REFERER_VALUE,
  IWARA_DETAIL_PAGE_PREFIX,
  AUTHOR_URL_REGEXP,
  SOURCE_FILE_NAME_VALUE,
  X_VERSION_HEADER_VALUE,
  SAVED_FOLDER,
  xVersionGenerator,
  urlFormatter,
  getUrlIdAndSlug,
  createIwaraApiUrl,
  createIwaraAuthorApiUrl,
  getIwaraListByUserId,
} from './utils.js'

/**
 * @function downloadByAuthors
 * @param {string} authors
 * @returns {Promise}
 * @todo config implement and document
 * */
export function downloadByAuthors(authors) {
  const jobs = _createFetchAuthorJob(authors)
  const tasks = new TaskSystem(jobs, 3)

  return tasks.doPromise()

  function _createFetchAuthorJob(authors) {
    return authors.map((author) => async () => {
      const username = author.match(AUTHOR_URL_REGEXP)[1]
      const authorInfoApiUrl = createIwaraAuthorApiUrl(username)

      return fetch(authorInfoApiUrl)
        .then((res) => res.json())
        .then(async (res) => {
          const {
            user: { id: userId },
          } = res

          return getIwaraListByUserId(userId).then((res) => ({
            res,
            userId,
          }))
        })
        .then((payload) => {
          const { res, userId } = payload

          const { count: total } = res
          const maxPageNumber = 50 // HINT 這個是 iwara 寫死的

          const requestPages = new Array(Math.ceil(total / maxPageNumber)).fill().map((_, i) => i)
          const pageJob = requestPages.map((page) => () => getIwaraListByUserId(userId, { page, limit: maxPageNumber }))
          return new TaskSystem(pageJob, 3).doPromise()
        })
        .then((res) => {
          return res
            .map((result) => result.data.results)
            .flat()
            .map(({ id, slug }) => `${IWARA_DETAIL_PAGE_PREFIX}${id}${slug ? `/${slug}` : ''}`)
        })
        .then((urls) => {
          // NEXT 把這個東西直接丟到下載裡面嗎?
          return downloadByUrls(urls, { taskNumber: 2 })
        })
        .catch(console.error)
    })
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

  const jobs = _createFetchUrlJob(urls)
  const tasks = new TaskSystem(jobs, taskNumber)

  return tasks.doPromise()

  /**
   * @typedef SingleJobFunction
   * @type function
   * @returns {Promise}
   * */
  /**
   * @function _createFetchUrlJob
   * @param {Array} urls - iwara video detail url
   * @returns {SingleJobFunction[]}
   * @description Create jobs of each fetch flow.
   * @todo it's a little bit hard to read, refactor later
   * */
  function _createFetchUrlJob(urls) {
    return urls.map((url) => () => {
      const { id, slug } = getUrlIdAndSlug(url)

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

          // return logger(downloadPromise, `Obtaining ${fileName}`)
          return downloadPromise
        })
    })
  }
}
