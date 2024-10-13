CREATE TABLE `user_quests` (
    `questId` INT(10) NOT NULL,
    `partyId` INT(10) NOT NULL,
    `userId` INT(10) NOT NULL,
    `datetime` TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`questId`, `partyId`, `userId`) USING BTREE
)
ENGINE=InnoDB
;