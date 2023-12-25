import { readSettingJson } from './utils.js'

start()

function start() {
  const setting = readSettingJson()
  if (setting == null) return
}
