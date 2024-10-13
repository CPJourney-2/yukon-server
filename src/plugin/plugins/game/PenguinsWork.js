import GamePlugin from '@plugin/GamePlugin';

export default class PenguinsWork extends GamePlugin {

    constructor(handler) {
        super(handler);
        this.events = {
            'work_fulfilled': this.fulfillWork,
            'work_picked': this.notifyPickup
        };

        this.minPayout = 30;
        this.maxPayout = 90;
    }

    getRandomPayout(x, y) {
        return Math.floor(Math.random() * (this.maxPayout - this.minPayout + 1)) + this.minPayout;
    }

    fulfillWork(args, user) {
        const room = user.room;
        if (!room) {
            console.log("User is not in a room");
            return;
        }

        const requesterId = user.workRequested;
        if (!requesterId) {
            return;
        }

        const requester = Object.values(room.users).find(u => u.id === requesterId);
        if (!requester) {
            user.jobCooldown = true;
            setTimeout(() => {
                user.jobCooldown = false;
            }, 5000);
            user.workRequested = null;
            return;
        }

        if (!room.jobRequests || !room.jobRequests[requesterId]) {
            user.jobCooldown = true;
            setTimeout(() => {
                user.jobCooldown = false;
            }, 5000);
            user.workRequested = null;
            return;
        }

        if (!room.jobRequests[requesterId].requestedUsers.has(user.id)) {
            user.jobCooldown = true;
            setTimeout(() => {
                user.jobCooldown = false;
            }, 5000);
            user.workRequested = null;
            return;
        }

        const payout = this.getRandomPayout(user.x, user.y);
        user.updateCoins(payout, false, null, false, true);
        user.workRequested = null;
        room.jobRequests[requesterId].requestedUsers.delete(user.id);

        user.jobCooldown = true;
        setTimeout(() => {
            user.jobCooldown = false;
        }, 5000);

        if (user.room.id === 330) {
            user.workFulfillments.pizzaServed++;
            if (user.workFulfillments.pizzaServed >= 5 && !user.stamps.includes(701)) {
                user.addStamp(701);
            } else if (user.workFulfillments.pizzaServed >= 20 && !user.stamps.includes(702)) {
                user.addStamp(702);
            } else if (user.workFulfillments.pizzaServed >= 50 && !user.stamps.includes(703)) {
                user.addStamp(703);
            }
            user.workFulfillments.coinsEarned.pizza += payout;
        } else if (user.room.id === 110) {
            user.workFulfillments.coffeeServed++;
            if (user.workFulfillments.coffeeServed >= 5 && !user.stamps.includes(704)) {
                user.addStamp(704);
            } else if (user.workFulfillments.coffeeServed >= 20 && !user.stamps.includes(705)) {
                user.addStamp(705);
            } else if (user.workFulfillments.coffeeServed >= 50 && !user.stamps.includes(706)) {
                user.addStamp(706);
            }
            user.workFulfillments.coinsEarned.coffee += payout;
        }
        if (Object.values(user.workFulfillments.coinsEarned).every(amount => amount >= 500) && !user.stamps.includes(712)) {
            user.addStamp(712);
        }

        if (Object.keys(this.handler.crumbs.penguins_work).includes(user.room.id.toString())) {
            requester.send('work_delivered', {
                workerId: user.id,
                deliveryX: args.deliveryX,
                deliveryY: args.deliveryY,
                frame: args.frame,
                animation: args.animation
            });
            if (requester.room.id === 330) {
                requester.workFulfillments.hasEaten.pizza = true;
            } else if (requester.room.id === 110) {
                requester.workFulfillments.hasEaten.coffee = true;
            }
            if (Object.values(requester.workFulfillments.hasEaten).every(ate => ate === true) && !requester.stamps.includes(711)) {
                requester.addStamp(711);
            }
        }

        if (!user.room.canSmile[user.id]) user.room.canSmile[user.id] = [];
        user.room.canSmile[user.id].push(requesterId);
        const userId = user.id
        setTimeout(() => {
            try {
                if (!room.canSmile) return;
                if (!room.canSmile[userId]) return;
                if (!room.canSmile[userId].includes(requesterId)) return;
                room.canSmile[userId] = room.canSmile[userId].filter(_id => _id !== requesterId);
                if (room.canSmile[userId].length < 1) delete room.canSmile[userId];
            } catch(e) {
                console.log(e)
                this.discord.errorAlert(e)
            }
        }, 10000);

        if (room.jobRequests[requesterId].requestedUsers.size === 0) {
            delete room.jobRequests[requesterId];
        }
    }

    notifyPickup(args, user) {
        const room = user.room;
        if (!room) {
            console.log("User not in a room");
            return;
        }

        const requesterId = user.workRequested;
        if (!requesterId) {
            console.log("User not assigned to a work request");
            return;
        }

        const requester = Object.values(room.users).find(u => u.id === requesterId);
        if (!requester) {
            console.log("Requester not found in room");
            return;
        }

        // Notify the requester that this chef has picked up the pizza
        requester.send('work_picked', {
            workerId: user.id,
            frame: args.frame // Send the frame with the pickup notification
        });
    }
}
