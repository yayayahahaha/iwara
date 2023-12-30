import { downloadByAuthors, downloadByUrls } from './flow.js'
import { settingCheck } from './utils.js'

start()

async function start() {
  const setting = settingCheck()
  if (setting == null) return

  const { urls, authors } = setting

  // authors part
  console.log('Download by authors:')
  await downloadByAuthors(authors)

  // urls part
  console.log('Download by urls:')
  await downloadByUrls(urls)
    .then((r) => r.map((r) => r.data))
    .then(console.log)
}

// TODO errorLog function, include create log file.
// TODO 看一下什麼是 TextEncoder, Unit8Array 和 crypto 的 subtle.digest 之類的東西
// TODO 對於畫面出現 Media failed 的情況做處理
