import { expect, test } from '@playwright/test'
import { ROWS, RlsDb, USERS } from './rls/harness'

/**
 * Row Level Security tests against real Postgres running supabase/*.sql.
 * No browser: these prove the database itself refuses cross-user access,
 * which is what protects data even if someone bypasses the OurCal UI and
 * calls the Supabase REST API directly with the public anon key.
 */

let db: RlsDb

test.beforeEach(async () => {
  db = await RlsDb.create()
})

test.afterEach(async () => {
  await db.close()
})

const PRIVATE_TABLES = [
  'diary_entries',
  'profiles',
  'friendships',
  'chat_rooms',
  'chat_messages',
] as const

test.describe('signed-out visitor (anon key, no session)', () => {
  test("signed-out user cannot read another user's rows", async () => {
    for (const table of PRIVATE_TABLES) {
      const [{ count }] = await db.admin<{ count: number }>(
        `select count(*)::int as count from public.${table}`,
      )
      expect(count, `${table} should have seeded rows`).toBeGreaterThan(0)

      const visible = await db.as('anon', `select * from public.${table}`)
      expect(visible.rows, `anon must see no ${table} rows`).toHaveLength(0)
    }

    const targeted = await db.as(
      'anon',
      'select * from public.diary_entries where id = $1 or username = $2',
      [ROWS.bobPizza, 'bob'],
    )
    expect(targeted.rows).toHaveLength(0)

    await expect(
      db.as('anon', "select * from public.lookup_profile('alice')"),
    ).rejects.toThrow(/permission denied/)
  })

  test('signed-out user can browse the shared food catalog but not write anything', async () => {
    const foods = await db.as<{ name: string }>('anon', 'select name from public.shared_foods')
    expect(foods.rows.map((r) => r.name)).toEqual(['Bob protein bar'])

    await expect(
      db.as(
        'anon',
        `insert into public.diary_entries
          (id, username, entry_date, meal, name, servings, calories, protein, carbs, fat)
          values (gen_random_uuid(), 'bob', '2026-11-18', 'snack', 'Injected', 1, 1, 0, 0, 0)`,
      ),
    ).rejects.toThrow(/row-level security/)

    await expect(
      db.as(
        'anon',
        `insert into public.shared_foods
          (name, serving_label, calories, protein, carbs, fat, contributed_by)
          values ('Spam', '1', 1, 0, 0, 0, 'bob')`,
      ),
    ).rejects.toThrow(/row-level security/)

    const wiped = await db.as('anon', 'delete from public.diary_entries')
    expect(wiped.affectedRows).toBe(0)
  })
})

