import fs from 'fs'
import { readSettingJson } from './utils.js'

function start() {
  const setting = readSettingJson()
  if (setting == null) {
    console.error('setting.js file is not exist')
    return null
  }

  const { authors = [], urls = [] } = setting

  fs.writeFileSync(
    'setting.json',
    JSON.stringify(
      {
        authors: [...new Set(authors)].sort(),
        urls: [...new Set(urls)].sort(),
      },
      null,
      2
    )
  )
}

start()
