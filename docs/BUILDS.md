# Waymark — Builds

Android builds run fully on the developer's machine with `eas build --local`.
The only remote dependency is an EAS login (`eas login`), which the CLI uses
to read the profile's EAS environment variables. Versions are set in
`app.config.ts`, and release signing uses the owner's own keystore through
`credentials.json`.

## 1. Profiles

| | `development` | `test` | `production` | `production-apk` |
|---|---|---|---|---|
| Purpose | Dev client for Metro | Release-like internal testing | Google Play upload | Sideload the exact production app |
| `APP_VARIANT` | `development` | `test` | `production` | `production` |
| Application id | `app.waymark.dev` | `app.waymark.test` | `app.waymark` | `app.waymark` |
| Launcher name | Waymark Dev | Waymark Test | Waymark | Waymark |
| URL scheme | `waymark-dev` | `waymark-test` | `waymark` | `waymark` |
| Artefact | APK | APK | AAB | APK |
| Gradle task | `:app:assembleDebug` | `:app:assembleRelease` | `:app:bundleRelease` | `:app:assembleRelease` |
| JS bundle | Served by Metro | Embedded Hermes bytecode | Embedded Hermes bytecode | Embedded Hermes bytecode |
| Debuggable / dev menu | Yes | No | No | No |
| Cleartext HTTP | Allowed (Metro, local Supabase) | Blocked | Blocked | Blocked |
| R8 minify + resource shrink | No | Yes | Yes | Yes |
| Signing | Template debug key (`withoutCredentials`) | Own keystore (`credentials.json`) | Own keystore | Own keystore |
| EAS environment | `development` | `preview` | `production` | `production` |

`APP_VARIANT` is set in each profile's `env` in `eas.json` and read by
`app.config.ts`. When it is unset (plain `pnpm android`, `pnpm start:dev-client`)
the variant is `development`, so a local build can never take the store
application id.

