
CREATE TABLE "sessions" (
  "sid" varchar NOT NULL PRIMARY KEY,
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
);
CREATE INDEX "IDX_sessions_expire" ON "sessions" ("expire");
