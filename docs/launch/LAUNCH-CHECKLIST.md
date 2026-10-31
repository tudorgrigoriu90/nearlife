# Launch checklist (Director), in order

Everything only you can do to take Nearby from "built" to "on Google Play", in the order that
avoids waiting. Each step names **where** to go and **what** to click. Details for the payment
steps are in [PAYMENTS-SETUP.md](PAYMENTS-SETUP.md), the store forms in
[PLAY-STORE-LISTING.md](PLAY-STORE-LISTING.md), and crash reporting in [SENTRY-SETUP.md](SENTRY-SETUP.md).

**Never paste in the chat:** the Google service-account JSON file, the RevenueCat webhook secret,
any key starting with `sk_` or `sb_secret_`. **Fine to paste:** the `goog_…` RevenueCat key, the
Sentry DSN, the Supabase URL and the `sb_publishable_…` key (they are public by design).

Already done: Google Play developer account ✓ · RevenueCat account ✓ (public key `goog_WEPD…`).

---

## Step 1 — Play Console: finish the account (10 min, then Google may take days)
1. Go to **play.google.com/console**. If a banner says identity or device verification is
   pending, finish it first (personal accounts verify ID and an Android phone).
2. **Settings** (the gear in the left menu, on the "All apps" page) → **Payments profile** →
   create it: legal name, address, **bank account** (where Google pays you). Country Sweden. This
   is what lets you sell anything.

## Step 2 — Play Console: create the app (5 min)
1. **All apps → Create app**.
2. App name **Nearby** · Default language **Swedish – sv-SE** (or English) · **App** · **Free**.
3. Tick the two declarations → **Create app**.
4. The package name is fixed by the first upload: it will be **`com.nearlife.nearby`** and can
   never change. ⚠️ If you want a different app name than "Nearby" (there are other apps called
   Nearby, and a Google feature), decide now. Renaming the listing later is fine; the package
   stays.

## Step 3 — First build, uploaded to internal testing (30 min + ~20 min cloud build)
On your computer, in the project folder:
1. Node **22 LTS** (Expo needs ≥ 20.19.4; check with `node -v`). `git pull` for the latest
   config, then `npm install`, `npm install -g eas-cli` and `eas login` (your Expo account).
   If eas-cli prints "env:create is deprecated, use env:set", that is only a warning: the
   commands below still work.
2. Give the cloud build the public settings (same values as your `.env.local`). Choose
   **Plain text** when asked:
   ```
   eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "<Supabase URL>" --environment development --environment preview --environment production
   eas env:create --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value "<sb_publishable_…>" --environment development --environment preview --environment production
   eas env:create --name EXPO_PUBLIC_REVENUECAT_ANDROID_KEY --value "goog_WEPDbQTnKelAXFdMfHOKSnfqkGi" --environment development --environment preview --environment production
   ```
3. The Firebase file for notifications, as a **Secret** file:
   `eas env:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --environment development --environment preview --environment production`
4. (If Step 9 is done first, also add `EXPO_PUBLIC_SENTRY_DSN` the same way. Otherwise the next
   build picks it up.)
5. `eas build --platform android --profile production` → when done, download the **`.aab`**.
6. Play Console → your app → **Test and release → Testing → Internal testing → Create new
   release**. Accept **Play App Signing** if asked → upload the `.aab` → release name e.g.
   "1.0 internal" → **Next → Save and publish**.
7. Same page, **Testers** tab → **Create email list** → add your own Gmail → save → copy the
   **opt-in link** → open it on your Android phone → accept → install Nearby from Play.

## Step 4 — Play Console: the 24 products (30 min; possible only after Step 3)
**Monetize with Play → Products → One-time products → Create product**, for each:
- `full_game` · "Full Game" · "Unlimited catching, one payment" · **49 SEK**
- `family` · "Family" · "The Full Game for up to 5 people" · **99 SEK**
- `all_regions` · "All of Sweden" · "Every county, not just your home" · **99 SEK**
- `region_swe_1` … `region_swe_21` · "<County> pack" · **29 SEK** each (the ID → county table is in
  PAYMENTS-SETUP.md Part E).

For each: set the Swedish price (let Google convert other countries) → **Save → Activate**. The
Product ID is permanent; copy it exactly.

## Step 5 — Connect RevenueCat to Google Play (20 min; Google can take up to 36 h to accept it)
1. **console.cloud.google.com** → pick the project **nearby-nearlife** (the Firebase one).
2. **APIs & Services → Library**: enable **Google Play Android Developer API** and **Google Play
   Developer Reporting API**.
3. **IAM & Admin → Service accounts → Create service account** · name `revenuecat` → roles
   **Pub/Sub Editor** and **Monitoring Viewer** → Done.
