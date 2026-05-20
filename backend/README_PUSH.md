Quick instructions to push this repo to a remote GitHub repository.

1. From the project root (`backend`) open PowerShell or Bash.

PowerShell example:

```powershell
# run the script (provide your repo URL)
.
\scripts\git_push.ps1 -remoteUrl 'https://github.com/USERNAME/REPO.git' -branch 'main' -message 'Your commit message'
```

Bash example:

```bash
# make script executable once (if needed)
chmod +x scripts/git_push.sh
./scripts/git_push.sh https://github.com/USERNAME/REPO.git main "Your commit message"
```

Notes:
- You must have `git` installed and configured with credentials (HTTPS credential helper or SSH keys).
- Scripts only set the `origin` remote and push — they do not create the GitHub repo. Create the repo on GitHub first if it doesn't exist.
- If your default branch is `main` use `main`; otherwise pass your branch name.
