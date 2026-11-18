# OurCal security model

OurCal works in two modes:

- **Local-first (no keys).** If `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are not set, nothing leaves the browser. There is no account, no sign-in, and no network calls to a database. Everything on this page only applies to cloud mode.
- **Cloud (keys set).** The app talks to Supabase. Signed-out visitors can still use the app locally and browse the shared food catalog. Signing in with an email link turns on sync for your diary, friends, and chats.

## Why the database has to enforce this

The Supabase **anon key** ships inside the JavaScript bundle. Anyone can copy it out of the browser and call the Supabase REST API directly, skipping OurCal's UI completely. So "the app only asks for my rows" protects nothing. The only real guard is **Row Level Security (RLS)** in Postgres: for every query, Postgres checks a rule (a *policy*) against each row and silently hides rows the caller isn't allowed to see, or rejects writes that break the rule.

The old demo schema had RLS turned on, but every policy was `using (true)`, which means "everyone may do everything". This branch replaces those with per-user rules in [`supabase/auth_rls.sql`](../supabase/auth_rls.sql).

The `service_role` key bypasses RLS entirely. It is never used by the app. It is only used by the optional live test (in Node, on your machine or in CI) to create and delete throwaway test users.

## How sign-in works

1. On **Profile → Cloud account**, you enter your email and press **Email me a sign-in link**. The app calls `supabase.auth.signInWithOtp({ email })`.
2. Supabase emails a one-time link. Opening it sends you back to `/app` with a session token in the URL. `supabase-js` reads it, stores the session, and from then on every request carries a signed JWT (JSON Web Token) saying who you are.
3. In Postgres, `auth.uid()` reads the user id out of that JWT. Every policy below is written in terms of `auth.uid()`. A signed-out request has no user id, so `auth.uid()` is `NULL` and no "own row" rule can match.
4. After sign-in the app *claims* your username (creates your `profiles` row tied to your account), then syncs. **Sign out** ends the session. Your local copy stays in the browser.

## Ownership model

Every table now has a column that stores the owning account's id from `auth.users`:

| Table | Owner column |
| --- | --- |
| `profiles` | `user_id` |
| `diary_entries` | `user_id` |
| `friendships` | `owner_id` |
| `chat_rooms` | `created_by` |
| `chat_messages` | `author_id` |
| `shared_foods` | `contributor_id` |

These columns default to `auth.uid()`, so the app never has to send them, and the policies refuse any attempt to send someone else's id.

Usernames are still used as **labels** (who a friend is, who is in a chat room). They are trusted only after being checked against your account: `current_username()` looks up the username that belongs to `auth.uid()`. A trigger makes a username **permanent once claimed**. Otherwise someone could rename themselves away from "alice" and let a new account claim "alice" to get into rooms and friend lists that mention that name.

Rows created before this migration have no owner (`NULL`). No policy can match `NULL`, so those rows are invisible to every client. They stay in the database, and you can clean them up from the Supabase dashboard.

## Helper functions

Policies sometimes need to look at another table that the caller can't read directly, for example "what is *my* username?" when `profiles` only lets you see your own row. These helpers are `security definer`, meaning they run with the table owner's rights. Each one only answers a narrow question about the caller, so none of them can be used to list other people's data. They are not callable by signed-out visitors.

- **`current_username()`**: the username claimed by the signed-in account, or nothing.
- **`is_claimed_username(name)`**: yes/no, does a real account own this username.
- **`is_room_member(room)`**: yes/no, is the signed-in user in this chat room.
- **`members_are_my_friends(names)`**: yes/no, is everyone in this list (other than me) on my friend list. This one is *not* `security definer`. It only reads your own friendships, which you're allowed to see anyway.
- **`lookup_profile(name)`**: for "Add friend by @username". Given an exact username, it returns only that person's public card (username, display name, photo). It never lists profiles, never searches partially, and never returns account ids or emails.

## Every policy, in plain English

"No policy" means **denied**: if an action isn't listed for a table, no client can do it.

### `profiles`

- **profiles: read own**: You can only read your own profile row. Other people's profiles are hidden. To find a friend you use `lookup_profile`, which shows only their public card.
- **profiles: create own**: You can create a profile only for your own account. You can't create one owned by someone else.
- **profiles: update own**: You can change your own display name and photo. You can't touch anyone else's profile, and the trigger blocks changing your username or handing the row to another account.
- *No delete policy*: profiles are removed only when the account is deleted (`on delete cascade`).

### `diary_entries` (fully private)

- **diary: read own**: You see only diary rows you own. Filtering by someone else's row id, username, or user id returns nothing.
- **diary: create own**: New rows must belong to you. Sending another person's `user_id` is rejected.
- **diary: update own**: You can only edit your own rows, and you can't reassign a row to someone else. If the app's "upsert" happens to reuse an id that belongs to another user, Postgres raises an error instead of overwriting their row.
- **diary: delete own**: You can only delete your own rows. "Delete everything" only deletes yours.

### `friendships` (your list is yours)

- **friends: read own list**: You see only the friend list you own. Nobody can see who you've added.
- **friends: add to own list**: You can add a friend only to your own list, under your own claimed username, never yourself, and only if that username belongs to a real account.
- **friends: update own list**: Same rules as adding. This exists because the app saves friends with an upsert.
- **friends: remove from own list**: You can only remove friends from your own list.

Friendship is one-directional, like following. Adding someone doesn't put you on their list.

### `chat_rooms` (DMs and small groups)

- **rooms: members read**: You can see a room only if your username is in its member list.
- **rooms: create with friends**: You can create a room only if you're in it, and everyone else in it must already be on *your* friend list. You can't drop strangers into a group or create a room for two other people.
- *No update or delete policy*: you can't change a room's members after it exists, so nobody can add themselves to someone else's DM.

### `chat_messages`

- **messages: members read**: You can read messages only in rooms you're a member of. Realtime (live updates) applies the same rule, because Supabase checks RLS before delivering each change to a signed-in subscriber.
- **messages: members post as self**: You can post only into rooms you belong to, and only as yourself: the author id must be your account and the author username must be your claimed username.
- *No update or delete policy*: messages can't be edited or deleted, by you or anyone else.

### `shared_foods` (public catalog)

- **foods: anyone reads**: The community food catalog is public, including to signed-out visitors. It holds nutrition facts, not personal data.
- **foods: share as self**: Only signed-in users can add a food, and the credit (`contributed_by`) must be their own claimed username. You can't post a food "by" someone else.
- **foods: contributor deletes**: Only the person who shared a food can remove it.
- *No update policy*: shared foods can't be edited after sharing, so nobody can quietly change the calorie counts other people rely on.

## How this is tested

[`e2e/rls.spec.ts`](../e2e/rls.spec.ts) runs on every `npm run test:e2e`, locally and in CI, with no Supabase account needed. It starts real Postgres in-process ([PGlite](https://pglite.dev), Postgres compiled to WebAssembly), adds the small piece of Supabase the SQL depends on (`anon` / `authenticated` roles, `auth.users`, `auth.uid()` read from JWT claims, and Supabase's default "grant everything to anon and authenticated" table privileges), then runs `schema.sql`, `social.sql` and `auth_rls.sql` unchanged. Because the grants are wide open, every denial the tests see comes from RLS.

Test data is written *through* the policies, each user writing their own rows, so the tests also prove the rules don't block legitimate use. Each test then queries as a signed-out visitor or as a specific user and checks:

- signed-out visitors read zero rows from `diary_entries`, `profiles`, `friendships`, `chat_rooms` and `chat_messages` (after confirming the rows exist), can't call `lookup_profile`, and can't write anything;
- a signed-in user sees only their own diary, can't find another user's rows by id, username or user id, and can't insert, update, delete or upsert-overwrite them;
- profile, DM, room, friendship and shared-food rules behave as described above.

To check the tests themselves, the policies were temporarily weakened (diary readable by everyone, rooms readable by everyone, friendship ownership checks removed). Four tests failed as expected, showing the leaked rows. Then the real policies were restored.

What this doesn't cover: Supabase's own services (the REST layer, Realtime, the auth email). That's what the live test is for.

### Running the live tests

[`e2e/auth-live.spec.ts`](../e2e/auth-live.spec.ts) runs the real app against a real Supabase **test** project (never production). Without credentials it reports **skipped**, never passed. To run it:

1. Create a separate Supabase project for testing and run the three SQL files in order (see below).
2. Under **Authentication → URL Configuration**, add `http://127.0.0.1:5174/app` to the Redirect URLs.
3. Export the variables and run Playwright:

