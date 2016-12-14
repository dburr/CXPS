-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               5.7.11 - MySQL Community Server (GPL)
-- Server OS:                    Win64
-- HeidiSQL Version:             9.4.0.5125
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;

-- Dumping structure for procedure cxps.resetDatabase
DROP PROCEDURE IF EXISTS `resetDatabase`;
DELIMITER //
CREATE PROCEDURE `resetDatabase`()
BEGIN
	DELETE FROM users;
	ALTER TABLE users AUTO_INCREMENT = 1;
	ALTER TABLE units AUTO_INCREMENT = 1;
END//
DELIMITER ;

-- Dumping structure for table cxps.server_settings
DROP TABLE IF EXISTS `server_settings`;
CREATE TABLE IF NOT EXISTS `server_settings` (
  `setting_name` varchar(24) COLLATE utf8_unicode_ci NOT NULL,
  `value` varchar(1024) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`setting_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Data exporting was unselected.
-- Dumping structure for table cxps.units
DROP TABLE IF EXISTS `units`;
CREATE TABLE IF NOT EXISTS `units` (
  `user_id` int(10) unsigned NOT NULL,
  `unit_owning_user_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `unit_id` smallint(5) unsigned NOT NULL DEFAULT '1',
  `exp` smallint(5) unsigned NOT NULL DEFAULT '0',
  `next_exp` smallint(5) unsigned NOT NULL DEFAULT '6',
  `level` tinyint(3) unsigned NOT NULL DEFAULT '1',
  `max_level` tinyint(3) unsigned NOT NULL DEFAULT '30',
  `rank` tinyint(1) unsigned NOT NULL DEFAULT '1',
  `max_rank` tinyint(1) unsigned NOT NULL DEFAULT '2',
  `love` smallint(4) unsigned NOT NULL DEFAULT '0',
  `max_love` smallint(4) unsigned NOT NULL DEFAULT '25',
  `unit_skill_level` tinyint(1) unsigned NOT NULL DEFAULT '0',
  `unit_skill_exp` smallint(5) unsigned NOT NULL DEFAULT '0',
  `max_hp` tinyint(2) unsigned NOT NULL DEFAULT '2',
  `removable_skill_capacity` tinyint(1) unsigned NOT NULL DEFAULT '0',
  `max_removable_skill_capacity` tinyint(1) unsigned NOT NULL DEFAULT '0',
  `favorite_flag` tinyint(1) unsigned NOT NULL DEFAULT '0',
  `display_rank` tinyint(1) unsigned NOT NULL DEFAULT '1',
  `deleted` tinyint(1) unsigned NOT NULL DEFAULT '0',
  `stat_smile` smallint(5) unsigned NOT NULL DEFAULT '0',
  `stat_pure` smallint(5) unsigned NOT NULL DEFAULT '0',
  `stat_cool` smallint(5) unsigned NOT NULL DEFAULT '0',
  `attribute` tinyint(1) unsigned NOT NULL DEFAULT '1',
  `insert_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`unit_owning_user_id`),
  KEY `fk_unit_owner` (`user_id`),
  CONSTRAINT `fk_unit_owner` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Data exporting was unselected.
-- Dumping structure for table cxps.users
DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `user_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(10) COLLATE utf8_unicode_ci NOT NULL DEFAULT 'No Name',
  `level` smallint(5) unsigned NOT NULL DEFAULT '2',
  `exp` mediumint(7) unsigned NOT NULL DEFAULT '5',
  `next_exp` mediumint(7) unsigned NOT NULL DEFAULT '6',
  `previous_exp` mediumint(7) unsigned NOT NULL DEFAULT '0',
  `game_coin` int(10) unsigned NOT NULL DEFAULT '500000',
  `sns_coin` int(10) unsigned NOT NULL DEFAULT '1000',
  `free_sns_coin` int(10) unsigned NOT NULL DEFAULT '1000',
  `paid_sns_coin` int(10) unsigned NOT NULL DEFAULT '0',
  `social_point` int(10) unsigned NOT NULL DEFAULT '500000',
  `unit_max` smallint(6) unsigned NOT NULL DEFAULT '120',
  `energy_max` smallint(5) unsigned NOT NULL DEFAULT '26',
  `energy_full_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `over_max_energy` smallint(5) unsigned NOT NULL DEFAULT '0',
  `friend_max` smallint(5) unsigned NOT NULL DEFAULT '10',
  `unlock_random_live_muse` tinyint(1) unsigned NOT NULL DEFAULT '0',
  `unlock_random_live_aqours` tinyint(1) unsigned NOT NULL DEFAULT '0',
  `insert_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `tutorial_state` tinyint(1) NOT NULL DEFAULT '0',
  `next_free_muse_gacha` bigint(20) unsigned NOT NULL DEFAULT '0',
  `next_free_aqours_gacha` bigint(20) unsigned NOT NULL DEFAULT '0',
  `setting_award_id` int(4) unsigned NOT NULL DEFAULT '1',
  `setting_background_id` int(4) unsigned NOT NULL DEFAULT '1',
  `main_deck` tinyint(1) unsigned NOT NULL DEFAULT '1',
  `partner_unit` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  KEY `user_partner` (`partner_unit`),
  CONSTRAINT `user_partner` FOREIGN KEY (`partner_unit`) REFERENCES `units` (`unit_owning_user_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Data exporting was unselected.
-- Dumping structure for table cxps.user_award_unlock
DROP TABLE IF EXISTS `user_award_unlock`;
CREATE TABLE IF NOT EXISTS `user_award_unlock` (
  `user_id` int(10) unsigned NOT NULL,
  `award_id` int(5) unsigned NOT NULL,
  `insert_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`,`award_id`),
  CONSTRAINT `FK_award_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Data exporting was unselected.
-- Dumping structure for table cxps.user_background_unlock
DROP TABLE IF EXISTS `user_background_unlock`;
CREATE TABLE IF NOT EXISTS `user_background_unlock` (
  `user_id` int(10) unsigned NOT NULL,
  `background_id` int(5) unsigned NOT NULL,
  `insert_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`,`background_id`),
  CONSTRAINT `FK_background_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Data exporting was unselected.
-- Dumping structure for table cxps.user_live_goal_rewards
DROP TABLE IF EXISTS `user_live_goal_rewards`;
CREATE TABLE IF NOT EXISTS `user_live_goal_rewards` (
  `user_id` int(10) unsigned NOT NULL,
  `live_goal_reward_id` int(10) unsigned NOT NULL,
  `live_difficulty_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`user_id`,`live_goal_reward_id`),
  CONSTRAINT `FK_user_live_goal_rewards` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Data exporting was unselected.
-- Dumping structure for table cxps.user_live_status
DROP TABLE IF EXISTS `user_live_status`;
CREATE TABLE IF NOT EXISTS `user_live_status` (
  `user_id` int(10) unsigned NOT NULL,
  `live_difficulty_id` int(10) unsigned NOT NULL,
  `status` int(4) unsigned NOT NULL DEFAULT '0',
  `hi_score` int(10) unsigned NOT NULL DEFAULT '0',
  `hi_combo` int(10) unsigned NOT NULL DEFAULT '0',
  `clear_cnt` int(10) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`user_id`,`live_difficulty_id`),
  CONSTRAINT `FK_user_live_status` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Data exporting was unselected.
-- Dumping structure for table cxps.user_login
DROP TABLE IF EXISTS `user_login`;
CREATE TABLE IF NOT EXISTS `user_login` (
  `user_id` int(10) unsigned NOT NULL,
  `login_key` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `login_passwd` varchar(128) COLLATE utf8_unicode_ci NOT NULL,
  `login_token` varchar(128) COLLATE utf8_unicode_ci DEFAULT NULL,
  UNIQUE KEY `UNIQUE_login_key` (`login_key`),
  KEY `FK_user_login` (`user_id`),
  CONSTRAINT `FK_user_login` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Data exporting was unselected.
-- Dumping structure for table cxps.user_unit_album
DROP TABLE IF EXISTS `user_unit_album`;
CREATE TABLE IF NOT EXISTS `user_unit_album` (
  `user_id` int(10) unsigned NOT NULL,
  `unit_id` int(10) unsigned NOT NULL,
  `rank_max_flag` tinyint(1) NOT NULL DEFAULT '0',
  `love_max_flag` tinyint(1) NOT NULL DEFAULT '0',
  `rank_level_max_flag` tinyint(1) NOT NULL DEFAULT '0',
  `all_max_flag` tinyint(1) NOT NULL DEFAULT '0',
  `highest_love_per_unit` smallint(5) unsigned NOT NULL DEFAULT '0',
  `total_love` int(10) unsigned NOT NULL DEFAULT '0',
  `favorite_point` int(10) unsigned NOT NULL,
  PRIMARY KEY (`user_id`,`unit_id`),
  CONSTRAINT `fk_album_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Data exporting was unselected.
-- Dumping structure for table cxps.user_unit_deck
DROP TABLE IF EXISTS `user_unit_deck`;
CREATE TABLE IF NOT EXISTS `user_unit_deck` (
  `user_id` int(10) unsigned NOT NULL,
  `unit_deck_id` tinyint(1) unsigned NOT NULL,
  `deck_name` varchar(10) COLLATE utf8_unicode_ci NOT NULL DEFAULT 'No Name',
  PRIMARY KEY (`user_id`,`unit_deck_id`),
  CONSTRAINT `fk_deck_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Data exporting was unselected.
-- Dumping structure for table cxps.user_unit_deck_slot
DROP TABLE IF EXISTS `user_unit_deck_slot`;
CREATE TABLE IF NOT EXISTS `user_unit_deck_slot` (
  `user_id` int(10) unsigned NOT NULL,
  `deck_id` tinyint(1) unsigned NOT NULL,
  `slot_id` tinyint(1) unsigned NOT NULL,
  `unit_owning_user_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`user_id`,`deck_id`,`slot_id`),
  UNIQUE KEY `unit_unique_per_deck` (`unit_owning_user_id`,`deck_id`),
  CONSTRAINT `fk_slot_deck` FOREIGN KEY (`user_id`, `deck_id`) REFERENCES `user_unit_deck` (`user_id`, `unit_deck_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_slot_unit` FOREIGN KEY (`unit_owning_user_id`) REFERENCES `units` (`unit_owning_user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Data exporting was unselected.
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IF(@OLD_FOREIGN_KEY_CHECKS IS NULL, 1, @OLD_FOREIGN_KEY_CHECKS) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
