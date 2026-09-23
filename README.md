

https://github.com/user-attachments/assets/863839b1-6b51-404d-b5d0-a10ad8589b29

# Workout log (iPhone & Android web app)

Everything you log stays on your phone. There is no account and no sync.

## 1. Put it online (free)

The app has to be served over https so your iPhone will install it and run it offline.
Any of these work. Upload the files in this folder exactly as they are.

- **Netlify:** make a free account, choose to deploy a site manually, and drag this folder in.
- **GitHub Pages:** make a repository, upload these files, then in Settings > Pages publish from the main branch.
  Your address will look like `https://yourname.github.io/reponame/`.
- **Cloudflare Pages:** create a project with "Direct Upload" and add this folder.

Menu names on these sites change now and then, so follow their on-screen prompts.

## 2. Install it on your phone

### iPhone

1. Open your new address in **Safari**.
2. Tap **Share**, then **Add to Home Screen**, then **Add**.
3. From now on, open it from the home screen icon, not from Safari.

Opening it from the icon matters. Safari deletes saved data for sites you haven't visited in about a week,
but apps opened from the home screen are counted separately.

### Android

1. Open your new address in **Chrome**.
2. Chrome often shows an **Install app** banner on its own. If not, tap the **⋮** menu, then **Install app**
   (older versions say **Add to Home screen**).
3. Confirm. It adds a real home-screen icon that opens full-screen, not just a bookmark.

Other Android browsers (Samsung Internet, Firefox, Edge) offer the same option, usually worded
"Add to Home screen" or "Install app" in their menu. Android doesn't clear site data for inactivity
the way Safari does, so this step is mainly about getting a proper full-screen icon rather than protecting your data —
back up regularly either way.

## 3. Check it works offline

Open the app once with internet, then turn on airplane mode and open it again. It should load normally.

## Backups (please do this)

Your data lives only in this one place on your phone. On the History tab, use **Export backup**
now and then. It opens the share sheet, so you can save the file to Files, AirDrop it, or email it to yourself.
**Import backup** restores it, for example on a new phone or after deleting the app.

Anything you logged in the Claude prototype does not carry over. Only data entered in this app is here.

## Updating the app

1. Change the files.
2. Open `sw.js` and change `VERSION = 'v1'` to `'v2'` (then `'v3'`, and so on).
3. Upload the files again.
4. Open the app twice on your phone. The first open fetches the new version, the second one uses it.

## Fonts

The look uses Barlow and Barlow Condensed, loaded from Google Fonts the first time you're online and then kept for offline use.
If they can't load, iPhone system fonts stand in. To avoid Google entirely, download the fonts and add them with `@font-face`
in `styles.css`, then remove the Google Fonts lines from `index.html`.

## What's in the folder

- `index.html`, `styles.css`, `app.js`: the app
- `manifest.webmanifest`, `icons/`: what makes it installable
- `sw.js`: what lets it open offline
