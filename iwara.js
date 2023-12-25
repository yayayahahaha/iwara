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
    .then(() => {
      // TODO 做檢查, taskSystem 的 status 那些的
    })
    .catch((error) => {
      // TODO 做 error handler
    })

  console.log('done')
}

// TODO errorLog function, include create log file.
