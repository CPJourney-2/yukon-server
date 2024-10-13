const fs = require('fs')
const path = require('path')


let files = fs.readdirSync(__dirname).filter(file => {
    return path.extname(file) == '.json'
})

for (let file of files) {
    exports[file.replace('.json', '')] = require(`./${file}`)
}


exports.reload = () => {
    for (let file of files) {
        delete require.cache[require.resolve(`./${file}`)]
        exports[file.replace('.json', '')] = require(`./${file}`)
    }
}