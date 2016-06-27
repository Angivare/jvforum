let fs = require('fs')
  , dot = require('dot')

let views = {}
;['topic'].forEach((view) => {
  views[view] = fs.readFileSync(`views/${view}.html`)
})

let partials = {}
;['layoutHead', 'layoutFoot', 'header', 'topicMessages', 'topicPagination'].forEach((partial) => {
  partials[partial] = fs.readFileSync(`views/includes/${partial}.html`)
})

function render(view, locals) {
  let dotFunction = dot.compile(views[view], partials)
  return dotFunction(locals)
}

module.exports = render
