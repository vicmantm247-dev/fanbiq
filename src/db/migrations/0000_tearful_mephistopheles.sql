CREATE TABLE "flicks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_path" text NOT NULL,
	"video_url" text NOT NULL,
	"movie_title" text NOT NULL,
	"movie_year" integer NOT NULL,
	"tmdb_id" integer,
	"movie_backdrop_url" text DEFAULT '',
	"uploader" text DEFAULT 'anonymous' NOT NULL,
	"caption" text DEFAULT '',
	"tags" text[] DEFAULT '{}',
	"likes" integer DEFAULT 0 NOT NULL,
	"comments" integer DEFAULT 0 NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
