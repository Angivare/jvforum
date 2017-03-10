let fs = require('fs')
  , dot = require('dot')

let views = {}
;['home', 'topic', 'forum', 'stickers', 'forum_search', 'profile'].forEach((view) => {
  views[view] = fs.readFileSync(`views/${view}.html`)
})

let partials = {}
;['layoutHead', 'layoutFoot', 'header', 'topicMessages', 'topicPagination'].forEach((partial) => {
  partials[partial] = fs.readFileSync(`views/partials/${partial}.html`)
})

function render(view, locals) {
  let dotFunction = dot.compile(views[view], partials)
  return dotFunction(locals)
}

module.exports = render
