import { downloadByAuthors, downloadByUrls } from './flow.js'
import { readSettingJson } from './utils.js'

start()

async function start() {
  const setting = readSettingJson()
  if (setting == null) return

  const { urls, authors } = setting
  if (!Array.isArray(urls)) {
    return void console.error(`[Error] Key \`url\` in \`setting.json\` is not an array`)
  }

  if (authors.some((author) => typeof author !== 'string')) {
    return void console.error(`[Error] All items in key \`authors\` must be a string`)
  }
  if (urls.some((url) => typeof url !== 'string')) {
    return void console.error(`[Error] All items in key \`url\` must be a string`)
  }

  // authors part
  await downloadByAuthors(authors)

  // urls part
  await downloadByUrls(urls)
}

// TODO errorLog function, include create log file.
// TODO 看一下什麼是 TextEncoder, Unit8Array 和 crypto 的 subtle.digest 之類的東西
// TODO 對於畫面出現 Media failed 的情況做處理
