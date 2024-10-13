-- may be needed:
-- run this on prod i kill u
-- run in sql shell

SET SQL_SAFE_UPDATES = 0;

UPDATE `yukon`.`users` SET head = 0;


ALTER TABLE `yukon`.`users` 
CHANGE COLUMN `head` `head` INT NOT NULL DEFAULT '0' ;

SET SQL_SAFE_UPDATES = 1;