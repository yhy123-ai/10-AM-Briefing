CREATE TABLE `articles` (
	`id` text PRIMARY KEY NOT NULL,
	`edition_date` text NOT NULL,
	`category` text NOT NULL,
	`rank` integer NOT NULL,
	`event_key` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`search_text` text NOT NULL,
	`payload` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`edition_date`) REFERENCES `editions`(`date`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_articles_date_category` ON `articles` (`edition_date`,`category`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_articles_date_event` ON `articles` (`edition_date`,`event_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_articles_date_rank` ON `articles` (`edition_date`,`category`,`rank`);--> statement-breakpoint
CREATE TABLE `editions` (
	`date` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`hash` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`published_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `article_revisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`article_id` text NOT NULL,
	`payload` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_revisions_article` ON `article_revisions` (`article_id`);