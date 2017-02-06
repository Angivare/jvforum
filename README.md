# JVForum

### Dépendances

- Node.js v6.2.*
- npm
- MySQL

### Installation et lancement

* Importez le contenu de `schema.sql` et `stickers.sql` dans une base de données MySQL
* `npm install`
* `cp config/example.js config/index.js`
* Configurez `databaseConnection` dans `config/index.js`
* `npm start`

Ouvrez ensuite <http://dev.jvforum.fr:3000>. Ce domaine pointe vers localhost et permet d’utiliser le captcha de JVC.
