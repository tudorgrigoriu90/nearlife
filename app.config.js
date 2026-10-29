// Dynamic Expo config on top of app.json (T-004). The only thing it changes is where the Firebase
// config file comes from: `google-services.json` is gitignored, so an EAS cloud build cannot see
// it. EAS provides it as a secret *file* environment variable instead
// (`eas env:create --name GOOGLE_SERVICES_JSON --type file …`, see docs/launch/PAYMENTS-SETUP.md),
// whose value is the path of the uploaded file. Local builds keep using the file next to app.json.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? config.android.googleServicesFile,
  },
});
