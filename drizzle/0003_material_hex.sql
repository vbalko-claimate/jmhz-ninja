ALTER TABLE `payroll_periods` ADD `last_validated_at` integer;--> statement-breakpoint
ALTER TABLE `payroll_periods` ADD `last_validation_ok` integer;--> statement-breakpoint
ALTER TABLE `payroll_periods` ADD `last_validation_errors` text;