const config = require('./config/config.json')


let apps = Object.keys(config.worlds).map(world => {
    return {
        name: world,
        script: './dist/World.js',
        args: world,
        node_args: "--max-old-space-size=8192"
    }
})

module.exports = {
    apps: apps
}
