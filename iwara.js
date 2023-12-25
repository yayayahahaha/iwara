import { TaskSystem } from 'npm-flyc'
import { createFetchJobs, readSettingJson } from './utils.js'

start()

function start() {
  const setting = readSettingJson()
  if (setting == null) return

  const { urls } = setting
  if (!Array.isArray(urls)) {
    return void console.error(`[Error] Key \`url\` in \`setting.json\` is not an array`)
  }

  if (urls.filter((url) => typeof url !== 'string').length !== 0) {
    return void console.error(`[Error] All items in key \`url\` must be a string`)
  }

  const jobs = createFetchJobs(urls)
  const tasks = new TaskSystem(jobs)

  tasks
    .doPromise()
    .then((res) => {
      console.log(res)
      // TODO 做檢查, taskSystem 的 status 那些的, 再看看要除錯還是寫個 log 就好之類的
    })
    .catch(() => {
      // TODO 做 error handler
    })
}

// TODO errorLog function, include create log file.