test.describe('signed-in user diary', () => {
  test('signed-in user sees only their own diary', async () => {
    const alice = await db.as<{ name: string; user_id: string }>(
      'alice',
      'select name, user_id from public.diary_entries order by name',
    )
    expect(alice.rows.map((r) => r.name)).toEqual(['Alice oats', 'Alice salad'])
    expect(new Set(alice.rows.map((r) => r.user_id))).toEqual(new Set([USERS.alice.id]))

    const bob = await db.as<{ name: string }>('bob', 'select name from public.diary_entries')
    expect(bob.rows.map((r) => r.name)).toEqual(['Bob pizza'])

    const carol = await db.as('carol', 'select * from public.diary_entries')
    expect(carol.rows).toHaveLength(0)

    const probing = await db.as(
      'alice',
      'select * from public.diary_entries where id = $1 or username = $2 or user_id = $3',
      [ROWS.bobPizza, 'bob', USERS.bob.id],
    )
    expect(probing.rows).toHaveLength(0)
  })

  test("signed-in user cannot create, change or delete another user's diary rows", async () => {
    await expect(
      db.as(
        'alice',
        `insert into public.diary_entries
          (id, user_id, username, entry_date, meal, name, servings, calories, protein, carbs, fat)
          values (gen_random_uuid(), $1, 'bob', '2026-11-18', 'snack', 'Planted', 1, 5000, 0, 0, 0)`,
        [USERS.bob.id],
      ),
    ).rejects.toThrow(/row-level security/)

    const edit = await db.as(
      'alice',
      'update public.diary_entries set calories = 1 where id = $1',
      [ROWS.bobPizza],
    )
    expect(edit.affectedRows).toBe(0)

    const remove = await db.as('alice', 'delete from public.diary_entries where id = $1', [
      ROWS.bobPizza,
    ])
    expect(remove.affectedRows).toBe(0)

    // What the app's upsert sends: same id as Bob's row, hoping to overwrite it.
    await expect(
      db.as(
        'alice',
        `insert into public.diary_entries
          (id, username, entry_date, meal, name, servings, calories, protein, carbs, fat)
          values ($1, 'alice', '2026-11-18', 'dinner', 'Hijack', 1, 1, 0, 0, 0)
          on conflict (id) do update set name = excluded.name`,
        [ROWS.bobPizza],
      ),
    ).rejects.toThrow(/row-level security/)

    const [bobRow] = await db.admin<{ name: string; calories: string }>(
      'select name, calories from public.diary_entries where id = $1',
      [ROWS.bobPizza],
    )
    expect(bobRow).toEqual({ name: 'Bob pizza', calories: '900' })

    const own = await db.as(
      'alice',
      'update public.diary_entries set servings = 2 where id = $1',
      [ROWS.aliceOats],
    )
    expect(own.affectedRows).toBe(1)
  })
})

