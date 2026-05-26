ALTER TABLE `app_config` ADD `svj_datova_schranka` text DEFAULT '';--> statement-breakpoint
ALTER TABLE `app_config` ADD `cssz_account` text DEFAULT '';--> statement-breakpoint
ALTER TABLE `app_config` ADD `ossz_code` text DEFAULT '';--> statement-breakpoint
ALTER TABLE `app_config` ADD `ossz_name` text DEFAULT '';--> statement-breakpoint
ALTER TABLE `app_config` ADD `ossz_address` text DEFAULT '';--> statement-breakpoint
ALTER TABLE `app_config` ADD `ossz_email` text DEFAULT '';--> statement-breakpoint
ALTER TABLE `app_config` ADD `ossz_datova_schranka` text DEFAULT '';--> statement-breakpoint
ALTER TABLE `employees` ADD `native_surname` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `birth_date` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `birth_place` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `citizenship` text DEFAULT 'CZ';--> statement-breakpoint
ALTER TABLE `employees` ADD `health_insurance` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `employment_start_date` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `function_title` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `employment_category` text DEFAULT 'Q';--> statement-breakpoint
ALTER TABLE `employees` ADD `notes` text;