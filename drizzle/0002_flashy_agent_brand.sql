CREATE TABLE `reg_sessions` (
	`session_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`onetime_token` text,
	`expires_at` integer NOT NULL,
	`stage` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reg_sessions_email_unique` ON `reg_sessions` (`email`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`verified` integer DEFAULT false
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "name", "email", "password_hash", "created_at", "verified") SELECT "id", "name", "email", "password_hash", "created_at", "verified" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);