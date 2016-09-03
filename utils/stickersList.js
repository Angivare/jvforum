let sha1 = require('sha1')
  , fs = require('fs')

/* Values, like 'pose', are transformed into an object below this list, it becomes {code: 'pose', checksum: '…'} */
let stickersList = {
  'hap': {
    '1kki': 'pose',
    '1kkn': 'prof',
    '1kkh': 'ananas',
    '1kkl': 'plage',
    '1kkm': 'onche',
    '1kkk': 'pls2',
    '1kkg': 'flaque',
    '1kkj': 'btg2',
  },
  'noel': {
    '1kks': 'pls',
    '1kkq': 'continue',
    '1kkt': 'haha',
    '1kkp': 'nudiste',
    '1kku': 'panache',
    '1kkr': 'bonnet',
    '1kkv': 'btg',
    '1kko': 'masque',
  },
  'bridgely': {
    '1jnj': 'billets',
    '1jnc': 'hahaha',
    '1jnh': 'perplexe',
    '1jng': 'furie',
    '1jnf': 'cigare',
    '1jni': 'dehors2',
    '1jne': 'hein',
    '1jnd': 'malin',
  },
  'lamasticot': {
    '1kgx': 'emo',
    '1kh1': 'laser',
    '1kgz': 'jesus',
    '1kgv': 'racaille',
    '1kgw': 'btg3',
    '1kgy': 'couronne',
    '1kgu': 'flamme',
    '1kh0': 'pls3',
  },
  'grukk': {
    '1lgd': 'fort',
    '1lgc': 'question2',
    '1lgf': 'combat',
    '1lgb': 'grogne',
    '1lgh': 'grukk',
    '1lgg': 'hun',
    '1lga': 'trance',
    '1lge': 'pouce',
  },
  'bud': {
    'zu6': 'oklm',
    '1f8e': 'oklm2',
    '1f89': 'poker',
    'zuc': '+2',
    'zu2': 'hahah',
    '1f8a': 'dur',
    'zub': 'hin',
    'zua': 'zzz',
    'zu9': 'grr',
    'zu8': 'oh',
    '1f8d': 'argh',
    '1f8b': '5min',
    '1f8f': 'bbq',
    '1f88': 'sup',
    'zu7': 'burp',
    '1f8c': 'colis',
  },
  'domdevill': {
    '1ljl': 'chevalier',
    '1ljj': 'hop',
    '1ljm': 'bide',
    '1ljn': 'photo',
    '1ljo': 'bescherelle',
    '1ljp': '+1',
    '1ljr': 'master',
    '1ljq': 'thug',
  },
  'duracell': {
    '1jc3-fr': 'salut2',
    '1jc5': 'love',
    '1li5': 'gg',
    '1leb': 'tchin',
    '1jcg': 'jmec',
    '1jch': 'hahaha2',
    '1li4': 'star',
    '1jcl': 'aide',
    '1leq-fr': 'vacances',
    '1lej-fr': 'joel',
    '1li3': 'ba',
  },
  'rex-ryder': {
    '1lmd': 'boom',
    '1lmb': 'hahaha3',
    '1lm9': 'ok2',
    '1lmf': 'burger',
    '1lmc': 'deprime',
    '1lme': 'regard',
    '1lmg': 'chasse',
    '1lma': 'attaque',
  },
  'saumonarcenciel': {
    '1lmj': 'pote',
    '1lmk': 'triste',
    '1lmh': 'cute2',
    '1lmi': 'sombrero',
    '1lml': 'sleep2',
    '1lmm': 'hotte',
    '1lmo': 'titeuf',
    '1lmp': 'wc',
    '1lmn': 'hey',
    '1mqv': 'magie',
    '1mqw': 'popcorn',
    '1mqx': 'yay',
    '1mqy': 'feed',
    '1mqz': 'gomuscu',
    '1mr0': 'famoso',
    '1mr1': 'kebab',
  },
  'fluffy': {
    '1kl6': 'fete2',
    '1kl8': 'coeur2',
    '1klb': 'coeur3',
    '1kl1': 'koi',
    '1kl9': 'joue',
    '1kl7': 'cadeau',
    '1kl5': 'sleep3',
    '1kl2': 'heureux',
    '1kl3': 'blase',
    '1kky': 'dur2',
    '1kkz': 'dur3',
    '1kla': 'dur4',
    '1kl4': 'queue',
    '1kl0': 'nn',
  },
  'xmen': {
    '1mig-fr': 'xsalut',
    '1mij-fr': 'xwtf',
    '1mio': 'xmerci',
    '1mik': 'xaide',
    '1mih-fr': 'xprends',
    '1min': 'xwhy',
    '1mim': 'xjrv',
    '1mil': 'xcparti',
    '1mie-fr': 'xmv',
    '1mid-fr': 'xpptoi',
    '1mii-fr': 'xx',
    '1mif': 'xy',
    '1mip': 'xx2',
    '1miq': 'xy2',
    '1mir': 'xpub',
  },
  'xbox': {
    '1myf': 'yeah',
    '1my7': 'thugx',
    '1my6': 'super',
    '1myc': 'faim',
    '1my9': 'hahax',
    '1myb': 'ggx',
    '1mye': 'wtf',
    '1myx': 'mercix',
    '1myd': 'np',
    '1my4': 'oqp',
    '1my8': 'jrv',
    '1mya': 'quoi',
    '1my5': 'cpa',
  },
  'store': {
    '1n2c': 'store1',
    '1n2d': 'store2',
    '1n2g': 'store3',
    '1n2h': 'store4',
    '1n2i': 'store5',
    '1n2j': 'store6',
    '1n2k': 'store7',
    '1n2l': 'store8',
    '1n2m': 'store9',
    '1n2n': 'store10',
    '1n2o': 'store11',
  },
  'foot': {
    '1n1m-fr': 'allez',
    '1n1m': 'allez',
    '1n6i': 'allez',
    '1n1n-fr': 'but',
    '1n1n': 'but',
    '1n6l': 'but',
    '1n1o-fr': 'deprime2',
    '1n1o': 'deprime2',
    '1n6k': 'deprime2',
    '1n1p-fr': 'yeah3',
    '1n1p': 'yeah3',
    '1n6j': 'yeah3',
    '1n1q-fr': 'ohhh',
    '1n1q': 'ohhh',
    '1n6o': 'ohhh',
    '1n1r-fr': 'yeah2',
    '1n1r': 'yeah2',
    '1n6m': 'yeah2',
    '1n1s': 'carton',
    '1n1t-fr': 'victoire',
    '1n1t': 'victoire',
    '1n6n': 'victoire',
    '1n6b': 'los',
    '1n6c': 'deprime2de',
    '1n6d': 'yeah3de',
    '1n6e': 'tor',
    '1n6f': 'was',
    '1n6g': 'sieg',
    '1n6h': 'hurra',
    '1n6q': 'gooolit',
    '1n6r': 'yeah3it',
    '1n6s': 'deprime2it',
    '1n6t': 'forza',
    '1n6u': 'evviva',
    '1n6v': 'vittoria',
    '1n6w': 'madai',
    '1n6x': 'goooles',
    '1n6y': 'deprime2es',
    '1n6z': 'yeah3es',
    '1n70': 'vamos',
    '1n71': 'que',
    '1n72': 'yeah2es',
    '1n73': 'victoria',
  },
}

for (let category in stickersList) {
  for (let id in stickersList[category]) {
    let code = stickersList[category][id]
      , checksum = sha1(fs.readFileSync(`./assets/images/stickers/140/${code}.png`)).substr(0, 8)
    stickersList[category][id] = {
      code,
      checksum,
    }
  }
}

module.exports = stickersList
