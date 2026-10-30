# Payments setup — step by step (Director)

This takes you from "I have a RevenueCat account" to a successful **test purchase** (no real
money). Do the parts in order: Google only lets you create products after a build containing
billing has been uploaded.

Screens in Google and RevenueCat get renamed now and then. If a label below doesn't match exactly,
look for the closest one; the steps stay the same.

**Never paste these in the chat or commit them:** the service-account JSON file, the webhook secret,
any key starting with `sk_`. The `goog_…` key and the Supabase URL/publishable key are public and
fine.

---

## Part A — Google Play developer account (skip if you have one)

1. Go to **play.google.com/console/signup**. Sign in with the Google account that should own the
   app.
2. Choose **Yourself** (personal) or **An organization** (a company with a D-U-N-S number).
3. Pay the one-time **$25** fee and complete identity verification. This can take a few days.

> ⚠️ **Personal accounts:** Google requires a **closed test with at least 12 testers for 14 days**
> before you may publish to everyone. Internal testing (used below) has no such rule, so payments
> can be tested right away, but plan the 14 days before launch.

## Part B — Payments profile (needed to sell anything)

1. In Play Console, open **Settings → Payments profile** (from the left menu on the "All apps"
   page).
2. Create the profile: legal name, address, bank account for payouts. This is where Google sends
   your money.

## Part C — Create the app in Play Console

1. **All apps → Create app.**
2. App name: **Nearby**. Default language: Swedish (or English). App or game: **App**. Free or
   paid: **Free**. It's free to download; the purchases are inside it.
3. Tick the declarations and press **Create app**.

## Part D — Make a build and upload it

You do this on your computer, in the project folder (where you run `npx expo start`).

1. Install the build tool and sign in with your Expo account:
   ```
   npm install -g eas-cli
   eas login
   ```
2. Give the cloud build the app's public settings. Use the **same values as in your `.env.local`**.
   When asked for visibility, choose **Plain text** for these three, since they're public keys:
   ```
   eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "<your Supabase URL>" --environment development --environment preview --environment production
   eas env:create --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value "<your publishable key>" --environment development --environment preview --environment production
   eas env:create --name EXPO_PUBLIC_REVENUECAT_ANDROID_KEY --value "goog_WEPDbQTnKelAXFdMfHOKSnfqkGi" --environment development --environment preview --environment production
   ```
3. Give it the Firebase file as a **secret file**. Notifications need it, and it is not in git.
   Choose **Secret** when asked:
   ```
   eas env:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --environment development --environment preview --environment production
   ```
4. Also add `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_WEPDbQTnKelAXFdMfHOKSnfqkGi` as a new line in
   your **`.env.local`**, so local runs have it too.
5. Build the store version (~15–25 min in the cloud):
   ```
   eas build --platform android --profile production
   ```
   When it finishes, download the **`.aab`** file from the link it prints.
6. In Play Console, open your app → **Testing → Internal testing → Create new release**.
   - If asked about **Play App Signing**, accept (Google keeps the signing key).
   - Upload the `.aab`, add a short release note, then **Next → Save → Start rollout to Internal
     testing**.
7. Still in **Internal testing**, open the **Testers** tab and create an email list with your own
   Gmail. Copy the **opt-in link**, open it on your phone, accept, and install Nearby from the Play
   Store. This installed version is the one that can buy.

## Part E — Create the two products (now that a build is uploaded)

1. Play Console → your app → **Monetize with Play → Products → One-time products** (older
   screens: "In-app products") → **Create**.
2. First product:
   - **Product ID:** `full_game` (exactly this; it can never be changed)
   - **Name:** Full Game. **Description:** Unlimited catching, one payment.
   - **Price:** 49 SEK for Sweden. Let Google convert the other countries, or set them by hand.
   - Save, then **Activate**.
3. Second product: **Product ID** `family`, name Family, description "The Full Game for up to 5
   people", **99 SEK**. Save and **Activate**.
4. **All of Sweden:** Product ID `all_regions`, name "All of Sweden", description "Every county,
   not just your home", **99 SEK**. Save and **Activate**.
