import { downloadByAuthors, downloadByUrls } from './flow.js'
import { LOG_FOLDER, createCacheFile, createRelativeFolder, settingCheck } from './utils.js'
import fs from 'fs'
import path from 'path'

start()

async function start() {
  const setting = settingCheck()
  if (setting == null) return

  createRelativeFolder()
  const cacheMap = createCacheFile()

  const { urls, authors } = setting
  // authors part
  console.log('Download by authors:')
  await downloadByAuthors(authors, { cacheMap }).then((result) => {
    if (result == null) return

    // HINT print result
    result.forEach((authorResult) => {
      const successCount = authorResult.data.filter((item) => item.status === 1).length
      const failedCount = authorResult.data.length - successCount
      console.log(`${authorResult.meta.jobName}: success: ${successCount}, failed: ${failedCount}`)
    })

    const logPath = path.resolve(path.join(LOG_FOLDER, `author_download-${Date.now()}.json`))
    fs.writeFileSync(logPath, JSON.stringify(result, null, 2))
  })

  console.log('========')

  // urls part
  console.log('Download by urls:')
  await downloadByUrls(urls, { cacheMap }).then((result) => {
    if (result == null) return

    const successCount = result.filter((item) => item.status === 1).length
    const failedCount = result.length - successCount

    console.log(`url result: success: ${successCount}, failed: ${failedCount} `)
  })
}

// TODO errorLog function, include create log file.
// TODO 看一下什麼是 TextEncoder, Unit8Array 和 crypto 的 subtle.digest 之類的東西
// TODO 對於畫面出現 Media failed 的情況做處理
// TODO 處理一下快取的問題，雖然 youtube-dl 已經有了，但還是會比較慢
