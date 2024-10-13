ALTER TABLE `worlds`
    ADD `staffOnly` tinyint(1) NOT NULL DEFAULT 0 AFTER `population`;