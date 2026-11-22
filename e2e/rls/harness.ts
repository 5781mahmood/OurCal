import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite, type Transaction } from '@electric-sql/pglite'

/**
 * Real Postgres (PGlite = Postgres compiled to WebAssembly) running the exact
 * supabase/*.sql files, plus a minimal copy of what Supabase provides:
 * the anon / authenticated roles, auth.users, auth.uid(), and Supabase's
 * default "grant everything to anon + authenticated" privileges. Because those
 * grants are wide open, any denial these tests observe comes from RLS.
 */

const SUPABASE_STUB = `
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key, email text unique);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid
$$;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
create publication supabase_realtime;
`

const MIGRATIONS = ['schema.sql', 'social.sql', 'auth_rls.sql']

export const USERS = {
  alice: { id: '00000000-0000-4000-8000-00000000000a', email: 'alice@example.com', username: 'alice' },
  bob: { id: '00000000-0000-4000-8000-00000000000b', email: 'bob@example.com', username: 'bob' },
  carol: { id: '00000000-0000-4000-8000-00000000000c', email: 'carol@example.com', username: 'carol' },
} as const

export type UserKey = keyof typeof USERS
export type Caller = UserKey | 'anon'

export const ROWS = {
  aliceOats: '10000000-0000-4000-8000-000000000001',
  aliceSalad: '10000000-0000-4000-8000-000000000002',
  bobPizza: '20000000-0000-4000-8000-000000000001',
  aliceCarolDm: '30000000-0000-4000-8000-000000000001',
} as const

export class RlsDb {
  private constructor(private readonly db: PGlite) {}

  static async create(): Promise<RlsDb> {
    const db = new PGlite()
    await db.exec(SUPABASE_STUB)
    for (const file of MIGRATIONS) {
      await db.exec(readFileSync(join(process.cwd(), 'supabase', file), 'utf8'))
    }
    const rls = new RlsDb(db)
    await rls.seed()
    return rls
  }

  /**
   * Run SQL the way PostgREST does for a request: switch to the caller's role
   * and expose their JWT claims, inside a transaction that is always rolled
   * back so tests never leak writes into each other.
   */
  async as<T = Record<string, unknown>>(
    caller: Caller,
    sql: string,
    params: unknown[] = [],
  ): Promise<{ rows: T[]; affectedRows: number }> {
    let result: { rows: T[]; affectedRows: number } | undefined
    await this.db
      .transaction(async (tx: Transaction) => {
        await this.enter(tx, caller)
        const res = await tx.query<T>(sql, params)
        result = { rows: res.rows, affectedRows: res.affectedRows ?? 0 }
        await tx.rollback()
      })
      .catch((err: unknown) => {
        if (result) return
        throw err
      })
    return result!
  }

  /** Same as `as`, but commits. Used for seeding through the real policies. */
  async commitAs(caller: Caller, sql: string, params: unknown[] = []) {
    await this.db.transaction(async (tx: Transaction) => {
      await this.enter(tx, caller)
      await tx.query(sql, params)
    })
  }

  /** Superuser view, bypassing RLS. Only for assertions about what exists. */
  async admin<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    return (await this.db.query<T>(sql, params)).rows
  }

  /** Authenticated session for a user id that is not in the seeded USERS map. */
  async asUserId<T = Record<string, unknown>>(
    userId: string,
    sql: string,
    params: unknown[] = [],
  ): Promise<{ rows: T[]; affectedRows: number }> {
    let result: { rows: T[]; affectedRows: number } | undefined
    await this.db
      .transaction(async (tx: Transaction) => {
        await tx.exec('set local role authenticated')
        await tx.query(`select set_config('request.jwt.claims', $1, true)`, [
          JSON.stringify({ sub: userId, role: 'authenticated' }),
        ])
        const res = await tx.query<T>(sql, params)
        result = { rows: res.rows, affectedRows: res.affectedRows ?? 0 }
        await tx.rollback()
      })
      .catch((err: unknown) => {
        if (result) return
        throw err
      })
    return result!
  }

  async close() {
    await this.db.close()
  }

  private async enter(tx: Transaction, caller: Caller) {
    if (caller === 'anon') {
      await tx.exec('set local role anon')
      await tx.query(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ role: 'anon' }),
      ])
      return
    }
    await tx.exec('set local role authenticated')
    await tx.query(`select set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ sub: USERS[caller].id, role: 'authenticated' }),
    ])
  }

  /** Every row is written by its owner through the policies, not as superuser. */
  private async seed() {
    for (const user of Object.values(USERS)) {
      await this.admin('insert into auth.users (id, email) values ($1, $2)', [user.id, user.email])
    }
    for (const [key, user] of Object.entries(USERS) as [UserKey, (typeof USERS)[UserKey]][]) {
      await this.commitAs(
        key,
        `insert into public.profiles (username, display_name) values ($1, $2)`,
        [user.username, user.username.toUpperCase()],
      )
    }

    const diary = `insert into public.diary_entries
      (id, username, entry_date, meal, name, servings, calories, protein, carbs, fat)
      values ($1, $2, '2026-11-18', $3, $4, 1, $5, 10, 20, 5)`
    await this.commitAs('alice', diary, [ROWS.aliceOats, 'alice', 'breakfast', 'Alice oats', 300])
    await this.commitAs('alice', diary, [ROWS.aliceSalad, 'alice', 'lunch', 'Alice salad', 420])
    await this.commitAs('bob', diary, [ROWS.bobPizza, 'bob', 'dinner', 'Bob pizza', 900])

    const friend = `insert into public.friendships (owner_username, friend_username, display_name)
      values ($1, $2, $3)`
    await this.commitAs('alice', friend, ['alice', 'carol', 'CAROL'])
    await this.commitAs('carol', friend, ['carol', 'alice', 'ALICE'])

    await this.commitAs(
      'alice',
      `insert into public.chat_rooms (id, title, member_usernames) values ($1, '@carol', $2)`,
      [ROWS.aliceCarolDm, ['alice', 'carol']],
    )
    const message = `insert into public.chat_messages (room_id, author_username, author_name, body)
      values ($1, $2, $3, $4)`
    await this.commitAs('alice', message, [ROWS.aliceCarolDm, 'alice', 'ALICE', 'hey carol'])
    await this.commitAs('carol', message, [ROWS.aliceCarolDm, 'carol', 'CAROL', 'hey alice'])

    await this.commitAs(
      'bob',
      `insert into public.shared_foods
        (name, serving_label, calories, protein, carbs, fat, contributed_by)
        values ('Bob protein bar', '1 bar', 210, 20, 22, 7, 'bob')`,
    )
  }
}
