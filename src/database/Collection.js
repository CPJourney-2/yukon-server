export default class Collection {

    constructor(user, models, model, indexKey) {
        this.user = user
        this.indexKey = indexKey

        this.db = user.db
        this.model = user.db[model]
        this.handler = user.handler

        this.collection = {}

        this.collect(models)
    }

    collect(models) {
        for (let model of models) {
            this.collection[model[this.indexKey]] = model
        }
    }

    add(record, callback = () => {}, errorCallback = () => {}) {
        this.addImpl(record, callback, errorCallback)
    }

    addImpl(record, callback = () => {}, errorCallback = () => {}) {
        this.model.create(record)
            .then((model) => {
                this.collection[model[this.indexKey]] = model
                callback(model)
            })
            .catch((error) => {
                let errorId = error.stack.split(':')[0]
                if(errorId == "SequelizeConnectionAcquireTimeoutError" || errorId == "SequelizeConnectionRefusedError") {
                    console.log("Connection error, retrying in 10 seconds")
                    console.log(record)
                    setTimeout(() => this.addImpl(record, callback, errorCallback), 10000)
                }

                if(errorId != "SequelizeUniqueConstraintError") {
                    this.handler.error(error)
                    errorCallback(record)
                }
            })
    }

    remove(key) {
        this.collection[key].destroy()

        delete this.collection[key]
    }

    includes(key) {
        return key in this.collection
    }

    toJSON() {
        return Object.keys(this.collection).map(key => parseInt(key))
    }

}
