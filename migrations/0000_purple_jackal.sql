CREATE TYPE "public"."account_type" AS ENUM('customer', 'supplier', 'expense', 'income', 'bank', 'cash');--> statement-breakpoint
CREATE TYPE "public"."inventory_transaction_type" AS ENUM('purchase', 'sale', 'adjustment', 'transfer', 'return');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'bank', 'credit', 'check');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "account_type" NOT NULL,
	"code" text,
	"phone" text,
	"email" text,
	"address" text,
	"tax_number" text,
	"opening_balance" double precision DEFAULT 0,
	"current_balance" double precision DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"category" text,
	"is_active" boolean DEFAULT true,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"parent_id" integer,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"warehouse_id" integer NOT NULL,
	"quantity" double precision DEFAULT 0,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "inventory_product_id_warehouse_id_unique" UNIQUE("product_id","warehouse_id")
);
--> statement-breakpoint
CREATE TABLE "inventory_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"warehouse_id" integer NOT NULL,
	"quantity" double precision NOT NULL,
	"type" "inventory_transaction_type" NOT NULL,
	"document_id" integer,
	"document_type" text,
	"date" timestamp DEFAULT now(),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"user_id" integer
);
--> statement-breakpoint
CREATE TABLE "invoice_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" double precision NOT NULL,
	"unit_price" double precision NOT NULL,
	"discount" double precision DEFAULT 0,
	"tax" double precision DEFAULT 0,
	"total" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_number" text NOT NULL,
	"account_id" integer NOT NULL,
	"warehouse_id" integer NOT NULL,
	"date" timestamp DEFAULT now(),
	"due_date" timestamp,
	"total" double precision DEFAULT 0,
	"discount" double precision DEFAULT 0,
	"tax" double precision DEFAULT 0,
	"subtotal" double precision DEFAULT 0,
	"status" text DEFAULT 'draft',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"user_id" integer,
	"payment_terms" text,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"barcode" text,
	"category_id" integer,
	"cost_price" double precision DEFAULT 0,
	"sell_price_1" double precision DEFAULT 0,
	"sell_price_2" double precision DEFAULT 0,
	"sell_price_3" double precision DEFAULT 0,
	"sell_price_4" double precision DEFAULT 0,
	"unit" text DEFAULT 'piece',
	"description" text,
	"min_stock" double precision DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"is_active" boolean DEFAULT true,
	CONSTRAINT "products_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "purchase_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"purchase_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" double precision NOT NULL,
	"unit_price" double precision NOT NULL,
	"discount" double precision DEFAULT 0,
	"tax" double precision DEFAULT 0,
	"total" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"purchase_number" text NOT NULL,
	"account_id" integer NOT NULL,
	"warehouse_id" integer NOT NULL,
	"date" timestamp DEFAULT now(),
	"due_date" timestamp,
	"total" double precision DEFAULT 0,
	"discount" double precision DEFAULT 0,
	"tax" double precision DEFAULT 0,
	"subtotal" double precision DEFAULT 0,
	"status" text DEFAULT 'draft',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"user_id" integer,
	"payment_terms" text,
	CONSTRAINT "purchases_purchase_number_unique" UNIQUE("purchase_number")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_name" text NOT NULL,
	"address" text,
	"phone" text,
	"email" text,
	"tax_number" text,
	"logo" text,
	"default_warehouse_id" integer,
	"currency" text DEFAULT 'EGP',
	"currency_symbol" text DEFAULT 'ج.م',
	"currency_position" text DEFAULT 'after',
	"decimal_places" integer DEFAULT 2,
	"financial_year_start" text,
	"date_format" text DEFAULT 'DD/MM/YYYY',
	"time_format" text DEFAULT 'HH:mm',
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"amount" double precision NOT NULL,
	"type" text NOT NULL,
	"reference" text,
	"date" timestamp DEFAULT now(),
	"payment_method" "payment_method" DEFAULT 'cash',
	"bank_id" integer,
	"notes" text,
	"document_id" integer,
	"document_type" text,
	"created_at" timestamp DEFAULT now(),
	"user_id" integer
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"full_name" text,
	"email" text,
	"phone" text,
	"role" text DEFAULT 'user',
	"is_active" boolean DEFAULT true,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"location" text,
	"manager" text,
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_details" ADD CONSTRAINT "invoice_details_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_details" ADD CONSTRAINT "invoice_details_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_details" ADD CONSTRAINT "purchase_details_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_details" ADD CONSTRAINT "purchase_details_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_default_warehouse_id_warehouses_id_fk" FOREIGN KEY ("default_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_bank_id_accounts_id_fk" FOREIGN KEY ("bank_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;