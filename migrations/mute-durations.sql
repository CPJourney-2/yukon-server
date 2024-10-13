ALTER TABLE `mutes`
	ADD `expires` TIMESTAMP NOT NULL DEFAULT '2037-02-05 00:00:00' AFTER `issued`;

-- Add any missing user records that are perm muted
INSERT INTO mutes (userId, issued, expires, moderatorId, message) 
SELECT users.id, CURRENT_TIMESTAMP(), '2037-02-05 00:00:00', NULL,'UNKNOWN'
FROM users WHERE users.muted=1 AND users.id NOT IN (SELECT userId FROM mutes);
    
ALTER TABLE `mutes`
	ALTER `expires` SET DEFAULT '2023-02-05 00:00:00';