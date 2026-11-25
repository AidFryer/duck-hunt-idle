# Getting started on Windows (PowerShell)

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

The work happens on a branch called `claude/duck-hunt-idle-game-05ie4u`.
A branch is a separate line of changes, so `main` stays clean until you
decide to merge. Switch to the branch:

```powershell
git checkout claude/duck-hunt-idle-game-05ie4u
```

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

## 5. When you're happy with a phase: merge it into `main`

The easiest way is on the GitHub website:

1. Go to <https://github.com/AidFryer/duck-hunt-idle>.
2. GitHub usually shows a yellow banner, "claude/duck-hunt-idle-game-05ie4u had
   recent pushes", with a **Compare & pull request** button. Click it. If there's
   no banner, open the **Pull requests** tab, click **New pull request**, set
   *base* to `main` and *compare* to the claude branch.
3. Click **Create pull request**, then **Merge pull request**.

## Handy Git commands

| Command | What it does |
|---|---|
| `git status` | Shows which branch you're on and what has changed |
| `git log --oneline -10` | Shows the last 10 commits |
| `git pull` | Downloads new commits for your current branch |
| `git checkout main` | Switches to the `main` branch |
| `git restore .` | Throws away your local edits (careful!) |

## Troubleshooting

- **`npm` is not recognized**: close and reopen PowerShell after installing
  Node. If it still fails, restart Windows.
- **"running scripts is disabled on this system"**: run this once, then try
  again:
  `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`
- **A blank or black scene**: make sure hardware acceleration is turned on in
  your browser settings. The marsh needs WebGL.
