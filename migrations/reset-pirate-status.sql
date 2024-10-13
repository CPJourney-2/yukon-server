-- the checkpoint system for veggie villian will reuse this, so it needs to be reset
-- if all pirate_status columns for your local users are 0, you don't need to run this
UPDATE users
SET pirate_status = 0;