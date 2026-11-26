# Building the Android and iOS apps (later)

The game is already a **web app you can install**: open
<https://aidfryer.github.io/duck-hunt-idle/> on your phone and add it to your
home screen. It opens full-screen and works offline. You only need the steps
below if you want to put the game in the Google Play Store or Apple App Store.

The project uses [Capacitor](https://capacitorjs.com), which wraps the built
web game (`dist/`) in a native app shell. The app name and ID are set in
`capacitor.config.ts`.

## Android (on your Windows PC)

1. Install **Android Studio** from <https://developer.android.com/studio>.
   Open it once and let it finish downloading the Android SDK.
2. In PowerShell, in the project folder:

   ```powershell
   npm install
   npx cap add android
   npm run cap:android
   ```

   `npx cap add android` creates an `android/` folder (only needed once).
   `npm run cap:android` builds the game, copies it into the Android project
   and opens Android Studio.
3. In Android Studio, plug in your phone (with USB debugging on) or start an
   emulator, then press the green **Run** button.
4. For the Play Store: **Build → Generate Signed App Bundle**, then upload the
   `.aab` file in the Google Play Console (a one-time $25 developer account).

After changing the game, run `npm run cap:android` again to update the app.

## iOS (needs a Mac)

Apple only allows iOS apps to be built on a Mac with **Xcode** installed.

```bash
npm install
npx cap add ios
npm run cap:ios
```

Xcode opens. Choose your iPhone or a simulator and press **Run**. Publishing to
the App Store needs an Apple Developer account ($99 a year).

## App icons

The icon art is `public/icons/icon.svg` (with PNG sizes next to it). For the
native apps, `npx @capacitor/assets generate` can make every Android and iOS
icon size from a single 1024×1024 PNG.
