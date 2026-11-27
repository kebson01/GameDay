# Mobile builds (GitHub Actions)

`.github/workflows/mobile-build.yml` builds the Android and iOS apps from this one codebase
on every push to `master`. You can also start it by hand: **Actions → Mobile builds → Run workflow**.

When a run finishes, open it and download the files under **Artifacts**.

| | Without secrets | With secrets |
|---|---|---|
| Android | Debug `.apk` (install on any phone for testing) | Signed release `.apk` + `.aab` (the `.aab` goes to Google Play) |
| iOS | Simulator build (proves it compiles; runs in the Xcode Simulator) | Signed `.ipa`, uploaded to TestFlight if the App Store Connect key is set |

Each run's number becomes the build number (Android `versionCode`, iOS `CFBundleVersion`),
so every upload is newer than the last.

Add secrets under **GitHub → repo Settings → Secrets and variables → Actions → New repository secret**.
Never paste them into chat, issues or commits.

## Android signing (4 secrets)

Create a keystore once and **keep a backup**: Google Play only accepts updates signed with the same key
(unless you use Play App Signing's upload-key reset).

```bash
keytool -genkeypair -v -keystore gameday-release.jks -alias gameday \
  -keyalg RSA -keysize 2048 -validity 10000
base64 -i gameday-release.jks | tr -d '\n'   # copy this output
```

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | the base64 output above |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password |
| `ANDROID_KEY_ALIAS` | `gameday` (or the alias you chose) |
| `ANDROID_KEY_PASSWORD` | key password |

## iOS signing (3 secrets)

Needs an Apple Developer Program membership. The bundle ID is `com.gameday.app`; register it under
Certificates, Identifiers & Profiles → Identifiers if it isn't already.

1. **Distribution certificate**: create an *Apple Distribution* certificate, install it on a Mac, then in
   Keychain Access export it with its private key as a `.p12` with a password.
2. **Provisioning profile** for `com.gameday.app`:
   - *App Store* profile: for TestFlight / App Store
   - *Ad Hoc* profile: to install directly on registered iPhones

   The workflow reads the profile to pick the export method and team ID.

```bash
base64 -i Certificates.p12 | tr -d '\n'
base64 -i GameDay_AppStore.mobileprovision | tr -d '\n'
```

| Secret | Value |
|---|---|
| `IOS_CERTIFICATE_P12_BASE64` | base64 of the `.p12` |
| `IOS_CERTIFICATE_PASSWORD` | the `.p12` password |
| `IOS_PROVISIONING_PROFILE_BASE64` | base64 of the `.mobileprovision` |

## TestFlight upload (optional, 3 secrets)

App Store Connect → Users and Access → Integrations → App Store Connect API → generate a key
(App Manager role). Create the app record for `com.gameday.app` in App Store Connect first.

| Secret | Value |
|---|---|
| `APP_STORE_CONNECT_API_KEY_BASE64` | base64 of the downloaded `AuthKey_XXXX.p8` |
| `APP_STORE_CONNECT_KEY_ID` | the key ID |
| `APP_STORE_CONNECT_ISSUER_ID` | the issuer ID shown above the keys list |

The upload only runs with an App Store profile.
