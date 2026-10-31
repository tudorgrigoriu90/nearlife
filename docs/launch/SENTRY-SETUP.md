# Crash reporting setup — Sentry (Director, ~10 minutes)

The app code is ready (T-100). Sentry stays off until the app has its key, and even then it
reports only for people who allowed analytics.

1. Go to **sentry.io/signup**. When asked for a **data storage location, choose the EU**
   (Frankfurt). Our other processors are EU-hosted, and the privacy policy relies on that.
2. Create an organization (any name), then **Create Project → React Native**. Name it `nearby`.
   Alert frequency: "Alert me on every new issue".
3. Copy the **DSN** it shows (looks like `https://abc123@o123.ingest.de.sentry.io/456`). It is
   public by design: it only lets the app *send* crash reports. You can paste it in the chat.
4. Add it to the cloud build, on your computer in the project folder:
   ```
   eas env:create --name EXPO_PUBLIC_SENTRY_DSN --value "<the DSN>" --environment development --environment preview --environment production
   ```
   Choose **Plain text** visibility. Also add `EXPO_PUBLIC_SENTRY_DSN=<the DSN>` to your
   `.env.local`.
5. **Settings → Legal → Data Processing Addendum**: accept Sentry's DPA, as you did for the other
   processors (T-096).
6. The next EAS build carries crash reporting. To test it, allow analytics in the app's Settings;
   crashes from then on appear in Sentry within a minute.

Never needed: a Sentry auth token or anything secret. Those are only for uploading source maps,
which we skip for now.