5. **One product per county, 29 SEK each** (21 products). Same steps; the Product ID must be
   exactly as listed. Name: "<County> pack", description "Explore <County> beyond your home
   county".

   | Product ID | County |
   |---|---|
   | `region_swe_1` | Blekinge |
   | `region_swe_2` | Dalarna |
   | `region_swe_3` | Gävleborg |
   | `region_swe_4` | Gotland |
   | `region_swe_5` | Halland |
   | `region_swe_6` | Jämtland |
   | `region_swe_7` | Jönköping |
   | `region_swe_8` | Kalmar |
   | `region_swe_9` | Kronoberg |
   | `region_swe_10` | Norrbotten |
   | `region_swe_11` | Örebro |
   | `region_swe_12` | Östergötland |
   | `region_swe_13` | Skåne |
   | `region_swe_14` | Södermanland |
   | `region_swe_15` | Stockholm |
   | `region_swe_16` | Uppsala |
   | `region_swe_17` | Värmland |
   | `region_swe_18` | Västerbotten |
   | `region_swe_19` | Västernorrland |
   | `region_swe_20` | Västmanland |
   | `region_swe_21` | Västra Götaland |

   Tip: create one, then repeat the steps for the rest; only the ID and the name change.

## Part F — Connect RevenueCat to Google Play (service account)

This lets RevenueCat check purchases with Google. It is a one-off setup.

1. Open **console.cloud.google.com** and pick the project **nearby-nearlife** (top bar).
2. **APIs & Services → Library**: search for and **Enable** both **Google Play Android Developer
   API** and **Google Play Developer Reporting API**.
3. **IAM & Admin → Service accounts → + Create service account.**
   - Name: `revenuecat`. Create and continue.
   - Roles: add **Pub/Sub Editor** and **Monitoring Viewer** → Continue → Done.
4. Click the new service account → **Keys → Add key → Create new key → JSON**. A file downloads.
   Keep it private.
5. Copy the service account's email. It looks like
   `revenuecat@nearby-nearlife.iam.gserviceaccount.com`.
6. Play Console → **Users and permissions → Invite new users** → paste that email.
   - Under **App permissions → Add app → Nearby**, tick **View app information and download bulk
     reports**, **View financial data, orders, and cancellation survey responses**, and **Manage
     orders and subscriptions**. Invite.
7. RevenueCat → **Apps** → your Play Store app → **Service account credentials JSON** → upload
   the file from step 4 → Save.
   - Google can take **up to ~36 hours** before the credentials show as valid. Continue with
     Part G meanwhile.

## Part G — Products and entitlements in RevenueCat

1. RevenueCat → **Product catalog → Products → + New** (or **Import** to pull them from Play).
   Add `full_game` and `family` for the Play Store app.
   Use **Import** to bring in all 24 at once: `full_game`, `family`, `all_regions` and the 21
   `region_swe_…` packs.
2. **Product catalog → Entitlements → + New**:
   - Identifier **`full_game`**, then **Attach** the `full_game` product.
   - Identifier **`family`**, then **Attach** the `family` product.
   - Use exactly these identifiers. The server only accepts these names (Family already includes
     the Full Game; the server handles that).
   - The county packs and `all_regions` need **no** entitlements: the server recognises them by
     product ID, which saves you creating 22 more.

## Part H — Purchase notifications to our server (webhook)

This is how a purchase reaches the database and unlocks the app.

1. Make a **long random password** (40+ characters), e.g. with a password manager's generator.
   This is the webhook secret. **Don't send it to me.**
2. Supabase dashboard → your project → **Edge Functions → Secrets** (sometimes under **Project
   Settings → Edge Functions**) → **Add new secret**:
   - Name: `REVENUECAT_WEBHOOK_SECRET`
   - Value: the password from step 1
3. RevenueCat → **Integrations → Webhooks → + New webhook**:
   - **URL:** `https://subjdoiicfmiimtvlzsg.supabase.co/functions/v1/revenuecat-webhook`
   - **Authorization header value:** `Bearer ` followed by the same password. Note the word
     *Bearer* and one space before it.
   - Environment: **both** (sandbox and production). Events: **all**. Save.
4. Press **Send test event**. It should report success (HTTP 200). If it shows **403**, the two
   secrets don't match exactly.

## Part I — Make a test purchase (free)

1. Play Console → **Settings** (the "All apps" level) → **License testing** → add your Gmail →
   Save. Purchases by this account use a test card and **cost nothing**.
2. On your phone, open the Nearby version installed from the internal-testing link (Part D7).
3. **Settings → Full Game & Family** → you should see both products with 49 kr / 99 kr → **Buy**
   the Full Game → pick the **test card** → confirm.
4. Within a few seconds it shows **✓ Unlocked**, and catches are unlimited.
5. Tell Claude. I'll check the database row the webhook wrote and mark the purchase tasks done.

If something doesn't match what's written here, send a screenshot. Never include the JSON file or
the secret in it.
