ALTER TABLE `buddies` ADD `favorite` TINYINT(1) NOT NULL DEFAULT 0 AFTER `buddyId`;

CREATE TABLE `buddy_requests` (
  `senderId` int(11) NOT NULL,
  `recipientId` int(11) NOT NULL,
  `seen` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci COMMENT='Friend requests that are pending';

ALTER TABLE `buddy_requests`
  ADD PRIMARY KEY (`senderId`,`recipientId`) USING BTREE,
  ADD KEY `buddy_requests_ibfk_2` (`recipientId`);