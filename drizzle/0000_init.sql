CREATE TABLE `activity` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`league_id` integer NOT NULL,
	`text` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`league_id`) REFERENCES `leagues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `activity_league_idx` ON `activity` (`league_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `bids` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`listing_id` integer NOT NULL,
	`member_id` integer NOT NULL,
	`amount` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bids_listing_member_uq` ON `bids` (`listing_id`,`member_id`);--> statement-breakpoint
CREATE TABLE `club_teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`short_name` text NOT NULL,
	`gender` text NOT NULL,
	`competition` text NOT NULL,
	`federation` text DEFAULT 'FCF' NOT NULL,
	`federation_url` text,
	`sort` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `gameweeks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`number` integer NOT NULL,
	`name` text NOT NULL,
	`deadline` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gameweeks_number_unique` ON `gameweeks` (`number`);--> statement-breakpoint
CREATE TABLE `leagues` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`is_public` integer DEFAULT false NOT NULL,
	`code` text NOT NULL,
	`owner_id` integer,
	`starting_cash` integer DEFAULT 20000000 NOT NULL,
	`max_members` integer DEFAULT 8 NOT NULL,
	`market_size` integer DEFAULT 8 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leagues_code_unique` ON `leagues` (`code`);--> statement-breakpoint
CREATE TABLE `lineups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` integer NOT NULL,
	`gameweek_id` integer NOT NULL,
	`formation` text NOT NULL,
	`player_ids` text NOT NULL,
	`captain_id` integer,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`gameweek_id`) REFERENCES `gameweeks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lineup_member_gw_uq` ON `lineups` (`member_id`,`gameweek_id`);--> statement-breakpoint
CREATE TABLE `listings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`league_id` integer NOT NULL,
	`player_id` integer NOT NULL,
	`seller_member_id` integer,
	`min_price` integer NOT NULL,
	`closes_at` integer NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`winner_member_id` integer,
	`final_price` integer,
	FOREIGN KEY (`league_id`) REFERENCES `leagues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`seller_member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `listings_league_idx` ON `listings` (`league_id`,`status`);--> statement-breakpoint
CREATE TABLE `matches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`gameweek_id` integer NOT NULL,
	`club_team_id` integer NOT NULL,
	`opponent` text NOT NULL,
	`is_home` integer DEFAULT true NOT NULL,
	`kickoff` integer NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`goals_for` integer DEFAULT 0 NOT NULL,
	`goals_against` integer DEFAULT 0 NOT NULL,
	`minute` integer,
	`acta_url` text,
	`stats_applied` integer DEFAULT false NOT NULL,
	`updated_at` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`gameweek_id`) REFERENCES `gameweeks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`club_team_id`) REFERENCES `club_teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `matches_gw_idx` ON `matches` (`gameweek_id`);--> statement-breakpoint
CREATE TABLE `members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`league_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`team_name` text NOT NULL,
	`cash` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`league_id`) REFERENCES `leagues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `members_league_user_uq` ON `members` (`league_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `ownerships` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`league_id` integer NOT NULL,
	`member_id` integer NOT NULL,
	`player_id` integer NOT NULL,
	`bought_for` integer DEFAULT 0 NOT NULL,
	`acquired_at` integer NOT NULL,
	FOREIGN KEY (`league_id`) REFERENCES `leagues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `own_league_player_uq` ON `ownerships` (`league_id`,`player_id`);--> statement-breakpoint
CREATE INDEX `own_member_idx` ON `ownerships` (`member_id`);--> statement-breakpoint
CREATE TABLE `player_stats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` integer NOT NULL,
	`player_id` integer NOT NULL,
	`minutes` integer DEFAULT 0 NOT NULL,
	`goals` integer DEFAULT 0 NOT NULL,
	`own_goals` integer DEFAULT 0 NOT NULL,
	`yellow` integer DEFAULT 0 NOT NULL,
	`red` integer DEFAULT false NOT NULL,
	`pen_saved` integer DEFAULT 0 NOT NULL,
	`pen_missed` integer DEFAULT 0 NOT NULL,
	`points` integer DEFAULT 0 NOT NULL,
	`value_delta` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stats_match_player_uq` ON `player_stats` (`match_id`,`player_id`);--> statement-breakpoint
CREATE TABLE `players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`club_team_id` integer NOT NULL,
	`name` text NOT NULL,
	`acta_name` text,
	`birth_date` text NOT NULL,
	`position` text NOT NULL,
	`shirt_number` integer,
	`value` integer DEFAULT 1000000 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`club_team_id`) REFERENCES `club_teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `players_team_idx` ON `players` (`club_team_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`is_admin` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);