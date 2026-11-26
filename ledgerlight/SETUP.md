# Ledgerlight setup checklist

Follow these in order. Each step says where to click and what to paste.

---

## 1. Run it on your computer (2 minutes)

You need **Node.js 20.9 or newer** (check with `node -v`; download from nodejs.org if needed).

Open a terminal in the `ledgerlight` folder and run:

```bash
npm install
```

```bash
npm run dev
```

Open **http://localhost:3000** and click **Test with Sample Electrical Invoice**.
This works right away with no keys: it uses a built-in answer key and shows a "Demo mode" label.

---

## 2. Connect the AI reader (Anthropic API key)

1. Go to **https://console.anthropic.com** and sign in (or sign up).
2. Click **Billing** and add a little credit (a typical invoice costs a few cents to read).
3. Click **API Keys → Create Key**, name it `ledgerlight`, and copy the key (it starts with `sk-ant-`).
4. In the `ledgerlight` folder, copy `.env.example` to a new file named **`.env.local`**.
5. Paste the key after `ANTHROPIC_API_KEY=` and save.
6. Stop the app (Ctrl + C in the terminal) and run `npm run dev` again.

The header pill should now say **"AI reader: Claude"**.

> Keep `.env.local` private. Never email it or post it. It is already excluded from GitHub.

---

## 3. Connect Supabase (permanent online storage)

Until you do this, invoices are saved in a hidden `.data` folder on your computer, which is fine for testing.

1. Go to **https://supabase.com** → **New project**. Pick any name, a strong database password, and the region closest to you.
2. When it's ready, open **SQL Editor → New query**.
3. Open the file `supabase/setup.sql` from this project, copy **all** of it, paste it in, and click **Run**. You should see "Success".
4. Go to **Project Settings → API Keys** (on older dashboards: **Project Settings → API**):
   - Copy the **Project URL** and paste it after `SUPABASE_URL=` in `.env.local`.
   - Copy the **secret** key (`sb_secret_...`, or the legacy **service_role** key) and paste it after `SUPABASE_SECRET_KEY=`.
   - Do **not** use the "anon" or "publishable" key.
5. Restart the app (`Ctrl + C`, then `npm run dev`).

The header pill should now say **"Saved to Supabase"**.

---

## 4. Test with a real PDF

1. Grab a real supplier invoice PDF (electrical, plumbing or industrial parts).
2. Drag it onto the upload box (or click **Choose PDF files**).
3. Wait 15–60 seconds. The review desk opens with the PDF on the left and the fields on the right.
4. Check that:
   - Green fields match the PDF.
   - Yellow and red fields explain what's wrong in plain English. Click any item under **"What needs your eyes"** to jump to it.
   - Fixing a field turns it green instantly.
5. Click **Approve**, go back to the Inbox, and click **Excel** or **CSV** to download.

---

## 5. Put it online with Vercel

1. Put the `ledgerlight` folder in a **private** GitHub repository.
2. Go to **https://vercel.com → Add New → Project**, then import that repository.
3. Before clicking Deploy, open **Environment Variables** and add:
   - `ANTHROPIC_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY`
   - `APP_PASSWORD`: a password of your choice. **Required online**, because anyone with the link could otherwise see your invoices.
4. Click **Deploy**.

> On Vercel, Supabase is required. Without it, uploads go to temporary storage and disappear. The header warns you if this happens.

---

## Handy extras

| What | How |
|---|---|
| Use a cheaper/faster AI model | Add `ANTHROPIC_MODEL=claude-sonnet-5-5` to `.env.local` |
| Rebuild the sample PDF | `npm run make:sample` |
| Check the code for mistakes | `npm run typecheck` and `npm run lint` |
| Reset local test data | Delete the `.data` folder |
