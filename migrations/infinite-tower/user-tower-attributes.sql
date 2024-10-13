ALTER TABLE `users`
	ADD COLUMN `inf_skill_points` TINYINT NOT NULL DEFAULT 0 AFTER `igloo_slot`,
	ADD COLUMN `highest_floor_reached` SMALLINT NOT NULL DEFAULT 0 AFTER `inf_skill_points`;