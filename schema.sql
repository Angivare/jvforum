CREATE TABLE `cache` (
  `id` varchar(128) NOT NULL,
  `content` mediumtext NOT NULL,
  `fetchedAt` bigint NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `forums` (
  `id` mediumint NOT NULL,
  `name` varchar(256) NOT NULL,
  `slug` varchar(256) NOT NULL,
  `isLocked` tinyint NOT NULL,
  `parentId` mediumint NOT NULL,
  `subforumsIds` varchar(1024) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `avatars` (
  `nickname` varchar(16) NOT NULL,
  `url` varchar(128) NOT NULL,
  PRIMARY KEY (`nickname`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `messages_posted` (
  `id` int NOT NULL AUTO_INCREMENT,
  `authorId` int NOT NULL,
  `messageId` int DEFAULT NULL,
  `postedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `isTopic` tinyint NOT NULL,
  `forumId` int NOT NULL,
  `topicMode` tinyint NOT NULL,
  `topicIdLegacyOrModern` int NOT NULL,
  `ipAddress` varchar(45) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `users` (
  `id` mediumint NOT NULL AUTO_INCREMENT,
  `nickname` varchar(15) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `logins` (
  `loggedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `nickname` varchar(16) NOT NULL,
  `jvcLoginId` int,
  `error` varchar(1024)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `favorites` (
  `userId` int unsigned NOT NULL,
  `forums` mediumtext NOT NULL,
  `topics` mediumtext NOT NULL,
  `updatedAt` int NOT NULL,
  PRIMARY KEY (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