test.describe('profiles, DMs, friends and shared foods', () => {
  test('profiles: read only your own row; find others by exact username; usernames are permanent', async () => {
    const mine = await db.as<{ username: string }>('alice', 'select username from public.profiles')
    expect(mine.rows.map((r) => r.username)).toEqual(['alice'])

    const card = await db.as<{ username: string; display_name: string }>(
      'alice',
      "select * from public.lookup_profile('  BOB ')",
    )
    expect(card.rows).toEqual([{ username: 'bob', display_name: 'BOB', avatar_url: null }])

    const missing = await db.as('alice', "select * from public.lookup_profile('nobody')")
    expect(missing.rows).toHaveLength(0)

    const hijack = await db.as(
      'alice',
      "update public.profiles set display_name = 'pwned' where username = 'bob'",
    )
    expect(hijack.affectedRows).toBe(0)

    await expect(
      db.as('alice', "update public.profiles set username = 'alice2' where username = 'alice'"),
    ).rejects.toThrow(/username cannot be changed/)

    await expect(
      db.as(
        'alice',
        "insert into public.profiles (user_id, username, display_name) values ($1, 'bob2', 'x')",
        [USERS.bob.id],
      ),
    ).rejects.toThrow(/row-level security/)
  })

  test('profiles: username with a space fails the format check', async () => {
    const daveId = '00000000-0000-4000-8000-00000000000d'
    await db.admin('insert into auth.users (id, email) values ($1, $2)', [
      daveId,
      'dave@example.com',
    ])
    await expect(
      db.asUserId(
        daveId,
        "insert into public.profiles (username, display_name) values ('test alpha', 'Dave')",
      ),
    ).rejects.toThrow(/profiles_username_format|check constraint/i)
  })

  test('DMs: only members can read a room or its messages, and only post as themselves', async () => {
    for (const member of ['alice', 'carol'] as const) {
      const rooms = await db.as(member, 'select id from public.chat_rooms')
      expect(rooms.rows).toEqual([{ id: ROWS.aliceCarolDm }])
      const messages = await db.as(member, 'select body from public.chat_messages order by created_at')
      expect(messages.rows).toHaveLength(2)
    }

    const bobRooms = await db.as('bob', 'select * from public.chat_rooms')
    expect(bobRooms.rows).toHaveLength(0)
    const bobMessages = await db.as('bob', 'select * from public.chat_messages where room_id = $1', [
      ROWS.aliceCarolDm,
    ])
    expect(bobMessages.rows).toHaveLength(0)

    await expect(
      db.as(
        'bob',
        `insert into public.chat_messages (room_id, author_username, author_name, body)
          values ($1, 'bob', 'BOB', 'let me in')`,
        [ROWS.aliceCarolDm],
      ),
    ).rejects.toThrow(/row-level security/)

    await expect(
      db.as(
        'alice',
        `insert into public.chat_messages (room_id, author_username, author_name, body)
          values ($1, 'carol', 'CAROL', 'i am carol')`,
        [ROWS.aliceCarolDm],
      ),
    ).rejects.toThrow(/row-level security/)

    const edit = await db.as('alice', "update public.chat_messages set body = 'edited'")
    expect(edit.affectedRows).toBe(0)
  })

  test('rooms: you can only create a room you are in, with people on your friend list', async () => {
    await expect(
      db.as(
        'alice',
        "insert into public.chat_rooms (title, member_usernames) values ('@bob', $1)",
        [['alice', 'bob']],
      ),
    ).rejects.toThrow(/row-level security/)

    await expect(
      db.as(
        'alice',
        "insert into public.chat_rooms (title, member_usernames) values ('bob and carol', $1)",
        [['bob', 'carol']],
      ),
    ).rejects.toThrow(/row-level security/)

    const ok = await db.as(
      'alice',
      "insert into public.chat_rooms (title, member_usernames) values ('Group', $1) returning title",
      [['alice', 'carol']],
    )
    expect(ok.rows).toEqual([{ title: 'Group' }])
  })

  test('friendships: your list is private and you can only add real usernames as yourself', async () => {
    const aliceList = await db.as<{ friend_username: string }>(
      'alice',
      'select friend_username from public.friendships',
    )
    expect(aliceList.rows.map((r) => r.friend_username)).toEqual(['carol'])

    const bobList = await db.as('bob', 'select * from public.friendships')
    expect(bobList.rows).toHaveLength(0)

    const insertFriend = `insert into public.friendships (owner_username, friend_username, display_name)
      values ($1, $2, 'x')`
    await expect(db.as('bob', insertFriend, ['alice', 'bob'])).rejects.toThrow(/row-level security/)
    await expect(db.as('bob', insertFriend, ['bob', 'ghost'])).rejects.toThrow(/row-level security/)
    await expect(db.as('bob', insertFriend, ['bob', 'bob'])).rejects.toThrow(/row-level security/)

    const added = await db.as('bob', `${insertFriend} returning friend_username`, ['bob', 'alice'])
    expect(added.rows).toEqual([{ friend_username: 'alice' }])

    const removeOthers = await db.as('bob', 'delete from public.friendships')
    expect(removeOthers.affectedRows).toBe(0)
  })

  test('shared foods: public catalog, credited to the real contributor, only they can delete', async () => {
    await expect(
      db.as(
        'alice',
        `insert into public.shared_foods
          (name, serving_label, calories, protein, carbs, fat, contributed_by)
          values ('Fake', '1', 1, 0, 0, 0, 'bob')`,
      ),
    ).rejects.toThrow(/row-level security/)

    const shared = await db.as(
      'alice',
      `insert into public.shared_foods
        (name, serving_label, calories, protein, carbs, fat, contributed_by)
        values ('Alice granola', '1 cup', 400, 10, 60, 12, 'alice') returning contributed_by`,
    )
    expect(shared.rows).toEqual([{ contributed_by: 'alice' }])

    const notMine = await db.as('alice', "delete from public.shared_foods where name = 'Bob protein bar'")
    expect(notMine.affectedRows).toBe(0)
    const mine = await db.as('bob', "delete from public.shared_foods where name = 'Bob protein bar'")
    expect(mine.affectedRows).toBe(1)
  })
})
