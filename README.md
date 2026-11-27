# Crate

Crate is a personal Android app for browsing your Discogs vinyl collection and finding each record on your physical shelf. It is built for one person and one collection, and installs on your phone without the Play Store.

- **Find a record fast.** Search as you type, then see exactly where it sits: *Bebop & Hard Bop, slot 23 of 41, between Monk and Parker.*
- **Inspect it in 3D.** Turn the jacket over, pull the record out, flip it to side B and spin it.
- **See what Discogs knows** about your copy: pressing details, conditions, credits, matrix numbers and prices.
- **Get a reminder** on the anniversary of an album's release.

Crate only *reads* from Discogs. It never moves, edits or deletes anything in your account. It has no accounts, no server and no tracking. Your Discogs token stays on your phone.

---

## Contents

1. [Get your Discogs token](#1-get-your-discogs-token)
2. [Install on your phone](#2-install-on-your-phone)
   - [Automatic builds with GitHub Actions (recommended)](#automatic-builds-with-github-actions-recommended)
   - [Build on your own computer](#build-on-your-own-computer)
   - [Install path A: USB cable with adb](#install-path-a-usb-cable-with-adb)
   - [Install path B: copy the APK to your phone](#install-path-b-copy-the-apk-to-your-phone)
3. [Your signing key: create it once, keep it forever](#3-your-signing-key-create-it-once-keep-it-forever)
4. [Using Crate](#4-using-crate)
5. [What the Discogs API can and can't do](#5-what-the-discogs-api-can-and-cant-do)
6. [Trying it in a desktop browser](#6-trying-it-in-a-desktop-browser)
7. [For developers](#7-for-developers)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Get your Discogs token

1. Sign in at [discogs.com](https://www.discogs.com).
2. Open **Settings → Developers** ([direct link](https://www.discogs.com/settings/developers)).
3. Click **Generate new token** and copy it.

The first time you open Crate it asks for your Discogs username and this token. If the token ever leaks, generate a new one on the same page; the old one stops working.

**Optional, for price suggestions:** Discogs only gives price suggestions to accounts that have filled in **Settings → Seller settings**. You don't have to sell anything. Without seller settings, Crate still shows the lowest current listing and the number for sale.

---

## 2. Install on your phone

An Android app file is called an **APK**. You need a *signed* APK, which means it is stamped with your own private signing key. Android only installs an update over an existing app when both are signed with the **same key**, so you create the key once and reuse it for every update (see [section 3](#3-your-signing-key-create-it-once-keep-it-forever)).

There are two ways to get a signed APK:

- **GitHub Actions (recommended).** GitHub builds the APK for you every time the code changes. You download it on your phone. You never need Android Studio.
- **Your own computer.** Build it yourself, then install it over USB or by copying the file to the phone.

### Automatic builds with GitHub Actions (recommended)

The workflow in `.github/workflows/android-release.yml` runs on every push to the `main` branch. It runs the tests, builds a signed APK, and publishes it as a GitHub Release named like `Crate 1.0.12` with a file called `crate.apk`.

**One-time setup**

1. Put this project in a GitHub repository. A **private** repository keeps your releases private too.
2. Create your signing key by following [section 3](#3-your-signing-key-create-it-once-keep-it-forever).
3. Turn the keystore file into text that GitHub can store. Run one of these in the folder that holds `crate-release.jks`:

   On macOS (copies the text to the clipboard):

   ```bash
   base64 -i crate-release.jks | pbcopy
   ```

   On Linux:

   ```bash
   base64 -w0 crate-release.jks > crate-release.jks.txt
   ```

   On Windows PowerShell (copies the text to the clipboard):

   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("crate-release.jks")) | Set-Clipboard
   ```

4. In your repository on github.com, go to **Settings → Secrets and variables → Actions → New repository secret** and add these four secrets:

   | Secret name | What to paste |
   | --- | --- |
   | `CRATE_KEYSTORE_BASE64` | The long text from step 3 |
   | `CRATE_KEYSTORE_PASSWORD` | The keystore password you chose |
   | `CRATE_KEY_ALIAS` | The key alias. The command in section 3 uses `crate`. |
   | `CRATE_KEY_PASSWORD` | The key password. With the command in section 3 it's the same as the keystore password. |

   If you made a Linux `.txt` file in step 3, delete it after pasting.

5. Push to `main`, or open the **Actions** tab, pick **Android release** and click **Run workflow**. A build takes about 5–8 minutes.

**Installing and updating**

On your Pixel, open `https://github.com/<your-user>/<your-repo>/releases/latest` in Chrome. Sign in first if the repository is private. Tap **crate.apk**, then follow [install path B](#install-path-b-copy-the-apk-to-your-phone) from step 3. Bookmark the page: each new release installs over the old one and keeps your data.

### Build on your own computer

You need:

- [Node.js 22](https://nodejs.org)
- Java 21. [Temurin](https://adoptium.net) is fine.
- The Android SDK. The easiest way to get it is to install [Android Studio](https://developer.android.com/studio) once and let it download the SDK. After that you don't need to open Android Studio.

Then:

1. Create your signing key ([section 3](#3-your-signing-key-create-it-once-keep-it-forever)).
2. In the `android/` folder, create a file called `keystore.properties`. Git ignores this file, so it is never committed.

   ```properties
   storeFile=/Users/you/crate-signing/crate-release.jks
   storePassword=your-keystore-password
   keyAlias=crate
   keyPassword=your-keystore-password
   ```

3. From the project folder, install dependencies:

   ```bash
   npm install
   ```

4. Build the signed APK:

   ```bash
   npm run android:release
   ```

5. The signed APK is at `android/app/build/outputs/apk/release/app-release.apk`.

### Install path A: USB cable with adb

1. On the phone, open **Settings → About phone** and tap **Build number** seven times. This turns on Developer options.
2. Open **Settings → System → Developer options** and turn on **USB debugging**.
3. Connect the phone with a USB cable and tap **Allow** on the prompt that appears on the phone.
4. On your computer, install the APK. `adb` comes with the Android SDK, in `platform-tools`. The `-r` flag replaces an existing install and keeps your data.

   ```bash
   adb install -r android/app/build/outputs/apk/release/app-release.apk
   ```

### Install path B: copy the APK to your phone

1. Get the APK onto the phone: download it from GitHub Releases in Chrome, or copy it over USB, Google Drive or email.
2. Open it. Tap the download notification in Chrome, or find it in the **Files** app under **Downloads**.
3. The first time, Android says that, for your security, your phone isn't allowed to install unknown apps from this source. Tap **Settings** and turn on **Allow from this source** for **Chrome** or **Files**, whichever you used. Then go back.
4. Tap **Install**. If Play Protect warns that it doesn't recognise the app, choose **More details → Install anyway**. This happens because Crate is your own app and isn't from the Play Store.
5. Optionally, switch **Allow from this source** off again afterwards. You'll be asked again for the next update.

---

## 3. Your signing key: create it once, keep it forever

Every Crate APK is signed with your private key. **Updates must be signed with the same key.** If you lose the key, you can still install a newly signed build, but only after uninstalling Crate. That wipes its data: your sort names, image choices and manual dates.

**Create it**

`keytool` comes with Java. The command below asks for a password and a few name questions, and any answers are fine. When it asks for a key password, press Enter to use the same password.

```bash
mkdir -p ~/crate-signing
```

```bash
keytool -genkeypair -v -keystore ~/crate-signing/crate-release.jks -alias crate -keyalg RSA -keysize 4096 -validity 36500
```

**Where it lives:** `~/crate-signing/crate-release.jks`, which is outside the project folder on purpose. Never put it inside the repository. `.gitignore` blocks `*.jks`, `*.keystore` and `keystore.properties` as a safety net.

**Back it up now, in two places:**

- Save the `.jks` file and its password together in your password manager. Most can store file attachments.
- Keep a second copy on a USB stick or in a private cloud folder.

If you use GitHub Actions, the secret is a third copy, but GitHub never lets you download a secret back. Keep your own copies.

---

## 4. Using Crate

**First sync.** After you sign in, Crate downloads your folders, every record's full details, the original release dates and the prices. Discogs allows about 60 requests a minute, so the first sync of around 200 records takes 15–20 minutes. You'll see a calm progress line like "Syncing 84 of 196". Records appear as they arrive, so you can browse straight away, and full details for every record are in after the first 4 minutes or so. The rest of the time goes on original release dates and prices.

**Later syncs are quick.** Crate refreshes the folder listings and picks up records you've added, removed or moved between folders. It only downloads full details for new records. Prices refresh when they're more than 7 days old, or when you tap **Refresh** on a record. To sync, pull down on the library or tap the sync button. Crate also syncs on its own when you open it and the last sync was more than a day ago. After the first sync, everything works offline.

**Folders and shelf order.** Folder tabs mirror your Discogs folders exactly, names and order included. Within a folder, records are filed like a real shelf:

- People file by last name: "Ahmad Jamal" sorts under J.
- Groups named after a leader file under the leader: "Oscar Peterson Trio" sorts under P, and "The Jonah Jones Quartet" under J.
- Other bands file by their first word, ignoring "The": "The Modern Jazz Quartet" sorts under M, and "The Four Freshmen" under F.
- Collaborations file under the first-billed artist.
- "Various" compilations file by album title.
- Classical records file under the composer when Discogs credits one.
- Records by the same artist are ordered by original release year, then title.

Automatic parsing gets some names wrong. Fix them under **Settings → Sort names**. The shelf re-sorts immediately, and your edits survive every sync.

**Shelf view.** The button at the top of the library switches between the cover grid and a shelf of spines in shelf order. The spine colours come from each cover.

**The record screen.**

- Drag to turn the jacket; it keeps spinning a little when you let go.
- Pinch to zoom, and double-tap to reset.
- **Flip over** shows the back cover.
- Drag up from the top edge of the jacket, or tap **Take out record**, to slide the record out. Then drag in a circle to spin the disc, or tap **Flip to side B**.
- Pull up the sheet at the bottom for the liner notes: release details, your copy, prices, tracklist, credits and identifiers. Tap a musician's name to find their other records in your collection.
- Discogs doesn't say which photo is the back cover or a label. If Crate guesses wrong, tap the images button at the top right to tag each photo as Front, Back, Label A or Label B.
- With Android's **Remove animations** setting on, Crate swaps the physics for simple changes and adds turn buttons.

**Anniversaries.** Turn on reminders in **Settings → Release anniversaries**. Android asks for notification permission at that moment, not before. Crate schedules a notification at your chosen time (9:00 a.m. by default) on each album's original release date. For reissues it uses the date of the original release, not the reissue. Notifications only go out for records with a full date. Records where Discogs only has a year appear under **This year's anniversaries** instead. Open any record and use **Add exact release date** if you know it. Milestones (10, 25, 50, 60, 75 and 100 years) stand out, and you can limit reminders to milestones only. Tapping a notification opens that record.

**Settings** also has **Disconnect**, which removes your token and the synced data from the phone (your sort names and other local edits are kept), **Clear image cache**, and the dark and light themes.

---

## 5. What the Discogs API can and can't do

Crate uses only the official Discogs API, read-only, with your personal access token:

| What | Endpoint |
| --- | --- |
| Check the token | `GET /oauth/identity` |
| Profile and currency | `GET /users/{username}` (`curr_abbr`) |
| Folders, in Discogs order | `GET /users/{username}/collection/folders` |
| Your copies, with folder, notes, rating and date added | `GET /users/{username}/collection/folders/0/releases?per_page=100` |
| Custom fields (Media Condition, Sleeve Condition, Notes) | `GET /users/{username}/collection/fields` |
| Full release details | `GET /releases/{id}?curr_abbr=` |
| Original year and main release | `GET /masters/{id}`, then `GET /releases/{main_release}` |
| Price suggestions by condition | `GET /marketplace/price_suggestions/{id}` |
| Lowest listing and number for sale | `GET /marketplace/stats/{id}?curr_abbr=` |
| Collection value (minimum, median, maximum) | `GET /users/{username}/collection/value` |

Notes on these endpoints:

- Crate lists folder 0 ("All"), which returns every copy along with its `folder_id`. This costs fewer requests than listing each folder and gives the same result.
- Every request sends `Authorization: Discogs token=…` and a descriptive `User-Agent`.
- A queue keeps requests under the limit Discogs reports in its `X-Discogs-Ratelimit-*` headers, and backs off on HTTP 429.

Limits worth knowing:

- **Sales history isn't in the API.** "Last sold" and the lowest, median and highest sold prices on the Discogs website have no API endpoint, and scraping the site breaks Discogs's terms. Each record has a **Sales history on Discogs** link that opens that page in your browser instead.
- **Price suggestions need seller settings.** Without them, Crate explains what to do instead of showing a blank.
- **Price suggestions use your seller-settings currency.** Lowest listing and collection value use your account currency.
- **Collection value is for the whole collection only.** Discogs has no per-folder or per-record value.
- **Pressing plants come from the release's company credits** ("Pressed By", "Lacquer Cut At", and so on), not from identifiers. Matrix/runout and barcodes come from identifiers.
- **Masters only have a year.** For a full original date, Crate reads the master's main release. If that release's year doesn't match the master's year, Crate uses the year only.

---

## 6. Trying it in a desktop browser

From the project folder, install dependencies:

```bash
npm install
```

Then start the development server:

```bash
npm run dev
```

Open the address it prints. Sign in with the username **`demo`** and any token to browse a sample collection without contacting Discogs. With your real username and token, the development server forwards requests to Discogs for you. In the browser, reminders are saved but not delivered.

The sample collection is for development only. Its titles and musicians are real jazz records, but its ids, catalogue numbers, dates, conditions and prices are made up.

---

## 7. For developers

React 19, TypeScript in strict mode and Vite, wrapped with Capacitor 8.

```
src/
  api/          Typed Discogs client, rate-limited queue, transports (native, web, mock), mock data
  db/           Dexie (IndexedDB) schema and the joined RecordView model
  sync/         Sync engine and the pure incremental diff
  lib/          Sort names, shelf order, anniversary dates, search, colour, image cache
  state/        App store (zustand), settings (Capacitor Preferences), hooks
  features/
    setup/          First-run screen
    library/        Folder tabs, grid, shelf view, "On this day", sync status
    search/
    record/         Record screen, liner-notes sheet, prices, assign images
    inspector/      three.js scene, procedural textures, gestures
    anniversaries/  Notification scheduling and the anniversaries list
    settings/
android/        Capacitor Android project (signing reads env vars or keystore.properties)
```

Run the unit tests (sort names, anniversary date parsing, incremental sync diff and the rate-limit queue):

```bash
npm test
```

Check the types:

```bash
npm run typecheck
```

Design notes:

- **One shared WebGL canvas.** The inspector is the only `<Canvas>`. It renders on demand: it stops drawing when nothing moves.
- **Textures.** Covers are capped at 1024 px and labels at 512 px. All textures are mipmapped and disposed when you leave a record. Lighting is one warm spot light plus an environment built in code, so no HDR files are downloaded.
- **Images** are cached at two sizes: 400 px thumbnails for grids and up to 1600 px for textures. On the phone they're stored in the app's private storage.
- **Networking.** On the phone, all Discogs calls use `CapacitorHttp` (native HTTP), so CORS never applies.
- **Privacy.** No analytics and no third-party services. Fonts (Jost, Source Serif 4) are bundled with the app. Android backups are disabled so the token never leaves the phone.

---

## 8. Troubleshooting

- **"Discogs did not accept your token."** Generate a new token on discogs.com, then go to Settings → Disconnect and sign in again.
- **"App not installed" when updating.** The new APK was signed with a different key. Build it with your original key. If the key is lost, uninstall Crate first; this deletes its local data.
- **No notifications.** Check Android Settings → Apps → Crate → Notifications. Reminders are only sent for records with a full release date.
- **The GitHub build fails at "Restore signing key".** One of the four secrets is missing or misspelled.
- **Covers look wrong in 3D.** Use the images button on the record screen to tag the photos.
