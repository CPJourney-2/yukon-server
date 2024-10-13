ALTER TABLE `user_puffles`
    ADD COLUMN `postcard_hungry` TINYINT NOT NULL DEFAULT 0 AFTER `last_slept`;