| Decision | Evidence |
|---|---|
| A distinct application id per variant | Android refuses an update signed with a different key (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`). Debug-signed dev builds and keystore-signed release builds can only coexist under different ids, and replacing one with the other would require an uninstall that wipes the signed-in session. |
| A distinct URL scheme per variant | Invite links are parsed scheme-agnostically (`app/_layout.tsx`), so each variant can own its scheme. A shared scheme would make Android show an app chooser when several variants are installed. |
| `test` uses the `preview` EAS environment | EAS ships three environments (`development`, `preview`, `production`); `preview` is the hosted staging project. |
| The dev client skips release credentials | A debug build is signed with the template debug key, the same key `expo run:android` uses, so the two install over each other. The release keystore is never needed for day-to-day work. |
| `production-apk` beside the AAB | An AAB can't be installed directly. The APK has the same id, config and signature as the Play build, so it can be smoke-tested before upload. |

## 2. Versions

`eas.json` uses `"appVersionSource": "local"`. `app.config.ts` holds `VERSION`
(semver, shown to users) and `BUILD` (0–99). Android `versionCode` and iOS
`buildNumber` are derived from them:

```
versionCode = MAJOR × 1 000 000 + MINOR × 10 000 + PATCH × 100 + BUILD
0.1.0 build 0  →  10000
1.2.3 build 4  →  1020304
```

Bumping `VERSION` is enough for a new release. Bump `BUILD` only to upload the
same version again. Each part must stay at or below 99; the config throws
otherwise.

## 3. Environment values

Only two values are bundled into the client, both public by design
(`docs/SECURITY.md`): `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY`. They reach the app twice: inlined into the JS
bundle as `process.env.EXPO_PUBLIC_*`, and copied into `extra` in the embedded
app config. Nothing else is read from the environment at bundle time.
`APP_VARIANT` only selects the id, name and scheme. A service-role key, or any
other secret, must never get an `EXPO_PUBLIC_` name: that prefix means "ship
it to every device".

| Profile | Where the values come from |
|---|---|
| `development` | Nothing is embedded. Metro serves the bundle and loads the developer's `.env` (local Supabase via `adb reverse tcp:54321 tcp:54321`). |
| `test` | EAS environment variables in `preview` (the hosted staging project). |
| `production` / `production-apk` | EAS environment variables in `production`. |

Create the variables once per environment. Leaving `--value` out makes the CLI
prompt for it, so the value stays out of shell history:

```sh
eas env:create preview    --name EXPO_PUBLIC_SUPABASE_URL      --visibility plaintext
eas env:create preview    --name EXPO_PUBLIC_SUPABASE_ANON_KEY --visibility sensitive
eas env:create production --name EXPO_PUBLIC_SUPABASE_URL      --visibility plaintext
eas env:create production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --visibility sensitive
```

Rules the build enforces or relies on:

- **The URL guard.** Inside an EAS build (`EAS_BUILD=true`, which is also set
  for `--local`), `app.config.ts` fails a `test` or `production` build when
  either value is missing, or when the URL is not `https://`, or when it
  points at a loopback or emulator host (`localhost`, `127.*`, `10.0.2.2`,
  `0.0.0.0`, `[::1]`). The error message names the variable, never its value.
- **No local `.env` files reach the build.** `.easignore` replaces
  `.gitignore` for the project archive and drops every `.env*` file except
  `.env.example`. Without it, Expo CLI would load a local `.env.production`
  into a release bundle.
- **The shell wins in local builds.** `eas build --local` merges the host
  environment over the EAS environment. Never export `EXPO_PUBLIC_*` in the
  shell that runs a release build; check with `env | grep -c EXPO_PUBLIC_`
  (which prints a count, not values).

## 4. Signing

Release profiles use `"credentialsSource": "local"`. eas-cli reads
`credentials.json` from the project root on the host and passes the keystore to
the build; neither file is copied into the project archive. The shape, with
placeholders:

```json
{
  "android": {
    "keystore": {
      "keystorePath": "/absolute/path/outside/the/repo/waymark-release.jks",
      "keystorePassword": "<keystore password>",
      "keyAlias": "<key alias>",
      "keyPassword": "<key password>"
    }
  }
}
```

- Keep the keystore outside the repository; `keystorePath` may be absolute.
- Never commit `credentials.json` or a keystore. `.gitignore` covers `*.jks`
  and `*.keystore`; exclude `credentials.json` in each clone with
  `echo /credentials.json >> .git/info/exclude`. `.easignore` keeps all of
  them out of the EAS archive.
- Losing the keystore means no further updates to the Play listing unless Play
  App Signing is enabled with this key as the upload key. Back it up.
- Without `credentials.json` the release profiles stop with
  `credentials.json does not exist in the project root directory`.

## 5. Toolchain

| Requirement | Version |
|---|---|
| Node | 24 (`.nvmrc`), with pnpm; `pnpm-lock.yaml` is the only lockfile |
| eas-cli | ≥ 16 (`eas.json`), logged in with `eas login` |
| JDK | 17 (`JAVA_HOME` pointing at it) |
| Android SDK | `ANDROID_HOME` set; platform `android-36`, build-tools 36 |
| Android NDK | `27.1.12297006` (React Native 0.86 `ndkVersion`) |

iOS builds need macOS and Xcode and are not covered here. The same variants
apply there through the bundle identifier.

## 6. Build and install

Run from the repository root. `--output` sets the artefact path; `build/` is
ignored by git.

```sh
# development: dev client, debug-signed
eas build --platform android --profile development --local --output build/waymark-dev.apk
adb install -r build/waymark-dev.apk
adb reverse tcp:8081 tcp:8081 && adb reverse tcp:54321 tcp:54321
pnpm start:dev-client

# test: release-like APK against the staging project
eas build --platform android --profile test --local --output build/waymark-test.apk
adb install -r build/waymark-test.apk

# production: Play upload
eas build --platform android --profile production --local --output build/waymark.aab

# production APK: sideload the store configuration
eas build --platform android --profile production-apk --local --output build/waymark.apk
adb install -r build/waymark.apk
```

With several devices attached, add `-s <serial>` to `adb`. An APK built for the
same application id but signed with another key (for example an older debug
build of `app.waymark`) must be uninstalled first, which signs that install
out.

## 7. Checking a release artefact

```sh
BT=$ANDROID_HOME/build-tools/36.0.0
$BT/aapt2 dump badging build/waymark-test.apk | grep -E "^package|application-label:|debuggable"
$BT/aapt2 dump xmltree --file AndroidManifest.xml build/waymark-test.apk | grep -E "usesCleartextTraffic|debuggable"
$BT/apksigner verify --print-certs build/waymark-test.apk | grep -E "DN|SHA-256"
unzip -p build/waymark-test.apk assets/index.android.bundle | head -c 4 | xxd   # c61f bc03 = Hermes bytecode
unzip -l build/waymark-test.apk | grep -ciE "devlauncher|devmenu"               # 0 = no dev client assets
unzip -p build/waymark-test.apk assets/index.android.bundle | strings | grep -c service_role   # 0
# Embedded config: lists the extra keys and classifies the URL without printing it
unzip -p build/waymark-test.apk assets/app.config | node -e '
  const c = JSON.parse(require("fs").readFileSync(0)); const u = new URL(c.extra.supabaseUrl);
  console.log(Object.keys(c.extra).join(","), u.protocol, /^(localhost|127\.|10\.0\.2\.2$)/.test(u.hostname) ? "LOCAL" : "remote")'
```

A release build shows no `application-debuggable` line,
`usesCleartextTraffic=false`, `https: remote` for the embedded URL, and the
owner's certificate rather than `CN=Android Debug`. For an AAB, unzip
`base/manifest/AndroidManifest.xml` and `base/assets/` into an empty
directory and run the same checks.

Two loopback strings are expected in every release bundle; neither comes
from configuration: React Native's dev-server fallback
(`http://localhost:8081/`, used only with Metro) and supabase-js's built-in
auth default (`http://localhost:9999`, replaced by the configured URL). The
dex files also keep `DevLauncherPackage` and `DevMenuPackage`, which are
expo-dev-client's no-op release stubs (`disableInRelease`); the launcher
and menu activities are absent.
