let db = require('./db')

let packs = {}
  , packFromId = {}
  , jvcToJvf = {}
  , jvfToJvc = {}

db.query(`SELECT id, name FROM stickerPacks ORDER BY id`, null, (results) => {
  if (!results) {
    throw 'stickerPacks table empty'
  }
  results.forEach((result) => {
    packs[result.id] = result.name
  })
})

db.query(`SELECT jvfId, jvcId, packId FROM stickers ORDER BY jvfId`, null, (results) => {
  if (!results) {
    throw 'stickers table empty'
  }
  results.forEach((result) => {
    packFromId[result.jvfId] = result.packId
    jvcToJvf[result.jvcId] = result.jvfId
    jvfToJvc[result.jvfId] = result.jvcId
  })
})

let legacyShortcuts = {
  'pose': 9,
  'prof': 10,
  'ananas': 12,
  'plage': 11,
  'onche': 15,
  'pls2': 16,
  'flaque': 14,
  'btg2': 13,
  'pls': 17,
  'continue': 19,
  'haha': 23,
  'nudiste': 21,
  'panache': 20,
  'bonnet': 18,
  'btg': 24,
  'masque': 22,
  'billets': 1,
  'hahaha': 5,
  'perplexe': 2,
  'furie': 6,
  'cigare': 3,
  'dehors2': 7,
  'hein': 4,
  'malin': 8,
  'emo': 77,
  'laser': 81,
  'jesus': 79,
  'racaille': 83,
  'btg3': 82,
  'couronne': 78,
  'flamme': 84,
  'pls3': 80,
  'fort': 85,
  'question2': 91,
  'combat': 89,
  'grogne': 90,
  'grukk': 88,
  'hun': 87,
  'trance': 92,
  'pouce': 86,
  'oklm': 138,
  'oklm2': 148,
  'poker': 143,
  '+2': 135,
  'hahah': 137,
  'dur': 144,
  'hin': 141,
  'zzz': 136,
  'grr': 140,
  'oh': 134,
  'argh': 147,
  '5min': 145,
  'bbq': 149,
  'sup': 142,
  'burp': 139,
  'colis': 146,
  'chevalier': 53,
  'hop': 49,
  'bide': 52,
  'photo': 51,
  'bescherelle': 54,
  '+1': 48,
  'master': 47,
  'thug': 50,
  'salut2': 156,
  'love': 153,
  'gg': 152,
  'tchin': 155,
  'jmec': 154,
  'hahaha2': 150,
  'star': 158,
  'aide': 151,
  'vacances': 159,
  'joel': 161,
  'ba': 163,
  'boom': 30,
  'hahaha3': 25,
  'ok2': 26,
  'burger': 32,
  'deprime': 27,
  'regard': 31,
  'chasse': 28,
  'attaque': 29,
  'pote': 63,
  'triste': 56,
  'cute2': 55,
  'sombrero': 68,
  'sleep2': 67,
  'hotte': 69,
  'titeuf': 70,
  'wc': 60,
  'hey': 66,
  'magie': 59,
  'popcorn': 62,
  'yay': 61,
  'feed': 71,
  'gomuscu': 65,
  'famoso': 57,
  'kebab': 64,
  'fete2': 37,
  'coeur2': 34,
  'coeur3': 33,
  'koi': 41,
  'joue': 35,
  'cadeau': 36,
  'sleep3': 38,
  'heureux': 40,
  'blase': 42,
  'dur2': 46,
  'dur3': 45,
  'dur4': 44,
  'queue': 39,
  'nn': 43,
  'allez': 105,
  'but': 109,
  'deprime2': 113,
  'yeah3': 117,
  'ohhh': 121,
  'yeah2': 125,
  'carton': 133,
  'victoire': 129,
  'forza': 107,
}

module.exports = {
  packs,
  packFromId,
  jvcToJvf,
  jvfToJvc,
  legacyShortcuts,
}
