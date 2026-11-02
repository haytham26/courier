/* global describe, it, expect */
/**
 * The a1 job's release APK dials the compose stack through the emulator's own
 * address of the runner (EXPO_PUBLIC_API_URL=http://10.0.2.2:8000,
 * EXPO_PUBLIC_AUTH_URL=http://10.0.2.2:3001), and Android's default network
 * security policy blocks cleartext: run 41407217039's register submit answered
 * "Registration Failed - fetch failed: java.net.UnknownServiceException:
 * CLEARTEXT communication to 10.0.2.2 not permitted by network security
 * policy". This plugin installs a network security config that permits
 * cleartext to 10.0.2.2 ONLY - production URLs are https, so the shipped app
 * keeps cleartext blocked everywhere else (no blanket usesCleartextTraffic).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const plugin = require('../withEmulatorCleartext');

describe('withEmulatorCleartext', () => {
  it('points the manifest application at the network security config', async () => {
    const modded = plugin({});
    const manifest = { manifest: { application: [{ $: {} }] } };
    // withMod's generated function is async and expects modRequest.nextMod; it
    // forwards modResults to the action, and nextMod is identity here.
    const out = await modded.mods.android.manifest({
      modResults: manifest,
      modRequest: { nextMod: (x) => x, projectRoot: '/nonexistent' },
    });
    expect(out.modResults.manifest.application[0].$['android:networkSecurityConfig']).toBe(
      '@xml/network_security_config',
    );
  });

  it('writes a config that permits cleartext only to 10.0.2.2, never globally', () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'withEmulatorCleartext-'));
    const modded = plugin({});
    modded.mods.android.dangerous({
      modResults: {},
      modRequest: { nextMod: (x) => x, projectRoot },
    });
    const xml = fs.readFileSync(
      path.join(projectRoot, 'android/app/src/main/res/xml/network_security_config.xml'),
      'utf8',
    );
    expect(xml).toContain('<domain>10.0.2.2</domain>');
    expect(xml).toContain('cleartextTrafficPermitted="true"');
    // The permission is scoped to the emulator's host alias: no base-config
    // (or debug-overrides) may permit cleartext for every host.
    expect(xml).not.toMatch(/<base-config[^>]*cleartextTrafficPermitted="true"/);
    expect(xml).not.toMatch(/<debug-overrides/);
  });

  it('is registered in app.json', () => {
    const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../app.json'), 'utf8'));
    expect(appJson.expo.plugins).toContain('./plugins/withEmulatorCleartext');
  });
});
