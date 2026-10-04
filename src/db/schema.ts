import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";

export type Position = "POR" | "DEF" | "MED" | "DEL";
export type Gender = "M" | "F";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull(),
});

/** Club de fútbol. Cada liga del fantasy pertenece a un club y solo usa sus equipos, jugadores y partidos. */
export const clubs = sqliteTable("clubs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  slug: text("slug").notNull().unique(),
  /** Color principal (hex) para la interfaz. */
  color: text("color").notNull().default("#0b3f91"),
  createdAt: integer("created_at").notNull(),
});

/** Equipos de un club (solo categorías con jugadores mayores de edad). */
export const clubTeams = sqliteTable("club_teams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clubId: integer("club_id").notNull().references(() => clubs.id),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  gender: text("gender").$type<Gender>().notNull(),
  competition: text("competition").notNull(),
  /** Federación que publica las actas: RFEF o FCF. */
  federation: text("federation").notNull().default("FCF"),
  /** URL de la página del equipo/calendario en la federación (para la importación automática). */
  federationUrl: text("federation_url"),
  sort: integer("sort").notNull().default(0),
}, (t) => [index("club_teams_club_idx").on(t.clubId)]);

export const players = sqliteTable(
  "players",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    clubTeamId: integer("club_team_id").notNull().references(() => clubTeams.id),
    name: text("name").notNull(),
    /** Nombre tal y como aparece en el acta de la federación (para emparejar). */
    actaName: text("acta_name"),
    birthDate: text("birth_date").notNull(),
    position: text("position").$type<Position>().notNull(),
    shirtNumber: integer("shirt_number"),
    value: integer("value").notNull().default(1_000_000),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
  },
  (t) => [index("players_team_idx").on(t.clubTeamId)],
);

/** Jornada de un club: agrupa los partidos de todos sus equipos de un fin de semana. */
export const gameweeks = sqliteTable(
  "gameweeks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    clubId: integer("club_id").notNull().references(() => clubs.id),
    number: integer("number").notNull(),
    name: text("name").notNull(),
    /** Cierre de alineaciones (normalmente el primer partido de la jornada). */
    deadline: integer("deadline").notNull(),
  },
  (t) => [uniqueIndex("gameweeks_club_number_uq").on(t.clubId, t.number)],
);

export type MatchStatus = "scheduled" | "live" | "finished";

export const matches = sqliteTable(
  "matches",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    gameweekId: integer("gameweek_id").notNull().references(() => gameweeks.id),
    clubTeamId: integer("club_team_id").notNull().references(() => clubTeams.id),
    opponent: text("opponent").notNull(),
    isHome: integer("is_home", { mode: "boolean" }).notNull().default(true),
    kickoff: integer("kickoff").notNull(),
    status: text("status").$type<MatchStatus>().notNull().default("scheduled"),
    goalsFor: integer("goals_for").notNull().default(0),
    goalsAgainst: integer("goals_against").notNull().default(0),
    minute: integer("minute"),
    actaUrl: text("acta_url"),
    statsApplied: integer("stats_applied", { mode: "boolean" }).notNull().default(false),
    updatedAt: integer("updated_at").notNull().default(0),
  },
  (t) => [index("matches_gw_idx").on(t.gameweekId)],
);

export const playerStats = sqliteTable(
  "player_stats",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    matchId: integer("match_id").notNull().references(() => matches.id),
    playerId: integer("player_id").notNull().references(() => players.id),
    minutes: integer("minutes").notNull().default(0),
    goals: integer("goals").notNull().default(0),
    ownGoals: integer("own_goals").notNull().default(0),
    yellow: integer("yellow").notNull().default(0),
    red: integer("red", { mode: "boolean" }).notNull().default(false),
    penSaved: integer("pen_saved").notNull().default(0),
    penMissed: integer("pen_missed").notNull().default(0),
    points: integer("points").notNull().default(0),
    /** Cambio de valor de mercado aplicado por este partido (para poder revertirlo). */
    valueDelta: integer("value_delta").notNull().default(0),
  },
  (t) => [uniqueIndex("stats_match_player_uq").on(t.matchId, t.playerId)],
);

export const leagues = sqliteTable("leagues", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Club de la liga: define plantilla inicial, mercado y calendario. */
  clubId: integer("club_id").notNull().references(() => clubs.id),
  name: text("name").notNull(),
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
  code: text("code").notNull().unique(),
  ownerId: integer("owner_id").references(() => users.id),
  startingCash: integer("starting_cash").notNull().default(20_000_000),
  maxMembers: integer("max_members").notNull().default(8),
  marketSize: integer("market_size").notNull().default(8),
  createdAt: integer("created_at").notNull(),
});

export const members = sqliteTable(
  "members",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    leagueId: integer("league_id").notNull().references(() => leagues.id),
    userId: integer("user_id").notNull().references(() => users.id),
    teamName: text("team_name").notNull(),
    cash: integer("cash").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [uniqueIndex("members_league_user_uq").on(t.leagueId, t.userId)],
);

/** Un jugador solo puede pertenecer a un equipo fantasy dentro de cada liga. */
export const ownerships = sqliteTable(
  "ownerships",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    leagueId: integer("league_id").notNull().references(() => leagues.id),
    memberId: integer("member_id").notNull().references(() => members.id),
    playerId: integer("player_id").notNull().references(() => players.id),
    boughtFor: integer("bought_for").notNull().default(0),
    acquiredAt: integer("acquired_at").notNull(),
  },
  (t) => [uniqueIndex("own_league_player_uq").on(t.leagueId, t.playerId), index("own_member_idx").on(t.memberId)],
);

export const lineups = sqliteTable(
  "lineups",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    memberId: integer("member_id").notNull().references(() => members.id),
    gameweekId: integer("gameweek_id").notNull().references(() => gameweeks.id),
    formation: text("formation").notNull(),
    /** JSON: number[] con los 11 titulares. */
    playerIds: text("player_ids").notNull(),
    captainId: integer("captain_id"),
  },
  (t) => [uniqueIndex("lineup_member_gw_uq").on(t.memberId, t.gameweekId)],
);

export type ListingStatus = "open" | "sold" | "unsold";

export const listings = sqliteTable(
  "listings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    leagueId: integer("league_id").notNull().references(() => leagues.id),
    playerId: integer("player_id").notNull().references(() => players.id),
    /** null = jugador libre ofrecido por el juego. */
    sellerMemberId: integer("seller_member_id").references(() => members.id),
    minPrice: integer("min_price").notNull(),
    closesAt: integer("closes_at").notNull(),
    status: text("status").$type<ListingStatus>().notNull().default("open"),
    winnerMemberId: integer("winner_member_id"),
    finalPrice: integer("final_price"),
  },
  (t) => [index("listings_league_idx").on(t.leagueId, t.status)],
);

export const bids = sqliteTable(
  "bids",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    listingId: integer("listing_id").notNull().references(() => listings.id),
    memberId: integer("member_id").notNull().references(() => members.id),
    amount: integer("amount").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [uniqueIndex("bids_listing_member_uq").on(t.listingId, t.memberId)],
);

export const activity = sqliteTable(
  "activity",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    leagueId: integer("league_id").notNull().references(() => leagues.id),
    text: text("text").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("activity_league_idx").on(t.leagueId, t.createdAt)],
);
