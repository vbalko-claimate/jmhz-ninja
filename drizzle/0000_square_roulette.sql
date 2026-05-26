CREATE TABLE `app_config` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`svj_name` text DEFAULT '' NOT NULL,
	`svj_ico` text DEFAULT '' NOT NULL,
	`svj_address` text DEFAULT '' NOT NULL,
	`tax_office_account` text DEFAULT '' NOT NULL,
	`cssz_vs` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `backup_settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`encryption_enabled` integer DEFAULT false NOT NULL,
	`passphrase_hash` text,
	`gdrive_folder_id` text,
	`gdrive_sa_configured` integer DEFAULT false NOT NULL,
	`last_backup_at` integer,
	`last_backup_status` text
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`personal_id` text NOT NULL,
	`default_gross_reward` text NOT NULL,
	`bank_account` text NOT NULL,
	`is_tax_declaration_signed` integer DEFAULT false NOT NULL,
	`cssz_oic` text,
	`cssz_id_ppv` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `legal_parameters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`effective_from` text NOT NULL,
	`insurance_threshold` text NOT NULL,
	`tax_rate` text NOT NULL,
	`tax_discount_monthly` text NOT NULL,
	`note` text
);
--> statement-breakpoint
CREATE TABLE `payroll_periods` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`year` integer NOT NULL,
	`month` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`xml_generated_at` integer,
	`submitted_at` integer,
	`submission_reference` text,
	`archive_folder_id` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payroll_periods_year_month_idx` ON `payroll_periods` (`year`,`month`);--> statement-breakpoint
CREATE TABLE `payroll_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`period_id` integer NOT NULL,
	`employee_id` integer NOT NULL,
	`base_reward` text NOT NULL,
	`extra_reward` text DEFAULT '0' NOT NULL,
	`total_gross` text NOT NULL,
	`tax_amount` text NOT NULL,
	`net_amount` text NOT NULL,
	`tax_declaration_at_time` integer NOT NULL,
	`params_snapshot` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`period_id`) REFERENCES `payroll_periods`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payroll_records_period_employee_idx` ON `payroll_records` (`period_id`,`employee_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`role` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`last_login_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);