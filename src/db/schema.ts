import { sql } from "drizzle-orm";
import { boolean, check, integer, numeric, pgTable, text, unique, varchar } from "drizzle-orm/pg-core";

export const leagues = pgTable("leagues", {
  leagueId: varchar("league_id", { length: 32 }).primaryKey(),
  leagueName: varchar("league_name", { length: 80 }).notNull(),
  volumeLabel: varchar("volume_label", { length: 40 }).notNull(),
  description: text("description"),
});

export const neighborhoods = pgTable("neighborhoods", {
  neighborhoodId: varchar("neighborhood_id", { length: 64 }).primaryKey(),
  leagueId: varchar("league_id", { length: 32 })
    .notNull()
    .references(() => leagues.leagueId),
  zipCode: varchar("zip_code", { length: 10 }).notNull(),
  neighborhoodName: varchar("neighborhood_name", { length: 80 }).notNull(),
});

export const operators = pgTable("operators", {
  operatorId: varchar("operator_id", { length: 96 }).primaryKey(),
  operatorName: varchar("operator_name", { length: 120 }).notNull(),
  leagueId: varchar("league_id", { length: 32 })
    .notNull()
    .references(() => leagues.leagueId),
  operatorType: varchar("operator_type", { length: 80 }),
  isVerified: boolean("is_verified").notNull().default(false),
  isCurrentUser: boolean("is_current_user").notNull().default(false),
  status: text("status").notNull().default("active"),
});

export const standingsEntries = pgTable(
  "standings_entries",
  {
    entryId: varchar("entry_id", { length: 128 }).primaryKey(),
    seasonId: varchar("season_id", { length: 20 }).notNull(),
    timeWindow: varchar("time_window", { length: 40 }).notNull(),
    leagueId: varchar("league_id", { length: 32 })
      .notNull()
      .references(() => leagues.leagueId),
    neighborhoodId: varchar("neighborhood_id", { length: 64 })
      .notNull()
      .references(() => neighborhoods.neighborhoodId),
    zipCode: varchar("zip_code", { length: 10 }).notNull(),
    operatorId: varchar("operator_id", { length: 96 })
      .notNull()
      .references(() => operators.operatorId),
    rank: integer("rank").notNull(),
    repScore: integer("rep_score").notNull(),
    rankDelta30d: integer("rank_delta_30d").notNull().default(0),
    distanceMiles: numeric("distance_miles", { precision: 7, scale: 2 }).notNull().default("0"),
  },
  (table) => [
    check("standings_entries_rank_check", sql`${table.rank} >= 1`),
    check("standings_entries_rep_score_check", sql`${table.repScore} >= 0 AND ${table.repScore} <= 100`),
    unique("standings_entries_window_league_neighborhood_operator_unique").on(
      table.timeWindow,
      table.leagueId,
      table.neighborhoodId,
      table.operatorId,
    ),
  ],
);

export const scoreInputs = pgTable(
  "score_inputs",
  {
    entryId: varchar("entry_id", { length: 128 })
      .primaryKey()
      .references(() => standingsEntries.entryId),
    volumeCount: integer("volume_count").notNull().default(0),
    rating: numeric("rating", { precision: 2, scale: 1 }).notNull(),
    reviewCount: numeric("review_count").notNull().default("0"),
    responseMinutes: integer("response_minutes").notNull().default(0),
    onTimePercent: integer("on_time_percent").notNull(),
    licenseVerified: boolean("license_verified").notNull().default(false),
  },
  (table) => [
    check("score_inputs_volume_count_check", sql`${table.volumeCount} >= 0`),
    check("score_inputs_rating_check", sql`${table.rating} >= 0 AND ${table.rating} <= 5`),
    check("score_inputs_review_count_check", sql`${table.reviewCount} >= 0`),
    check("score_inputs_response_minutes_check", sql`${table.responseMinutes} >= 0`),
    check("score_inputs_on_time_percent_check", sql`${table.onTimePercent} >= 0 AND ${table.onTimePercent} <= 100`),
  ],
);
