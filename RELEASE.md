# Release Packaging

This repository can publish GitHub Releases with installable Android packages and a zipped web build.

## Release Assets

Each release workflow run publishes:

- `ledger-journal-web-x.y.z.zip`: static web build from `dist`
- `ledger-journal-android-x.y.z.apk`: Android sideload installer
- `ledger-journal-android-x.y.z.aab`: Android App Bundle for Google Play
- `SHA256SUMS.txt`: checksums for the generated files

## One-Time GitHub Setup

Create a real Android upload key and keep it outside the repository:

```powershell
keytool -genkeypair -v -storetype JKS -keystore ledger-upload-key.jks -alias ledger-upload -keyalg RSA -keysize 2048 -validity 10000
```

Convert it to base64 for GitHub Actions:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("ledger-upload-key.jks")) | Set-Clipboard
```

Add these GitHub repository secrets:

- `ANDROID_KEYSTORE_BASE64`: clipboard value from the command above
- `ANDROID_KEYSTORE_PASSWORD`: keystore password
- `ANDROID_KEY_ALIAS`: key alias, for example `ledger-upload`
- `ANDROID_KEY_PASSWORD`: key password

## Publish A Release

Commit the workflow files, push the repository to GitHub, then create and push a version tag:

```powershell
git tag v1.0.0
git push origin v1.0.0
```

The tag starts `.github/workflows/release.yml`, which creates the GitHub Release and uploads the install packages.

You can also run the workflow manually from GitHub Actions and provide a tag like `v1.0.0`.

## Local Checks

Web:

```powershell
npm ci
npm run build
```

Mobile type check:

```powershell
cd mobile
npm ci
npx tsc --noEmit
```

## Local Preview Package

To create a GitHub-Release-style folder locally:

```powershell
npm run release:local
```

This writes files to `release/`. If an Android APK or AAB already exists under `mobile/android/app/build/outputs`, it is copied into the package folder.

## Pre-Release Checklist

Before publishing a tag for a small-circle Android release:

- Confirm `mobile/version.ts`, `mobile/app.json`, and the release tag use the same version.
- Confirm GitHub repository secrets are set: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
- Run local checks: `npm run test:core`, `cd mobile && npx tsc --noEmit`, `npm run build`, `git diff --check`.
- Export a backup from the current app, clear local ledger entries, import the backup, and confirm transactions, accounts, templates, categories, theme, and budget are restored.
- Install the generated APK on a real Android phone, register/login, add one expense, restart the app, and confirm data is still present.
- Confirm the GitHub Release contains APK, AAB, web zip, and `SHA256SUMS.txt`.
- Share `INSTALL.md` with testers so they understand APK installation, local-only storage, and backup recovery.
