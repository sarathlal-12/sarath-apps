# Sarath Lal · Apps

Source of https://sarath-apps.vercel.app (also served at https://spotvault-web.vercel.app).

Plain HTML, no build step. Vercel deploys every push to `main` automatically.

## Update the site
```bash
git add -A
git commit -m "what changed"
git push
```
It's live about a minute later.

## Layout
| Path | What |
|---|---|
| `index.html` | Home: the project picker |
| `spotvault/` | SpotVault page |
| `airbridge/` | AirBridge page |
| `j/`, `pc/` | SpotVault Jam and PC link pages (used by the apps, don't move) |
| `api/altstore.js` | SpotVault iPhone update feed, served at `/altstore.json` (see `vercel.json`) |
| `logo.png`, `og.png`, `app_icon.ico` | SpotVault images (the apps use `/logo.png`) |

## Add a new project
1. In `index.html`, copy one `<a class="proj">` card and change the link, colour, logo and text.
2. Make a folder `<name>/` with an `index.html` (copy `airbridge/index.html` as a starting point).
3. Add the page to `sitemap.xml` and `llms.txt`.
4. Commit and push.

Preview locally: `py -m http.server 8765` in this folder, then open http://localhost:8765.
