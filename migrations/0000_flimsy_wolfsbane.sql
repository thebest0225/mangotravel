CREATE TABLE "location_labels" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#3B82F6',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "saved_places" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"category" text,
	"rating" text,
	"description" text,
	"google_place_id" text,
	"latitude" text,
	"longitude" text,
	"country" text,
	"region" text,
	"city" text,
	"place_types" jsonb DEFAULT '[]'::jsonb,
	"photos" jsonb DEFAULT '[]'::jsonb,
	"opening_hours" jsonb,
	"website" text,
	"links" jsonb DEFAULT '[]'::jsonb,
	"phone_number" text,
	"custom_label" text,
	"label_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "schedule_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"date" text NOT NULL,
	"time" text NOT NULL,
	"title" text NOT NULL,
	"location" text,
	"memo" text,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "travel_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"participants" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'planning' NOT NULL,
	"transport_type" text DEFAULT 'car' NOT NULL,
	"flight_info" jsonb,
	"essential_items" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"password" text NOT NULL,
	"role" integer DEFAULT 3 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
