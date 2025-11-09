import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  email: text().notNull().unique(), // 重複防止
  password_hash: text().notNull(),  // 平文ではなくハッシュ
  created_at: text().default(sql`CURRENT_TIMESTAMP`), // 登録日時
  verified: integer("verified", { mode: "boolean" }).default(false) // 認証済みかどうか
});
