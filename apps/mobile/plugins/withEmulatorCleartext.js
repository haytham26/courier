// The a1 E2E job builds the release APK against the compose stack through the
// emulator's own address of the runner (EXPO_PUBLIC_API_URL /
// EXPO_PUBLIC_AUTH_URL = http://10.0.2.2:8000 / :3001), and Android's default
// network security policy blocks cleartext: run 41407217039's register submit
// answered "Registration Failed - fetch failed: CLEARTEXT communication to
// 10.0.2.2 not permitted by network security policy", so the no-mock flow could
// never reach the real auth service.
//
// The fix is a network security config that permits cleartext to 10.0.2.2
// ONLY - not a blanket android:usesCleartextTraffic="true". 10.0.2.2 is the
// emulator's alias for the host loopback, so it is reachable only inside an
// emulator; the production base URLs are https and stay fully protected.
const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

const NETWORK_SECURITY_CONFIG = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="false">10.0.2.2</domain>
  </domain-config>
</network-security-config>
`;

module.exports = function withEmulatorCleartext(config) {
  config = withAndroidManifest(config, (cfg) => {
    const application = cfg.modResults.manifest.application?.[0];
    if (!application) {
      return cfg;
    }
    application.$ = application.$ || {};
    application.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    return cfg;
  });

  config = withDangerousMod(config, [
    'android',
    (cfg) => {
      const resXml = path.join(cfg.modRequest.projectRoot, 'android/app/src/main/res/xml');
      fs.mkdirSync(resXml, { recursive: true });
      fs.writeFileSync(path.join(resXml, 'network_security_config.xml'), NETWORK_SECURITY_CONFIG);
      return cfg;
    },
  ]);

  return config;
};
