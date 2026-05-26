import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  integer,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

// All money columns: TEXT with decimal(10,2) semantics, manipulated via Decimal in code.

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name'),
  role: text('role', { enum: ['admin', 'user', 'viewer'] }).notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
});

export const employees = sqliteTable('employees', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  personalId: text('personal_id').notNull(),
  defaultGrossReward: text('default_gross_reward').notNull(),
  bankAccount: text('bank_account').notNull(),
  isTaxDeclarationSigned: integer('is_tax_declaration_signed', { mode: 'boolean' })
    .notNull()
    .default(false),
  csszOic: text('cssz_oic'),
  csszIdPpv: text('cssz_id_ppv'),

  // Doplňková identifikační pole (z ČSSZ a podkladů od účetní)
  nativeSurname: text('native_surname'), // rodné příjmení
  birthDate: text('birth_date'), // YYYY-MM-DD
  birthPlace: text('birth_place'),
  citizenship: text('citizenship').default('CZ'),
  healthInsurance: text('health_insurance'), // např. "VZP (111)" nebo "ZPMV (211)"
  employmentStartDate: text('employment_start_date'), // YYYY-MM-DD
  functionTitle: text('function_title'), // předseda / místopředseda / člen / úklid / atd.
  employmentCategory: text('employment_category').default('Q'), // Q = členové kolektivních orgánů

  notes: text('notes'),

  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const payrollPeriods = sqliteTable(
  'payroll_periods',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    year: integer('year').notNull(),
    month: integer('month').notNull(),
    status: text('status', { enum: ['draft', 'generated', 'submitted'] })
      .notNull()
      .default('draft'),
    xmlGeneratedAt: integer('xml_generated_at', { mode: 'timestamp' }),
    submittedAt: integer('submitted_at', { mode: 'timestamp' }),
    submissionReference: text('submission_reference'),
    archiveFolderId: text('archive_folder_id'),
    notes: text('notes'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [uniqueIndex('payroll_periods_year_month_idx').on(t.year, t.month)],
);

export const payrollRecords = sqliteTable(
  'payroll_records',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    periodId: integer('period_id')
      .notNull()
      .references(() => payrollPeriods.id),
    employeeId: integer('employee_id')
      .notNull()
      .references(() => employees.id),
    baseReward: text('base_reward').notNull(),
    extraReward: text('extra_reward').notNull().default('0'),
    totalGross: text('total_gross').notNull(),
    taxAmount: text('tax_amount').notNull(),
    netAmount: text('net_amount').notNull(),
    taxDeclarationAtTime: integer('tax_declaration_at_time', { mode: 'boolean' }).notNull(),
    paramsSnapshot: text('params_snapshot', { mode: 'json' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [uniqueIndex('payroll_records_period_employee_idx').on(t.periodId, t.employeeId)],
);

export const appConfig = sqliteTable('app_config', {
  id: integer('id').primaryKey().default(1),
  svjName: text('svj_name').notNull().default(''),
  svjIco: text('svj_ico').notNull().default(''),
  svjAddress: text('svj_address').notNull().default(''),
  taxOfficeAccount: text('tax_office_account').notNull().default(''),
  csszVs: text('cssz_vs').notNull().default(''),

  // Doplňková pole (z ČSSZ usnesení a IS DS)
  svjDatovaSchranka: text('svj_datova_schranka').default(''),
  csszAccount: text('cssz_account').default(''), // pojistný účet, např. 21012-17925341/0710
  osszCode: text('ossz_code').default(''), // např. 442
  osszName: text('ossz_name').default(''), // např. "Karlovy Vary"
  osszAddress: text('ossz_address').default(''),
  osszEmail: text('ossz_email').default(''),
  osszDatovaSchranka: text('ossz_datova_schranka').default(''),

  // Místo výkonu práce pro JMHZ form (vykonavanaPozice.mistoVykonuPrace)
  workplaceObec: text('workplace_obec').default('Praha'),
  workplaceKodObce: text('workplace_kod_obce').default('554782'), // ČSÚ kód obce, 6 číslic
  workplaceKodStatu: text('workplace_kod_statu').default('CZ'),
});

export const legalParameters = sqliteTable('legal_parameters', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  effectiveFrom: text('effective_from').notNull(),
  insuranceThreshold: text('insurance_threshold').notNull(),
  taxRate: text('tax_rate').notNull(),
  taxDiscountMonthly: text('tax_discount_monthly').notNull(),
  note: text('note'),
});

export const backupSettings = sqliteTable('backup_settings', {
  id: integer('id').primaryKey().default(1),
  encryptionEnabled: integer('encryption_enabled', { mode: 'boolean' }).notNull().default(false),
  passphraseHash: text('passphrase_hash'),
  gdriveFolderId: text('gdrive_folder_id'),
  gdriveSaConfigured: integer('gdrive_sa_configured', { mode: 'boolean' }).notNull().default(false),
  lastBackupAt: integer('last_backup_at', { mode: 'timestamp' }),
  lastBackupStatus: text('last_backup_status'),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type PayrollPeriod = typeof payrollPeriods.$inferSelect;
export type PayrollRecord = typeof payrollRecords.$inferSelect;
export type AppConfig = typeof appConfig.$inferSelect;
export type LegalParameters = typeof legalParameters.$inferSelect;
export type BackupSettings = typeof backupSettings.$inferSelect;
