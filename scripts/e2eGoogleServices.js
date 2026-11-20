// A placeholder google-services.json for the end-to-end emulator build (T-367). The Firebase
// Gradle plugin refuses to build without one; push is not under test there, and the real file is
// never put in CI. Every value is a dummy except the package name, which must match.
const { writeFileSync } = require('fs');

const PACKAGE = 'com.nearlife.nearby';

function placeholder() {
  return {
    project_info: { project_number: '000000000000', project_id: 'nearby-e2e-placeholder', storage_bucket: 'nearby-e2e-placeholder.appspot.com' },
    client: [
      {
        client_info: { mobilesdk_app_id: '1:000000000000:android:0000000000000000', android_client_info: { package_name: PACKAGE } },
        oauth_client: [],
        api_key: [{ current_key: 'placeholder' }],
        services: { appinvite_service: { other_platform_oauth_client: [] } },
      },
    ],
    configuration_version: '1',
  };
}

module.exports = { placeholder, PACKAGE };
if (require.main === module) writeFileSync(process.argv[2], JSON.stringify(placeholder(), null, 2));
