import fetch from 'node-fetch'
import youtubeDl from 'youtube-dl-exec'
import { TaskSystem } from 'npm-flyc'
const { Job } = TaskSystem
import loggerCreater from 'progress-estimator'
const logger = loggerCreater()
import fs from 'fs'

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
 * @todo config implement and document, make a primary-key of items for cache
 * */
export function downloadByAuthors(authors) {
  if (authors == null) return Promise.resolve(null)

  const jobs = _createFetchAuthorJob(authors)
  const tasks = new TaskSystem(jobs, 3)

  return tasks.doPromise()

  function _createFetchAuthorJob(authors) {
    return authors.map((author) => {
      const username = author.match(AUTHOR_URL_REGEXP)[1]

      // 單憑 username 沒辦法取得資料，這個 api 是用來取 userId 的
      const authorInfoApiUrl = createIwaraAuthorApiUrl(username)

      const job = async () => {
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
            console.log(`Get all iwara created by ${username}`)

            const { count: total } = res
            const maxPageNumber = 50 // HINT 這個是 iwara 寫死的

            const requestPages = new Array(Math.ceil(total / maxPageNumber)).fill().map((_, i) => i)
            const pageJob = requestPages.map(
              (page) => () => getIwaraListByUserId(userId, { page, limit: maxPageNumber })
            )
            return new TaskSystem(pageJob, 3).doPromise()
          })
          .then((res) => {
            // format result to get every urls of author
            return res
              .map((result) => result.data.results)
              .flat()
              .map(({ id, slug }) => `${IWARA_DETAIL_PAGE_PREFIX}${id}${slug ? `/${slug}` : ''}`)
          })
          .then((urls) => {
            console.log(`Start download iwara of ${username}`)
            // TODO 看要不要特別傳接參數下去，用於調整 progressbar 之類等等的顯示
            return downloadByUrls(urls, { taskNumber: 2 })
          })
          .catch(console.error)
      }

      return new Job({ job, jobName: username })
    })
  }
}

/**
 * @function downloadByUrls
 * @param {string[]} urls
 * @returns {Promise}
 * @todo config implement and document
 * */
export async function downloadByUrls(urls, taskSystemConfig = {}) {
  if (urls == null) return null

  const { taskNumber = 3 } = taskSystemConfig

  const jobsGetInfo = _createFetchUrlInfoJob(urls)
  const tasksGetInfo = new TaskSystem(jobsGetInfo, taskNumber)
  return tasksGetInfo
    .doPromise()
    .then((infoList) => infoList.filter((info) => info.status).map((info) => info.data))
    .then((infoList) => {
      const jobsDownload = _createDownloadJob(infoList)
      const taskDownload = new TaskSystem(jobsDownload, taskNumber)
      return taskDownload.doPromise()

      // TODO 這裡如果放上 async 的話， TaskSystem 那邊會卡住，可以看一下
      function _createDownloadJob(infoList) {
        return infoList.map((info) => {
          const { title } = info
          const jobName = title
          const job = async function () {
            const { expires, fileId } = info

            // HINT 為了把各式各樣的東西傳下去才這樣寫
            return xVersionGenerator(fileId, expires)
              .then((xVersion) => Object.assign({}, info, { xVersion }))
              .then(async (payload) => {
                const { xVersion, fileUrlApi, url } = payload

                return fetch(fileUrlApi, {
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

                    return Object.assign({}, payload, { downloadUrl })
                  })
              })
              .then((iwaraInfo) => {
                const { id, slug, title, username, downloadUrl } = iwaraInfo

                // TODO 這裡用 path 來改寫，像是 join 或 resolve
                const fileName = `${SAVED_FOLDER}/${username}/${title}-${id}_${slug}.mp4`

                if (fs.existsSync(fileName)) return Promise.resolve(null)

                // TODO 這裡要取得 youtube-dl 的 download progress? 的 callback 去呼叫 Job 的 `updateProgress` or `setTotalProgress`
                const downloadPromise = youtubeDl(downloadUrl, { o: fileName, dumpJson: true })
                  // HINT 上面那個 dumpJson 如果不加的話沒有辦法偵測到 download failed,
                  // 加了的話沒辦法下載，所以先執行兩次。暫時沒有去找更優雅的解法
                  .then(() => youtubeDl(downloadUrl, { o: fileName }))
                  .catch((error) => {
                    // TODO error log to a file or something
                    throw new Error(error)
                  })

                return logger(downloadPromise, `Obtaining ${fileName}`)
                // return downloadPromise
              })
          }

          return new Job({ jobName, job })
        })
      }
    })

  /**
   * @typedef SingleJobFunction
   * @type function
   * @returns {Promise}
   * */
  /**
   * @function _createFetchUrlInfoJob
   * @param {Array} urls - iwara video detail url
   * @returns {SingleJobFunction[]}
   * @description Create jobs of each fetch flow.
   * @todo it's a little bit hard to read, refactor later
   * */
  function _createFetchUrlInfoJob(urls) {
    return urls.map((url) => {
      const { id, slug } = getUrlIdAndSlug(url)
      const iwaraApiUrl = createIwaraApiUrl(id)

      return async () => {
        return fetch(iwaraApiUrl)
          .then((res) => res.json())
          .then(async (res) => {
            const {
              fileUrl: fileUrlApi,
              title,
              user: { username },
              file: { id: fileId },
            } = res

            const { expires } = Object.fromEntries(new URLSearchParams(new URL(fileUrlApi).search))

            return {
              url,
              id,
              slug,
              expires,
              fileId,
              title,
              username,
              fileUrlApi,
            }
          })
      }
    })
  }
}

// TODO 有些網址出來的會是一個 youtube: https://www.iwara.tv/video/mbrgxcm56rc2g4orp/kkvmd
// TODO 對於 author 下載的部分的 url 相容性可以提高些，很多時候不會是停留在 profile 頁面
// TODO 把下載的網址放進 job payload 裡面，可以做很多事情
