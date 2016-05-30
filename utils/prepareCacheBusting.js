var sha1 = require('sha1')
  , fs = require('fs')

let content = fs.readFileSync('./assets/stylesheet.css').toString()
  , checksum = sha1(content)

content = content.replace(/url\(\/images\/([^.]+)\.([a-z]+)\)/g, (all, filename, extension) => {
  let checksum = sha1(fs.readFileSync(`./assets/images/${filename}.${extension}`))
  return `url(/assets/images/${filename}--${checksum}.${extension})`
})

module.exports = {
  css: {
    content,
    checksum,
  },
}
