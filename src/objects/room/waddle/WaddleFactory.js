import CardJitsuWaddle from "./CardJitsuWaddle"

export default class WaddleFactory {

    static types = {
        'card': CardJitsuWaddle,
    }

    static createWaddle(waddle, room, handler) {
        if (!this.types[waddle.game]) {
            throw new Error(`[ERROR] No waddle handler defined for ${waddle.game} in WaddleFactory.js`)
        }

        return new this.types[waddle.game](waddle, room, handler)
    }

}
