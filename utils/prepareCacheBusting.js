var sha1 = require('sha1')
  , fs = require('fs')

let content = fs.readFileSync('./public/stylesheet.css').toString()
  , checksum = sha1(content)

content = content.replace(/url\(\/images\/([^.]+)\.([a-z]+)\)/g, (all, filename, extension) => {
  let checksum = sha1(fs.readFileSync(`./public/images/${filename}.${extension}`))
  return `url(/assets/images/${filename}--${checksum}.${extension})`
})

module.exports = {
  css: {
    content,
    checksum,
  },
}
