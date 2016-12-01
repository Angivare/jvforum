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

CREATE TABLE `topics` (
  `idModern` int NOT NULL,
  `idLegacy` int NOT NULL,
  `forumId` mediumint NOT NULL,
  `name` varchar(256) NOT NULL,
  `slug` varchar(256) NOT NULL,
  `numberOfPages` smallint NOT NULL,
  `isDeleted` tinyint NOT NULL,
  `isLocked` tinyint NOT NULL,
  `lockRationale` varchar(1024) NOT NULL,
  PRIMARY KEY (`idModern`),
  KEY `idLegacy` (`idLegacy`),
  KEY `forumId` (`forumId`)
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

CREATE TABLE `stickerPacks` (
  `id` smallint NOT NULL,
  `name` varchar(256) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `stickers` (
  `jvfId` smallint NOT NULL,
  `feeligoId` varchar(100) NOT NULL,
  `packId` smallint NOT NULL,
  `widthSmall` smallint NOT NULL,
  `heightSmall` smallint NOT NULL,
  `widthBig` smallint NOT NULL,
  `heightBig` smallint NOT NULL,
  KEY (`jvfId`),
  KEY `feeligoId` (`feeligoId`),
  KEY `packId` (`packId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO stickerPacks VALUES(1, 'Bridgely');
INSERT INTO stickerPacks VALUES(2, 'Hap');
INSERT INTO stickerPacks VALUES(3, 'Noel');
INSERT INTO stickerPacks VALUES(4, 'Rex Ryder');
INSERT INTO stickerPacks VALUES(5, 'Fluffy');
INSERT INTO stickerPacks VALUES(6, 'DomDeVill');
INSERT INTO stickerPacks VALUES(7, 'SaumonArcEnCiel');
INSERT INTO stickerPacks VALUES(8, 'Lamasticot');
INSERT INTO stickerPacks VALUES(9, 'Grukk');
INSERT INTO stickerPacks VALUES(10, 'Brice');
INSERT INTO stickerPacks VALUES(11, 'Football');
INSERT INTO stickerPacks VALUES(12, 'Bud');
INSERT INTO stickerPacks VALUES(13, 'Duracell');
INSERT INTO stickerPacks VALUES(14, 'Xbox');
INSERT INTO stickerPacks VALUES(15, 'Store');
INSERT INTO stickerPacks VALUES(16, 'X-Men');

INSERT INTO stickers VALUES(1, '1jnj', 1, 140, 140, 560, 560);
INSERT INTO stickers VALUES(2, '1jnh', 1, 140, 140, 560, 560);
INSERT INTO stickers VALUES(3, '1jnf', 1, 140, 140, 560, 560);
INSERT INTO stickers VALUES(4, '1jne', 1, 140, 140, 560, 560);
INSERT INTO stickers VALUES(5, '1jnc', 1, 140, 140, 560, 560);
INSERT INTO stickers VALUES(6, '1jng', 1, 140, 140, 560, 560);
INSERT INTO stickers VALUES(7, '1jni', 1, 140, 140, 560, 560);
INSERT INTO stickers VALUES(8, '1jnd', 1, 140, 140, 560, 560);
INSERT INTO stickers VALUES(9, '1kki', 2, 140, 140, 560, 560);
INSERT INTO stickers VALUES(10, '1kkn', 2, 140, 140, 560, 560);
INSERT INTO stickers VALUES(11, '1kkl', 2, 140, 140, 560, 560);
INSERT INTO stickers VALUES(12, '1kkh', 2, 140, 140, 560, 560);
INSERT INTO stickers VALUES(13, '1kkj', 2, 140, 140, 560, 560);
INSERT INTO stickers VALUES(14, '1kkg', 2, 140, 140, 560, 560);
INSERT INTO stickers VALUES(15, '1kkm', 2, 140, 140, 560, 560);
INSERT INTO stickers VALUES(16, '1kkk', 2, 140, 140, 560, 560);
INSERT INTO stickers VALUES(17, '1kks', 3, 140, 140, 560, 560);
INSERT INTO stickers VALUES(18, '1kkr', 3, 140, 140, 560, 560);
INSERT INTO stickers VALUES(19, '1kkq', 3, 140, 140, 560, 560);
INSERT INTO stickers VALUES(20, '1kku', 3, 140, 140, 560, 560);
INSERT INTO stickers VALUES(21, '1kkp', 3, 140, 140, 560, 560);
INSERT INTO stickers VALUES(22, '1kko', 3, 140, 140, 560, 560);
INSERT INTO stickers VALUES(23, '1kkt', 3, 140, 140, 560, 560);
INSERT INTO stickers VALUES(24, '1kkv', 3, 140, 140, 560, 560);
INSERT INTO stickers VALUES(25, '1lmb', 4, 140, 140, 560, 560);
INSERT INTO stickers VALUES(26, '1lm9', 4, 140, 140, 560, 560);
INSERT INTO stickers VALUES(27, '1lmc', 4, 140, 140, 560, 560);
INSERT INTO stickers VALUES(28, '1lmg', 4, 140, 140, 560, 560);
INSERT INTO stickers VALUES(29, '1lma', 4, 140, 140, 560, 560);
INSERT INTO stickers VALUES(30, '1lmd', 4, 140, 140, 560, 560);
INSERT INTO stickers VALUES(31, '1lme', 4, 140, 140, 560, 560);
INSERT INTO stickers VALUES(32, '1lmf', 4, 140, 140, 560, 560);
INSERT INTO stickers VALUES(33, '1klb', 5, 140, 140, 560, 560);
INSERT INTO stickers VALUES(34, '1kl8', 5, 140, 140, 560, 560);
INSERT INTO stickers VALUES(35, '1kl9', 5, 140, 140, 560, 560);
INSERT INTO stickers VALUES(36, '1kl7', 5, 140, 140, 560, 560);
INSERT INTO stickers VALUES(37, '1kl6', 5, 140, 140, 560, 560);
INSERT INTO stickers VALUES(38, '1kl5', 5, 140, 140, 560, 560);
INSERT INTO stickers VALUES(39, '1kl4', 5, 140, 140, 560, 560);
INSERT INTO stickers VALUES(40, '1kl2', 5, 140, 140, 560, 560);
INSERT INTO stickers VALUES(41, '1kl1', 5, 140, 140, 560, 560);
INSERT INTO stickers VALUES(42, '1kl3', 5, 140, 140, 560, 560);
INSERT INTO stickers VALUES(43, '1kl0', 5, 140, 140, 560, 560);
INSERT INTO stickers VALUES(44, '1kla', 5, 140, 140, 560, 560);
INSERT INTO stickers VALUES(45, '1kkz', 5, 140, 140, 560, 560);
INSERT INTO stickers VALUES(46, '1kky', 5, 140, 140, 560, 560);
INSERT INTO stickers VALUES(47, '1ljr', 6, 140, 140, 560, 560);
INSERT INTO stickers VALUES(48, '1ljp', 6, 140, 140, 560, 560);
INSERT INTO stickers VALUES(49, '1ljj', 6, 140, 140, 560, 560);
INSERT INTO stickers VALUES(50, '1ljq', 6, 140, 140, 560, 560);
INSERT INTO stickers VALUES(51, '1ljn', 6, 140, 140, 560, 560);
INSERT INTO stickers VALUES(52, '1ljm', 6, 140, 140, 560, 560);
INSERT INTO stickers VALUES(53, '1ljl', 6, 140, 140, 560, 560);
INSERT INTO stickers VALUES(54, '1ljo', 6, 140, 140, 560, 560);
INSERT INTO stickers VALUES(55, '1lmh', 7, 140, 140, 560, 560);
INSERT INTO stickers VALUES(56, '1lmk', 7, 140, 140, 560, 560);
INSERT INTO stickers VALUES(57, '1mr0', 7, 140, 140, 560, 560);
INSERT INTO stickers VALUES(58, '1nua', 7, 140, 140, 560, 560);
INSERT INTO stickers VALUES(59, '1mqv', 7, 140, 140, 560, 560);
INSERT INTO stickers VALUES(60, '1lmp', 7, 140, 140, 560, 560);
INSERT INTO stickers VALUES(61, '1mqx', 7, 140, 140, 560, 560);
INSERT INTO stickers VALUES(62, '1mqw', 7, 140, 140, 560, 560);
INSERT INTO stickers VALUES(63, '1lmj', 7, 140, 140, 560, 560);
INSERT INTO stickers VALUES(64, '1mr1', 7, 140, 140, 560, 560);
INSERT INTO stickers VALUES(65, '1mqz', 7, 140, 140, 560, 560);
INSERT INTO stickers VALUES(66, '1lmn', 7, 140, 140, 560, 560);
INSERT INTO stickers VALUES(67, '1lml', 7, 140, 140, 560, 560);
INSERT INTO stickers VALUES(68, '1lmi', 7, 140, 140, 560, 560);
INSERT INTO stickers VALUES(69, '1lmm', 7, 140, 140, 560, 560);
INSERT INTO stickers VALUES(70, '1lmo', 7, 140, 140, 560, 560);
INSERT INTO stickers VALUES(71, '1mqy', 7, 140, 140, 560, 560);
INSERT INTO stickers VALUES(72, '1nub', 7, 140, 140, 560, 560);
INSERT INTO stickers VALUES(73, '1nu9', 7, 140, 140, 560, 560);
INSERT INTO stickers VALUES(74, '1nu8', 7, 140, 140, 560, 560);
INSERT INTO stickers VALUES(75, '1nu7', 7, 140, 140, 560, 560);
INSERT INTO stickers VALUES(76, '1nu6', 7, 140, 140, 560, 560);
INSERT INTO stickers VALUES(77, '1kgx', 8, 140, 140, 560, 560);
INSERT INTO stickers VALUES(78, '1kgy', 8, 140, 140, 560, 560);
INSERT INTO stickers VALUES(79, '1kgz', 8, 140, 140, 560, 560);
INSERT INTO stickers VALUES(80, '1kh0', 8, 140, 140, 560, 560);
INSERT INTO stickers VALUES(81, '1kh1', 8, 140, 140, 560, 560);
INSERT INTO stickers VALUES(82, '1kgw', 8, 140, 140, 560, 560);
INSERT INTO stickers VALUES(83, '1kgv', 8, 140, 140, 560, 560);
INSERT INTO stickers VALUES(84, '1kgu', 8, 140, 140, 560, 560);
INSERT INTO stickers VALUES(85, '1lgd', 9, 140, 140, 560, 560);
INSERT INTO stickers VALUES(86, '1lge', 9, 140, 140, 560, 560);
INSERT INTO stickers VALUES(87, '1lgg', 9, 140, 140, 560, 560);
INSERT INTO stickers VALUES(88, '1lgh', 9, 140, 140, 560, 560);
INSERT INTO stickers VALUES(89, '1lgf', 9, 140, 140, 560, 560);
INSERT INTO stickers VALUES(90, '1lgb', 9, 140, 140, 560, 560);
INSERT INTO stickers VALUES(91, '1lgc', 9, 140, 140, 560, 560);
INSERT INTO stickers VALUES(92, '1lga', 9, 140, 140, 560, 560);
INSERT INTO stickers VALUES(93, '1ntq', 10, 140, 140, 560, 560);
INSERT INTO stickers VALUES(94, '1nts', 10, 140, 140, 560, 560);
INSERT INTO stickers VALUES(95, '1ntu', 10, 140, 140, 560, 560);
INSERT INTO stickers VALUES(96, '1ntx', 10, 140, 140, 560, 560);
INSERT INTO stickers VALUES(97, '1nty', 10, 140, 140, 560, 560);
INSERT INTO stickers VALUES(98, '1ntp', 10, 140, 140, 560, 560);
INSERT INTO stickers VALUES(99, '1ntr', 10, 140, 140, 560, 560);
INSERT INTO stickers VALUES(100, '1ntt', 10, 140, 140, 560, 560);
INSERT INTO stickers VALUES(101, '1nu0', 10, 140, 140, 560, 560);
INSERT INTO stickers VALUES(102, '1ntv', 10, 140, 140, 560, 560);
INSERT INTO stickers VALUES(103, '1ntz', 10, 140, 140, 560, 560);
INSERT INTO stickers VALUES(104, '1ntw', 10, 140, 140, 560, 560);
INSERT INTO stickers VALUES(105, '1n1m', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(105, '1n1m-fr', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(105, '1n6i', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(106, '1n1m-es', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(106, '1n70', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(107, '1n6t', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(107, '1n1m-it', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(108, '1n1m-de', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(108, '1n6b', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(109, '1n1n', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(109, '1n1n-fr', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(109, '1n6l', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(110, '1n1n-es', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(110, '1n6x', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(111, '1n6q', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(111, '1n1n-it', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(112, '1n1n-de', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(112, '1n6e', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(113, '1n1o', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(113, '1n1o-fr', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(113, '1n6k', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(114, '1n1o-es', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(114, '1n6y', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(115, '1n6s', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(115, '1n1o-it', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(116, '1n1o-de', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(116, '1n6c', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(117, '1n1p', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(117, '1n1p-fr', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(117, '1n6j', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(118, '1n1p-es', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(118, '1n6z', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(119, '1n6r', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(119, '1n1p-it', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(120, '1n1p-de', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(120, '1n6d', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(121, '1n1q', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(121, '1n1q-fr', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(121, '1n6o', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(122, '1n1q-es', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(122, '1n71', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(123, '1n6w', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(123, '1n1q-it', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(124, '1n1q-de', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(124, '1n6f', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(125, '1n1r', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(125, '1n1r-fr', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(125, '1n6m', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(125, '1nuz', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(126, '1n1r-es', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(126, '1n72', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(127, '1n6u', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(127, '1n1r-it', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(128, '1n1r-de', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(128, '1n6h', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(129, '1n1t', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(129, '1n1t-fr', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(129, '1n6n', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(130, '1n1t-es', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(130, '1n73', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(131, '1n6v', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(131, '1n1t-it', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(132, '1n1t-de', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(132, '1n6g', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(133, '1n1s', 11, 140, 140, 560, 560);
INSERT INTO stickers VALUES(134, 'zu8', 12, 140, 140, 560, 560);
INSERT INTO stickers VALUES(135, 'zuc', 12, 140, 140, 560, 560);
INSERT INTO stickers VALUES(136, 'zua', 12, 140, 140, 560, 560);
INSERT INTO stickers VALUES(137, 'zu2', 12, 140, 140, 560, 560);
INSERT INTO stickers VALUES(138, 'zu6', 12, 140, 140, 560, 560);
INSERT INTO stickers VALUES(139, 'zu7', 12, 140, 140, 560, 560);
INSERT INTO stickers VALUES(140, 'zu9', 12, 140, 140, 560, 560);
INSERT INTO stickers VALUES(141, 'zub', 12, 140, 140, 560, 560);
INSERT INTO stickers VALUES(142, '1f88', 12, 140, 140, 560, 560);
INSERT INTO stickers VALUES(143, '1f89', 12, 140, 140, 560, 560);
INSERT INTO stickers VALUES(144, '1f8a', 12, 140, 140, 560, 560);
INSERT INTO stickers VALUES(145, '1f8b', 12, 140, 140, 560, 560);
INSERT INTO stickers VALUES(146, '1f8c', 12, 140, 140, 560, 560);
INSERT INTO stickers VALUES(147, '1f8d', 12, 140, 140, 560, 560);
INSERT INTO stickers VALUES(148, '1f8e', 12, 140, 140, 560, 560);
INSERT INTO stickers VALUES(149, '1f8f', 12, 140, 140, 560, 560);
INSERT INTO stickers VALUES(150, '1jch', 13, 140, 140, 560, 560);
INSERT INTO stickers VALUES(151, '1jcl', 13, 140, 140, 560, 560);
INSERT INTO stickers VALUES(152, '1li5', 13, 140, 140, 560, 560);
INSERT INTO stickers VALUES(153, '1jc5', 13, 140, 140, 560, 560);
INSERT INTO stickers VALUES(154, '1jcg', 13, 140, 140, 560, 560);
INSERT INTO stickers VALUES(155, '1leb', 13, 140, 140, 560, 560);
INSERT INTO stickers VALUES(156, '1jc3', 13, 140, 140, 560, 560);
INSERT INTO stickers VALUES(156, '1jc3-fr', 13, 140, 140, 560, 560);
INSERT INTO stickers VALUES(157, '1jc3-en', 13, 140, 140, 560, 560);
INSERT INTO stickers VALUES(158, '1li4', 13, 140, 140, 560, 560);
INSERT INTO stickers VALUES(159, '1leq-fr', 13, 140, 140, 560, 560);
INSERT INTO stickers VALUES(160, '1leq-en', 13, 140, 140, 560, 560);
INSERT INTO stickers VALUES(160, '1leq', 13, 140, 140, 560, 560);
INSERT INTO stickers VALUES(161, '1lej-fr', 13, 140, 140, 560, 560);
INSERT INTO stickers VALUES(162, '1lej-en', 13, 140, 140, 560, 560);
INSERT INTO stickers VALUES(162, '1lej', 13, 140, 140, 560, 560);
INSERT INTO stickers VALUES(163, '1li3', 13, 140, 140, 560, 560);
INSERT INTO stickers VALUES(164, '1my4', 14, 140, 140, 560, 560);
INSERT INTO stickers VALUES(165, '1my9', 14, 140, 140, 560, 560);
INSERT INTO stickers VALUES(166, '1myc', 14, 140, 140, 560, 560);
INSERT INTO stickers VALUES(167, '1my5', 14, 140, 140, 560, 560);
INSERT INTO stickers VALUES(168, '1my8', 14, 140, 140, 560, 560);
INSERT INTO stickers VALUES(169, '1my7', 14, 140, 140, 560, 560);
INSERT INTO stickers VALUES(170, '1my6', 14, 140, 140, 560, 560);
INSERT INTO stickers VALUES(171, '1mya', 14, 140, 140, 560, 560);
INSERT INTO stickers VALUES(172, '1myb', 14, 140, 140, 560, 560);
INSERT INTO stickers VALUES(173, '1myd', 14, 140, 140, 560, 560);
INSERT INTO stickers VALUES(174, '1mye', 14, 140, 140, 560, 560);
INSERT INTO stickers VALUES(175, '1myf', 14, 140, 140, 560, 560);
INSERT INTO stickers VALUES(176, '1myx', 14, 140, 140, 560, 560);
INSERT INTO stickers VALUES(177, '1n28', 14, 140, 140, 560, 560);
INSERT INTO stickers VALUES(178, '1n2c', 15, 70, 70, 560, 560);
INSERT INTO stickers VALUES(179, '1n2d', 15, 140, 140, 560, 560);
INSERT INTO stickers VALUES(180, '1n2g', 15, 140, 140, 560, 560);
INSERT INTO stickers VALUES(181, '1n2h', 15, 140, 140, 560, 560);
INSERT INTO stickers VALUES(182, '1n2i', 15, 140, 140, 560, 560);
INSERT INTO stickers VALUES(183, '1n2j', 15, 140, 140, 560, 560);
INSERT INTO stickers VALUES(184, '1n2k', 15, 140, 140, 560, 560);
INSERT INTO stickers VALUES(185, '1n2l', 15, 140, 140, 560, 560);
INSERT INTO stickers VALUES(186, '1n2m', 15, 140, 140, 560, 560);
INSERT INTO stickers VALUES(187, '1n2n', 15, 140, 140, 560, 560);
INSERT INTO stickers VALUES(188, '1n2o', 15, 70, 70, 560, 560);
INSERT INTO stickers VALUES(189, '1mid', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(189, '1mid-fr', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(190, '1mid-en', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(191, '1mie', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(191, '1mie-fr', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(192, '1mie-en', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(193, '1mif', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(194, '1mig', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(194, '1mig-fr', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(195, '1mig-en', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(196, '1mih', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(196, '1mih-fr', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(197, '1mih-en', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(198, '1mii', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(198, '1mii-fr', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(198, '1mii-en', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(199, '1mij', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(199, '1mij-fr', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(200, '1mij-en', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(201, '1mik', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(201, '1mik-fr', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(202, '1mik-en', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(203, '1mil', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(203, '1mil-fr', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(204, '1mil-en', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(205, '1mim', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(205, '1mim-fr', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(206, '1mim-en', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(207, '1min', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(208, '1mio', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(208, '1mio-fr', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(209, '1mio-en', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(210, '1mip', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(211, '1miq', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(212, '1mir', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(213, '1mir-en', 16, 140, 140, 560, 560);
INSERT INTO stickers VALUES(214, '/2016/48/1480611128-jvforum-sticker-214.png', 6, 140, 140, 560, 560);
