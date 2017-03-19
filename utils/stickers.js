let db = require('./db')

let packs = {}
  , packFromId = {}
  , jvcToJvf = {}
  , jvfToJvc = {}
  , memorableCodes = {}
  , memorableCodesIndices = {}

db.query(`SELECT id, name FROM stickerPacks ORDER BY id`, null, (results) => {
  if (!results) {
    throw 'stickerPacks table empty'
  }
  results.forEach((result) => {
    packs[result.id] = result.name
  })
})

db.query(`SELECT jvfId, jvcId, packId, memorableCode FROM stickers ORDER BY jvfId`, null, (results) => {
  if (!results) {
    throw 'stickers table empty'
  }
  results.forEach((result) => {
    packFromId[result.jvfId] = result.packId
    jvcToJvf[result.jvcId] = result.jvfId
    jvfToJvc[result.jvfId] = result.jvcId
    if (result.memorableCode) {
      memorableCodes[result.memorableCode] = result.jvfId
      memorableCodesIndices[result.jvfId] = result.memorableCode
    }
  })
})

module.exports = {
  packs,
  packFromId,
  jvcToJvf,
  jvfToJvc,
  memorableCodes,
  memorableCodesIndices,
}
