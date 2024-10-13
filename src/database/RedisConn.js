import {createClient} from "redis";

export default class RedisConn {
    constructor(config) {
        this.config = config;
        this.redisClient = null;
        this.redisSub = null;
    }

    setup(server) {
        this.server = server;
        if (this.config.sentinel && this.config.sentinel.REDIS_URL) {
            this.redisClient = createClient({url: this.config.sentinel.REDIS_URL});
            this.redisSub = createClient({url: this.config.sentinel.REDIS_URL});
            this.init();
        }
    }

    async init() {
        if (!this.redisClient) {
            return;
        }

        await this.redisClient.connect();
        await this.redisSub.connect();

        this.redisSub.subscribe("player-disconnect", async (message) => {
            if (this.server.handler.id == 'Login') return

            const data = JSON.parse(message);
            const origin = data.origin;
            const userId = data.userId;
            const reason = data.reason;

            console.log(`Disconnect called for ${data.userId}`)

            const user = this.server.handler.usersById[userId];
            if (!user) {
                return;
            }

            if (origin !== this.server.id) {
                user.send('close_with_error', {error: `${reason}`})
                await user.close();
            }
        });

        this.redisSub.subscribe("igloo-refresh", async (message) => {
            if (this.server.handler.id == 'Login') return

            const data = JSON.parse(message);
            const origin = data.origin;
            const reason = data.reason;
            const userId = data.userId;
            const slot = data.slot;

            if(this.server.handler.id == origin) return

            let iglooId = userId + this.server.config.game.iglooIdOffset;
            if(this.server.handler.rooms[iglooId]) {
                this.server.handler.rooms[iglooId].changeIgloo(slot, undefined, true)
            }

            const user = this.server.handler.usersById[userId];
            if (user) {
                user.igloo_slot = slot
                //db update is assumed to be done in origin!!!
            }

            //console.log(`Should refresh igloo for user ${userId} ${origin} ${reason} ${slot}`)
        });

        console.log("[Redis] Connected to cluster!");
    }
}