```bash
export SUPABASE_TEST_URL=https://<test-project>.supabase.co
export SUPABASE_TEST_ANON_KEY=<anon key>
export SUPABASE_TEST_SERVICE_ROLE_KEY=<service role key>   # test project only
npm run test:e2e
```

The spec creates two throwaway users with diary rows. It checks that the anon key alone can't read them through the REST API. Then it signs one user in through a real magic link in the browser and checks that the Today screen shows that user's food and not the other user's. Afterwards it deletes both users. In CI, add the same three names as repository secrets to turn it on.

## Setting up a Supabase project

1. **SQL Editor**: run `supabase/schema.sql`, then `supabase/social.sql`, then `supabase/auth_rls.sql`. All three are safe to re-run.
2. **Authentication → Providers**: make sure **Email** is enabled (magic links are part of it).
3. **Authentication → URL Configuration**: set the Site URL to your deployment (for example `https://ourcal-pi.vercel.app`) and add `https://ourcal-pi.vercel.app/app` and `http://localhost:5173/app` to Redirect URLs.
4. **Vercel / `.env.local`**: set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (the anon key, never the service role key).
5. Supabase's built-in email sender is rate-limited and meant for testing. Set up custom SMTP before real users rely on it.

## Known limits

- `lookup_profile` lets a signed-in user check whether an exact username exists. That's needed for "add friend by @username". It only works one exact name at a time, and only when signed in.
- Being added to a DM doesn't require your consent. Someone who has added you as a friend can start a room with you. There's no block list yet.
- Profile photos are stored as data URLs in `profiles.avatar_url` (capped in the client). Moving them to Supabase Storage with its own policies would be the next step.
- The local copy in the browser isn't encrypted. Anyone with access to the device and browser profile can read it, as with any local-first app.
