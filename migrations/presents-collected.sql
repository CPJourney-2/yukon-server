
ALTER TABLE yukon.users 
ADD COLUMN presents_collected TINYINT(1) NOT NULL DEFAULT 0 AFTER igloo_slot;
