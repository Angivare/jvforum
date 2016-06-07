CREATE TABLE `messages_posted` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `authorId` int(11) NOT NULL,
  `messageId` int(11) DEFAULT NULL,
  `postedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `isTopic` tinyint(4) NOT NULL,
  `forumId` int(11) NOT NULL,
  `topicMode` tinyint(4) NOT NULL,
  `topicId` int(11) NOT NULL,
  `ipAddress` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
