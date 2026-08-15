# aayush.gupta — portfolio site

Plain HTML/CSS/JS. No build step, no dependencies to install — just static files.

## Structure

```
index.html         Home (hero + teasers)
about.html          Full bio + "off duty" (placeholder — fill in your interests)
ventures.html        life2see + future ventures
achievements.html    Oxford MUN + future achievements
now.html             What you're focused on right now
contact.html          Email / phone (add LinkedIn, Instagram, resume when ready)
404.html              Shown by GitHub Pages for any missing/mistyped URL
.nojekyll              Tells GitHub Pages to serve files as-is (see below — keep this)
css/style.css         All styles + design tokens (colors, fonts) at the top
js/hero.js            The animated wireframe globe on the homepage (Three.js)
js/main.js            Mobile nav + scroll-reveal animation
assets/favicon.svg     The small browser-tab icon
```

Everything uses relative links (`css/style.css`, `about.html`, etc.), so the site works
regardless of what you name the repository or whether it's a user site or a project
site — no path editing needed.

`.nojekyll` is an empty file with a name that starts with a dot, so it may not show in
some file browsers or zip extractions — if you don't see it, that's fine as long as you
copied everything from this folder; just don't recreate the repo without it.

## Editing content

Every page is plain HTML — open any `.html` file in a text editor and change the text
directly. Look for `<!-- ... -->` comments and `placeholder-card` blocks; those mark
spots that are meant to be filled in or replaced (e.g. About > Off duty, Contact page
extra rows).

To change colors or fonts, edit the `:root { ... }` block at the top of `css/style.css`
— every color and font in the site is driven from those variables.

## Running it locally

No server needed for basic editing, but for the smoothest local preview (some browsers
restrict local file access), run a tiny local server from this folder:

```
python3 -m http.server 8000
```

Then open http://localhost:8000 in your browser.

## Deploying with GitHub Pages (upload only — no git needed)

1. Go to [github.com/new](https://github.com/new) and create a new repository (e.g.
   `aayush-portfolio`). Public, no README/gitignore/license needed — leave it empty.
2. Open the new repo and click **"uploading an existing file"** (on the empty-repo
   page) or **Add file → Upload files** (from the repo's normal page).
3. Drag in **everything inside this folder** — all the `.html` files, the `css/`
   folder, the `js/` folder, the `assets/` folder, `404.html`, and `.nojekyll`.
   Upload them so they land at the **root of the repo**, not inside a subfolder
   (i.e. `index.html` should be at `yourrepo/index.html`, not
   `yourrepo/aayush-portfolio/index.html`). Some browsers hide dotfiles like
   `.nojekyll` when you drag a folder — if it doesn't upload automatically, use
   "Add file → Create new file", name it exactly `.nojekyll`, and leave it empty.
4. Scroll down and click **Commit changes**.
5. Go to the repo's **Settings → Pages**.
6. Under "Build and deployment", set **Source** to "Deploy from a branch", branch
   `main`, folder `/ (root)`. Save.
7. GitHub will give you a URL like `https://<your-username>.github.io/aayush-portfolio/`
   — it can take a minute or two to go live the first time, and a minute or two again
   after every future update.
8. To update content later: open the file on GitHub, click the pencil (edit) icon,
   make your change, and commit — no local setup required.
9. (Optional) If you buy a custom domain later, add a `CNAME` file with the domain
   name and configure DNS per GitHub's custom domain docs.

## Still to add

- Off-duty / personal interests (About page)
- More ventures/projects as they're ready
- More achievements as they come in
- Resume PDF + a Contact row linking to it
- LinkedIn / Instagram links (Contact page has commented-out rows ready to uncomment)