4. Open it → **Keys → Add key → Create new key → JSON** → a file downloads. Keep it private.
5. Copy the account's email (`revenuecat@nearby-nearlife.iam.gserviceaccount.com`).
6. Play Console (the **All apps** level) → **Users and permissions → Invite new users** → paste the
   email → **App permissions → Add app → Nearby** → tick **View app information and download bulk
   reports**, **View financial data**, **Manage orders and subscriptions** → **Invite user**.
7. **app.revenuecat.com** → project **Nearlife** → **Apps & providers** → your Play Store app →
   check the package is `com.nearlife.nearby` → **Service account credentials JSON** → upload the
   file from 4 → Save. It may say "invalid" for up to 36 h; carry on.

## Step 6 — RevenueCat: products, entitlements, restore (10 min)
In app.revenuecat.com, project Nearlife:
1. **Product catalog → Products → Import** (from Play) → select all 24.
2. **Product catalog → Entitlements → + New**:
   - identifier **`full_game`** → **Attach** product `full_game`;
   - identifier **`family`** → **Attach** product `family`.
   - The county packs and `all_regions` need no entitlement: our server recognises them by
     product ID.
3. **Project settings → General → Restore behavior → "Transfer to new App User ID"** → Save.
   (Without this, someone who reinstalls without linking an email can't restore a purchase.)

## Step 7 — Purchases reach our server: the webhook (10 min)
1. Make a long random password (40+ characters, from a password manager). This is the webhook
   secret. **Don't send it to me.**
2. **supabase.com/dashboard** → project **nearlife** (`subjdoiicfmiimtvlzsg`) → **Edge Functions →
   Secrets** → **Add new secret** · name `REVENUECAT_WEBHOOK_SECRET` · value: the password → Save.
3. app.revenuecat.com → **Integrations → Webhooks → + New webhook**:
   - URL: `https://subjdoiicfmiimtvlzsg.supabase.co/functions/v1/revenuecat-webhook`
   - Authorization header value: `Bearer ` + the password (the word Bearer, one space, password)
   - Environment: **both** · Events: **all** → Save → **Send test event** → expect **200**. A
     **403** means the two copies of the password differ.

## Step 8 — A free test purchase (10 min)
1. Play Console, **All apps** level → **Settings → License testing** → add your Gmail → Save.
2. On your phone (the build from Step 3): **Settings → Full Game & Family → Buy Full Game** → pick
   the test card → confirm → within seconds **✓ Unlocked**.
3. Also try **Counties → open a county pack**, and **Restore purchases**.
4. **Tell me.** I check the database rows the webhook wrote and close the purchase tasks.

## Step 9 — Crash reporting (10 min) — see SENTRY-SETUP.md
sentry.io → sign up with **EU data storage** → React Native project `nearby` → paste me the
**DSN** → add it to EAS (`EXPO_PUBLIC_SENTRY_DSN`) → accept Sentry's DPA.

## Step 10 — Privacy policy and the account-deletion page, published (30 min)
Google Play needs two public web addresses: the **privacy policy** and a **"how to delete your
account" page**.
1. Send the 🆕 passages of `docs/legal/PRIVACY-POLICY.md` to your legal reviewer, plus one
   question: does GDPR Art. 7(1) call for a log of analytics consents?
2. Tell me your **controller name, address and contact email** for the bracketed fields.
3. Create a **public** GitHub repository named **`nearby-site`** (github.com → New repository →
   Public → create). Tell me when it exists. I publish the privacy policy and the deletion page
   there with GitHub Pages (free), and send you the two URLs.

## Step 11 — Play Console: App content forms (45 min)
Your app → **Policy and programs → App content**. Answers are in PLAY-STORE-LISTING.md:
- **Privacy policy:** the URL from Step 10.
- **App access:** all functionality available without special access (no login wall).
- **Ads:** No.
- **Content rating:** questionnaire, expected Everyone / PEGI 3.
- **Target audience:** 13 and older; not designed for children.
- **Data safety:** fill the table from PLAY-STORE-LISTING.md, with the **Delete account URL** from
  Step 10.
- **Financial features, health, government, news:** none.

## Step 12 — Store listing, closed test, then production
1. **Grow users → Store presence → Main store listing:** paste the name, short and full
   description; upload the **512×512 icon**, a **1024×500 feature graphic** and **2–8 phone
   screenshots** (take them from your phone build).
2. **Testing → Closed testing → Create track:** upload the same build, add **at least 12
   testers** (emails) and run it for **14 days**. This is required for personal developer
   accounts before production. The Kronoberg testers (T-038) can be these people.
3. After 14 days: **Production → Create new release** → submit for review (T-098).

---

When you finish a step, just tell me which one. I verify everything I can see from my side
(products, webhook rows, database, live pages) and close the matching tasks.
