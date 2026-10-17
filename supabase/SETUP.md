# Supabase setup (about 5 minutes)

This powers the live guestbook and the real visitor counter. Supabase's free tier is plenty for a hackathon.

1. Go to https://supabase.com and sign up (GitHub sign-in is quickest).
2. Click **New project**. Name it `toby-homepage`, choose a database password (save it somewhere; the site never needs it), pick the region closest to you (Mumbai for India), and click **Create new project**. Wait a minute or two for it to finish.
3. In the left sidebar open **SQL Editor**, click **New query**, paste the whole of `supabase/setup.sql`, and click **Run**. You should see "Success. No rows returned".
4. Open **Project Settings > API** (or **Connect** at the top). Copy two values:
   - **Project URL**, which looks like `https://abcdefgh.supabase.co`
   - The **anon public** key, a long string starting with `eyJ`, or a key starting with `sb_publishable_` on newer projects
5. Send both to Claude in chat. Don't send the `service_role` or secret key; that one must stay private.

The anon/publishable key is designed to sit in public website code. The rules in `setup.sql` only let visitors read notes, add notes, and add one to the counter. Nobody can edit or delete anything through it.

## Before you submit: clear test data

While building, Claude pinned one test wish (from "Snorbit") and test visits bumped the counter. To start fresh, run this in **SQL Editor**:

```sql
delete from public.guestbook;
update public.site_counter set visits = 0 where id = 1;
```

To remove a single rude wish later, open **Table Editor > guestbook**, tick the row and click **Delete**.
