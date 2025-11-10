import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// 既存の users テーブル
export const users = sqliteTable("users", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  email: text().notNull().unique(), // 重複防止
  password_hash: text().notNull(),  // 平文ではなくハッシュ
  created_at: text().default(sql`CURRENT_TIMESTAMP`), // 登録日時
  verified: integer("verified", { mode: "boolean" }).default(false) // 認証済みかどうか
});

// 🌟 新規追加：登録セッション用テーブル
export const reg_sessions = sqliteTable("reg_sessions", {
    // セッションID (Cookieでクライアントに渡す)
    session_id: text("session_id").primaryKey(),
    // 登録対象のメールアドレス (ユニーク)
    email: text("email").notNull().unique(), 
    // ワンタイム認証コード
    onetime_token: text("onetime_token"),
    // セッションの有効期限 (Unix Time)
    expires_at: integer("expires_at", { mode: "number" }).notNull(),
    // ユーザーが現在どのステップまで完了したかの状態 (0=メール送信済, 1=コード認証済)
    stage: integer("stage", { mode: "number" }).notNull().default(0), 
    // 作成日時
    created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});