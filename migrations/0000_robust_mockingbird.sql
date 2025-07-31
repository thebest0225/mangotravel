CREATE TABLE `location_labels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT ('#3B82F6'),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `location_labels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saved_places` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`category` text,
	`rating` text,
	`description` text,
	`google_place_id` text,
	`latitude` text,
	`longitude` text,
	`country` text,
	`region` text,
	`city` text,
	`place_types` json DEFAULT ('[]'),
	`photos` json DEFAULT ('[]'),
	`opening_hours` json,
	`website` text,
	`links` json DEFAULT ('[]'),
	`phone_number` text,
	`custom_label` text,
	`label_id` int,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `saved_places_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schedule_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`plan_id` int NOT NULL,
	`date` text NOT NULL,
	`time` text NOT NULL,
	`title` text NOT NULL,
	`location` text,
	`memo` text,
	`order` int NOT NULL DEFAULT 0,
	CONSTRAINT `schedule_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `travel_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`participants` json NOT NULL DEFAULT ('[]'),
	`status` text NOT NULL DEFAULT ('planning'),
	`transport_type` text NOT NULL DEFAULT ('car'),
	`flight_info` json,
	`essential_items` json DEFAULT ('[]'),
	CONSTRAINT `travel_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` text NOT NULL,
	`password` text NOT NULL,
	`role` int NOT NULL DEFAULT 3,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`)
);
