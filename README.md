# Sparkbox

Pass-and-play party games: **SpyPlay**, **Mafia**, and **Call It**.

Static HTML, CSS, and JavaScript — no build step required.

## Deploy on Vercel

### Option A — GitHub (recommended)

1. Install [Git](https://git-scm.com/) if needed, then push this folder to a GitHub repo:

   ```bash
   cd sparkbox
   git init
   git add .
   git commit -m "Initial Sparkbox release"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/sparkbox.git
   git push -u origin main
   ```

2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.

3. Use these project settings:

   | Setting | Value |
   |---------|-------|
   | Framework Preset | **Other** |
   | Root Directory | `.` (leave default) |
   | Build Command | *(empty)* |
   | Output Directory | `.` |
   | Install Command | *(empty)* |

4. Click **Deploy**. Vercel will serve `index.html` at your project URL.

The `mobile-app/` folder is excluded from uploads via `.vercelignore` and is not part of the web deployment.

### Option B — Vercel CLI

```bash
cd sparkbox
npx vercel
```

Follow the prompts. For production:

```bash
npx vercel --prod
```

## Local development

```bash
cd sparkbox
python -m http.server 8080 --bind 127.0.0.1
```

Open [http://127.0.0.1:8080](http://127.0.0.1:8080).

> ES modules require a local server — opening `index.html` directly from the filesystem will not work.
