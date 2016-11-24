let sha1 = require('sha1')
  , fs = require('fs')

let content = fs.readFileSync('./assets/stylesheet.css').toString()
  , checksum = sha1(content).substr(0, 8)

content = content.replace(/url\(\/images\/([^.]+)\.([a-z]+)\)/g, (all, filename, extension) => {
  let checksum = sha1(fs.readFileSync(`./assets/images/${filename}.${extension}`)).substr(0, 8)
  return `url(/assets/images/${filename}--${checksum}.${extension})`
})

let scriptsList = [
      'instantclick',
      'loading-indicator',
      'jquery',
      'jvcode',
      'main',
    ]
  , scripts = {}

for (let script of scriptsList) {
  scripts[script] = sha1(fs.readFileSync(`./assets/scripts/${script}.js`).toString()).substr(0, 8)
}

module.exports = {
  css: {
    content,
    checksum,
  },
  scripts,
}
