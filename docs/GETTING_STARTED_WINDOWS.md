# Getting started on Windows (PowerShell)

> **Just want to play?** You don't need any of this. The latest build is
> published as a private claude.ai page you can open on your phone:
> <https://claude.ai/artifact/22yXQskjPm1t3hQALT4TGe>. It's updated after
> each phase. This guide is only for running and editing the code on a PC.

This guide assumes you've never used Git before. Copy each command into
**PowerShell** and press Enter.

## 1. Install the tools (one time)

1. **Git for Windows**: download it from <https://git-scm.com/download/win> and
   run the installer. The default options are all fine.
2. **Node.js LTS**: download it from <https://nodejs.org> (the button that says
   "LTS") and run the installer.
3. **Close and reopen PowerShell** so it picks up the new programs, then check
   that both are installed:

   ```powershell
   git --version
   node --version
   ```

   Each should print a version number. Node should be `v22` or higher.

4. Tell Git who you are (this goes into your commit history):

   ```powershell
   git config --global user.name "Your Name"
   git config --global user.email "you@example.com"
   ```

## 2. Download the project

Pick a folder for your projects, then clone the repository:

```powershell
cd $HOME\Documents
git clone https://github.com/AidFryer/duck-hunt-idle.git
cd duck-hunt-idle
```

The work happens on a branch called `claude/duck-hunt-idle-game-05ie4u`
(a branch is a named line of changes). It's currently the repository's
default branch, so `git clone` already gives you the latest code and you
don't need to switch branches.

## 3. Run the game

```powershell
npm install
npm run dev
```

`npm install` is only needed the first time, and again whenever
`package.json` changes. `npm run dev` prints a link like
`http://localhost:5173/`. Hold **Ctrl** and click it, or paste it into
your browser. Press **Ctrl + C** in PowerShell to stop the server.

**Try it on your phone:** run `npm run dev -- --host` instead. Vite prints a
"Network" address such as `http://192.168.1.20:5173/`. Open that on a phone
connected to the same Wi-Fi.

## 4. Get the latest changes

Each time a new phase is pushed, pull it down:

```powershell
git pull
npm install
npm run dev
```

## 5. Optional: a public web link (GitHub Pages)

The repository has a workflow (`.github/workflows/pages.yml`) that publishes
the game to `https://aidfryer.github.io/duck-hunt-idle/` on every push. On
GitHub's free plan, Pages only works for **public** repositories, so the
workflow skips itself while the repo is private. To turn it on (works from a
phone browser too):

1. Open <https://github.com/AidFryer/duck-hunt-idle/settings>, scroll to
   **Danger Zone** → **Change visibility** → **Make public**.
2. Open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Open the **Actions** tab, pick **Deploy to GitHub Pages**, and press
   **Run workflow**.

## Handy Git commands

| Command | What it does |
|---|---|
| `git status` | Shows which branch you're on and what has changed |
| `git log --oneline -10` | Shows the last 10 commits |
| `git pull` | Downloads new commits for your current branch |
| `git restore .` | Throws away your local edits (careful!) |

## Troubleshooting

- **`npm` is not recognized**: close and reopen PowerShell after installing
  Node. If it still fails, restart Windows.
- **"running scripts is disabled on this system"**: run this once, then try
  again:
  `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`
- **A blank or black scene**: make sure hardware acceleration is turned on in
  your browser settings. The marsh needs WebGL.
