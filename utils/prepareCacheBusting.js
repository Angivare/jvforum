let sha1 = require('sha1')
  , fs = require('fs')

let content = fs.readFileSync('./assets/stylesheet.css').toString()
  , checksum = sha1(content)

content = content.replace(/url\(\/images\/([^.]+)\.([a-z]+)\)/g, (all, filename, extension) => {
  let checksum = sha1(fs.readFileSync(`./assets/images/${filename}.${extension}`))
  return `url(/assets/images/${filename}--${checksum}.${extension})`
})

let scriptsList = [
      'jquery',
      'fastclick',
      'instantclick',
      'instantclick-loading-indicator',
      'app',
    ]
  , scripts = {}

for (let script of scriptsList) {
  scripts[script] = sha1(fs.readFileSync(`./assets/scripts/${script}.js`).toString())
}

module.exports = {
  css: {
    content,
    checksum,
  },
  scripts,
}
