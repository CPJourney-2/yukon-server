-- MariaDB dump 10.19-11.3.2-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: cpj
-- ------------------------------------------------------
-- Server version	11.3.2-MariaDB-1:11.3.2+maria~ubu2204

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `admin_users`
--

DROP TABLE IF EXISTS `admin_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `admin_users` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `email` varchar(254) NOT NULL,
  `secret` varchar(255) DEFAULT NULL,
  `userId` int(10) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `auth_tokens`
--

DROP TABLE IF EXISTS `auth_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `auth_tokens` (
  `userId` int(11) NOT NULL,
  `selector` char(36) NOT NULL,
  `validator` char(60) NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`userId`,`selector`) USING BTREE,
  CONSTRAINT `auth_tokens_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci COMMENT='Authentication tokens for saved logins';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bans`
--

DROP TABLE IF EXISTS `bans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `bans` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `issued` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `expires` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `moderatorId` int(11) DEFAULT NULL,
  `message` varchar(60) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  KEY `moderatorId` (`moderatorId`),
  CONSTRAINT `bans_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `bans_ibfk_2` FOREIGN KEY (`moderatorId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=12625 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci COMMENT='User ban records';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `buddies`
--

DROP TABLE IF EXISTS `buddies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `buddies` (
  `userId` int(11) NOT NULL,
  `buddyId` int(11) NOT NULL,
  `favorite` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`userId`,`buddyId`) USING BTREE,
  KEY `buddies_ibfk_2` (`buddyId`),
  CONSTRAINT `buddies_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `buddies_ibfk_2` FOREIGN KEY (`buddyId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci COMMENT='User buddies';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `buddy_requests`
--

DROP TABLE IF EXISTS `buddy_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `buddy_requests` (
  `senderId` int(11) NOT NULL,
  `recipientId` int(11) NOT NULL,
  `seen` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`senderId`,`recipientId`) USING BTREE,
  KEY `buddy_requests_ibfk_2` (`recipientId`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci COMMENT='Friend requests that are pending';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cards`
--

DROP TABLE IF EXISTS `cards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cards` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `cardId` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `userId_idx` (`userId`),
  CONSTRAINT `userId` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1064923 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `donation_master_count`
--

DROP TABLE IF EXISTS `donation_master_count`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `donation_master_count` (
  `category` int(11) NOT NULL DEFAULT 1,
  `total` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci COMMENT='Grand totals for CFC donations';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `email_tokens`
--

DROP TABLE IF EXISTS `email_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `email_tokens` (
  `userId` int(10) NOT NULL,
  `token` varchar(45) NOT NULL,
  `timeSent` int(10) NOT NULL,
  PRIMARY KEY (`userId`,`token`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fingerprints`
--

DROP TABLE IF EXISTS `fingerprints`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `fingerprints` (
  `userId` int(11) NOT NULL,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ip` varchar(45) NOT NULL,
  `secret` varchar(32) NOT NULL,
  `time` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`userId`,`id`) USING BTREE,
  KEY `id` (`id`),
  KEY `ip` (`ip`),
  KEY `secret` (`secret`),
  KEY `userId` (`userId`,`ip`,`secret`),
  CONSTRAINT `fingerprints_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1007658 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci COMMENT='Fingerprints for IP bans';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `flooring_inventories`
--

DROP TABLE IF EXISTS `flooring_inventories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `flooring_inventories` (
  `userId` int(10) NOT NULL,
  `flooringId` int(10) NOT NULL,
  PRIMARY KEY (`userId`,`flooringId`) USING BTREE,
  CONSTRAINT `userId_flooring_to_users` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `furniture_inventories`
--

DROP TABLE IF EXISTS `furniture_inventories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `furniture_inventories` (
  `userId` int(11) NOT NULL,
  `itemId` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  PRIMARY KEY (`userId`,`itemId`) USING BTREE,
  CONSTRAINT `furniture_inventories_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci COMMENT='User owned furniture';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `furnitures`
--

DROP TABLE IF EXISTS `furnitures`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `furnitures` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `furnitureId` int(11) NOT NULL,
  `x` smallint(6) NOT NULL DEFAULT 0,
  `y` smallint(6) NOT NULL DEFAULT 0,
  `rotation` smallint(6) NOT NULL DEFAULT 1,
  `frame` smallint(6) NOT NULL DEFAULT 1,
  `slot` int(11) NOT NULL DEFAULT 0,
  `depth` smallint(5) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`) USING BTREE,
  CONSTRAINT `furnitures_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=56465778 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci COMMENT='Furniture placed inside igloos';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `igloo_inventories`
--

DROP TABLE IF EXISTS `igloo_inventories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `igloo_inventories` (
  `userId` int(11) NOT NULL,
  `iglooId` int(11) NOT NULL,
  PRIMARY KEY (`userId`,`iglooId`) USING BTREE,
  CONSTRAINT `igloo_inventories_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci COMMENT='User owned igloos';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `igloo_likes`
--

DROP TABLE IF EXISTS `igloo_likes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `igloo_likes` (
  `userID` int(11) NOT NULL DEFAULT 1,
  `likerID` int(11) NOT NULL DEFAULT 1,
  `slotID` int(11) NOT NULL DEFAULT 0,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`userID`,`likerID`,`slotID`),
  KEY `likerID` (`likerID`),
  CONSTRAINT `userID_fk` FOREIGN KEY (`userID`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `igloos`
--

DROP TABLE IF EXISTS `igloos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `igloos` (
  `userId` int(11) NOT NULL,
  `slot` int(11) NOT NULL DEFAULT 0,
  `type` int(11) NOT NULL DEFAULT 1,
  `flooring` int(11) NOT NULL DEFAULT 0,
  `music` int(11) NOT NULL DEFAULT 0,
  `location` int(11) NOT NULL DEFAULT 1,
  `locked` tinyint(1) NOT NULL DEFAULT 1,
  `boundaries` tinyint(1) NOT NULL DEFAULT 0,
  `iglooUpdated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`userId`,`slot`),
  CONSTRAINT `igloos_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci COMMENT='User igloo settings';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ignores`
--

DROP TABLE IF EXISTS `ignores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ignores` (
  `userId` int(11) NOT NULL,
  `ignoreId` int(11) NOT NULL,
  PRIMARY KEY (`userId`,`ignoreId`) USING BTREE,
  KEY `ignores_ibfk_2` (`ignoreId`),
  CONSTRAINT `ignores_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ignores_ibfk_2` FOREIGN KEY (`ignoreId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci COMMENT='User ignores';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inventories`
--

DROP TABLE IF EXISTS `inventories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventories` (
  `userId` int(11) NOT NULL,
  `itemId` int(11) NOT NULL,
  PRIMARY KEY (`userId`,`itemId`) USING BTREE,
  CONSTRAINT `inventories_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci COMMENT='User owned clothing';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `location_inventories`
--

DROP TABLE IF EXISTS `location_inventories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `location_inventories` (
  `userId` int(11) NOT NULL,
  `locationId` int(11) NOT NULL,
  PRIMARY KEY (`userId`,`locationId`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci COMMENT='User owned igloo locations';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mascots`
--

DROP TABLE IF EXISTS `mascots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mascots` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `giveaway` int(11) DEFAULT NULL,
  `stamp` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  CONSTRAINT `FK__users` FOREIGN KEY (`id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `music_inventories`
--

DROP TABLE IF EXISTS `music_inventories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `music_inventories` (
  `userId` int(10) NOT NULL,
  `musicId` int(10) NOT NULL,
  PRIMARY KEY (`userId`,`musicId`) USING BTREE,
  CONSTRAINT `music_user_to_users` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mutes`
--

DROP TABLE IF EXISTS `mutes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mutes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `issued` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `expires` timestamp NOT NULL DEFAULT '2023-02-05 00:00:00',
  `moderatorId` int(11) DEFAULT NULL,
  `message` varchar(60) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  KEY `moderatorId` (`moderatorId`),
  CONSTRAINT `mutes_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `mutes_ibfk_2` FOREIGN KEY (`moderatorId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3031 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci COMMENT='User mute records';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `outfits`
--

DROP TABLE IF EXISTS `outfits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `outfits` (
  `userID` int(11) NOT NULL,
  `slot` int(11) NOT NULL,
  `head` varchar(45) NOT NULL DEFAULT '0',
  `face` varchar(45) NOT NULL DEFAULT '0',
  `neck` varchar(45) NOT NULL DEFAULT '0',
  `body` varchar(45) NOT NULL DEFAULT '0',
  `hand` varchar(45) NOT NULL DEFAULT '0',
  `feet` varchar(45) NOT NULL DEFAULT '0',
  `photo` varchar(45) NOT NULL DEFAULT '0',
  `color` varchar(45) NOT NULL DEFAULT '0',
  `flag` varchar(45) NOT NULL DEFAULT '0',
  PRIMARY KEY (`userID`,`slot`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `popup_interactions`
--

DROP TABLE IF EXISTS `popup_interactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `popup_interactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `popupName` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  CONSTRAINT `popup_interactions_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11805 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
--
-- Table structure for table `postcards`
--

DROP TABLE IF EXISTS `postcards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `postcards` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `senderId` int(11) NOT NULL,
  `recipientId` int(11) NOT NULL,
  `postcardId` int(11) NOT NULL,
  `extra` varchar(20) DEFAULT NULL,
  `date` timestamp NOT NULL DEFAULT current_timestamp(),
  `seen` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `postcards_ibfk_1` (`senderId`),
  KEY `postcards_ibfk_2` (`recipientId`),
  CONSTRAINT `postcards_ibfk_1` FOREIGN KEY (`senderId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `postcards_ibfk_2` FOREIGN KEY (`recipientId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=630123 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci COMMENT='Received postcards';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `reports`
--

DROP TABLE IF EXISTS `reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `reports` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `datetime` timestamp NOT NULL DEFAULT current_timestamp(),
  `reportedId` int(10) NOT NULL DEFAULT 0,
  `reportedById` int(10) NOT NULL DEFAULT 0,
  `room` varchar(50) NOT NULL DEFAULT '0',
  `reason` varchar(250) NOT NULL DEFAULT '0',
  `message` varchar(250) DEFAULT NULL,
  `resolved` tinyint(3) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=13657 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `scavenger_items`
--

DROP TABLE IF EXISTS `scavenger_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `scavenger_items` (
  `userId` int(11) NOT NULL,
  `item` int(11) NOT NULL,
  `hunt` int(11) NOT NULL,
  PRIMARY KEY (`userId`,`item`,`hunt`) USING BTREE,
  CONSTRAINT `scavenger_items_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci COMMENT='Scavenger Hunt Collected Items';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `stampbook_stamps`
--

DROP TABLE IF EXISTS `stampbook_stamps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stampbook_stamps` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `stampId` int(11) NOT NULL DEFAULT 0,
  `itemId` int(11) NOT NULL DEFAULT 0,
  `x` smallint(6) NOT NULL DEFAULT 0,
  `y` smallint(6) NOT NULL DEFAULT 0,
  `rotation` float NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`) USING BTREE,
  CONSTRAINT `stampbook_stamps_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=503135 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci COMMENT='Stamps placed inside stampbooks';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `stampbooks`
--

DROP TABLE IF EXISTS `stampbooks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stampbooks` (
  `userId` int(11) NOT NULL,
  `colour` int(11) NOT NULL DEFAULT 1,
  `clasp` int(11) NOT NULL DEFAULT 1,
  `highlight` int(11) NOT NULL DEFAULT 1,
  `pattern` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`userId`),
  CONSTRAINT `stampbooks_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci COMMENT='User stampbook settings';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `stamps`
--

DROP TABLE IF EXISTS `stamps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stamps` (
  `userId` int(11) NOT NULL,
  `stampId` int(11) NOT NULL,
  `seen` tinyint(4) NOT NULL DEFAULT 0,
  PRIMARY KEY (`userId`,`stampId`) USING BTREE,
  CONSTRAINT `stamps_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci COMMENT='Awarded stamps';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_donations`
--

DROP TABLE IF EXISTS `user_donations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_donations` (
  `userId` int(11) NOT NULL,
  `donationTotal` int(11) NOT NULL DEFAULT 0,
  `donationCooldown` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  PRIMARY KEY (`userId`),
  CONSTRAINT `user_donations_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_notes`
--

DROP TABLE IF EXISTS `user_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_notes` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  `moderatorId` int(10) NOT NULL DEFAULT 0,
  `userId` int(10) NOT NULL DEFAULT 0,
  `message` varchar(250) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_puffles`
--

DROP TABLE IF EXISTS `user_puffles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_puffles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `type` int(11) NOT NULL,
  `name` varchar(25) NOT NULL,
  `energy` int(11) NOT NULL DEFAULT 100,
  `health` int(11) NOT NULL DEFAULT 100,
  `rest` int(11) NOT NULL DEFAULT 100,
  `adoption_date` datetime NOT NULL DEFAULT current_timestamp(),
  `last_feed` datetime NOT NULL DEFAULT current_timestamp(),
  `last_slept` datetime NOT NULL DEFAULT current_timestamp(),
  `postcard_hungry` tinyint(4) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=165609 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_quests`
--

DROP TABLE IF EXISTS `user_quests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_quests` (
  `questId` int(10) NOT NULL,
  `partyId` int(10) NOT NULL,
  `userId` int(10) NOT NULL,
  `datetime` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`questId`,`partyId`,`userId`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_tickets`
--

DROP TABLE IF EXISTS `user_tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_tickets` (
  `userId` int(11) NOT NULL,
  `tickets` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`userId`),
  CONSTRAINT `user_tickets_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_trivia`
--

DROP TABLE IF EXISTS `user_trivia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_trivia` (
  `userId` int(11) NOT NULL,
  `roomId` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`userId`,`roomId`),
  CONSTRAINT `user_trivia_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_unlocks`
--

DROP TABLE IF EXISTS `user_unlocks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_unlocks` (
  `userId` int(11) NOT NULL,
  `code` varchar(45) DEFAULT NULL,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=89311 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(13) NOT NULL,
  `email` varchar(254) DEFAULT NULL,
  `password` char(60) NOT NULL,
  `loginKey` text DEFAULT NULL,
  `rank` tinyint(1) NOT NULL DEFAULT 1,
  `streamer` tinyint(1) NOT NULL DEFAULT 0,
  `permaBan` tinyint(1) NOT NULL DEFAULT 0,
  `muted` tinyint(1) NOT NULL DEFAULT 0,
  `ipBan` tinyint(4) NOT NULL DEFAULT 0,
  `joinTime` timestamp NOT NULL DEFAULT current_timestamp(),
  `coins` int(11) NOT NULL DEFAULT 500,
  `gems` int(11) NOT NULL DEFAULT 0,
  `partyCoins` int(11) NOT NULL DEFAULT 0,
  `head` int(11) NOT NULL DEFAULT 0,
  `face` int(11) NOT NULL DEFAULT 0,
  `neck` int(11) NOT NULL DEFAULT 0,
  `body` int(11) NOT NULL DEFAULT 0,
  `hand` int(11) NOT NULL DEFAULT 0,
  `feet` int(11) NOT NULL DEFAULT 0,
  `color` int(11) NOT NULL DEFAULT 1,
  `photo` int(11) NOT NULL DEFAULT 0,
  `flag` int(11) NOT NULL DEFAULT 0,
  `transform` int(11) NOT NULL DEFAULT 0,
  `username_verified` tinyint(4) NOT NULL DEFAULT 0,
  `username_rejected` tinyint(4) NOT NULL DEFAULT 0,
  `email_verified` tinyint(1) NOT NULL DEFAULT 0,
  `walking` int(11) NOT NULL DEFAULT 0,
  `lastLogin` timestamp NULL DEFAULT NULL,
  `cj_xp` int(11) NOT NULL DEFAULT 0,
  `cj_belt` varchar(50) DEFAULT NULL,
  `cj_wins` int(11) NOT NULL DEFAULT 0,
  `presents_collected` tinyint(1) NOT NULL DEFAULT 0,
  `color_vote` tinyint(11) NOT NULL DEFAULT 0,
  `igloo_contest` tinyint(1) NOT NULL DEFAULT 0,
  `igloo_slot` int(11) NOT NULL DEFAULT 0,
  `inf_skill_points` tinyint(4) NOT NULL DEFAULT 0,
  `highest_floor_reached` smallint(6) NOT NULL DEFAULT 0,
  `pirate_status` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`) USING BTREE,
  KEY `color_vote` (`color_vote`)
) ENGINE=InnoDB AUTO_INCREMENT=197142 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci COMMENT='Users';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trigger_users_insert` AFTER INSERT ON `users` FOR EACH ROW BEGIN
  INSERT INTO igloos (userId) VALUES (NEW.id);
  INSERT INTO inventories (userId, itemId) VALUES (NEW.id, NEW.color);
  INSERT INTO igloo_inventories (userId, iglooId) VALUES (NEW.id, 0);
  INSERT INTO igloo_inventories (userId, iglooId) VALUES (NEW.id, 1);
  INSERT INTO flooring_inventories (userId, flooringId) VALUES (NEW.id, 0);
  INSERT INTO location_inventories (userId, locationId) VALUES (NEW.id, 1);
  INSERT INTO music_inventories (userId, musicId) VALUES (NEW.id, 0);
  INSERT INTO stampbooks (userId) VALUES (NEW.id);
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `worlds`
--

DROP TABLE IF EXISTS `worlds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `worlds` (
  `id` varchar(100) NOT NULL,
  `population` smallint(3) NOT NULL DEFAULT 0,
  `staffOnly` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci COMMENT='Server populations';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping routines for database 'cpj'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2024-08-16  9:22:46
