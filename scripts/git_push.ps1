Param(
    [string]$remoteUrl = "",
    [string]$branch = "main",
    [string]$message = "Update from local"
)

if ($remoteUrl -eq "") {
    Write-Host "Usage: .\git_push.ps1 -remoteUrl 'https://github.com/USER/REPO.git' [-branch 'main'] [-message 'commit message']"
    exit 1
}

Write-Host "Using remote: $remoteUrl"

# Ensure we are in repo root (script assumes run from repository root)
# Check git available
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "git is not available in PATH. Install Git first."; exit 1
}

# Set or update origin
$existing = git remote get-url origin 2>$null
if ($LASTEXITCODE -ne 0) {
    git remote add origin $remoteUrl
    Write-Host "Added origin $remoteUrl"
} else {
    git remote set-url origin $remoteUrl
    Write-Host "Set origin to $remoteUrl"
}

# Add, commit, push
git add .
$commitOutput = git commit -m "$message" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Commit step returned non-zero. Message:"
    Write-Host $commitOutput
    if ($commitOutput -match "nothing to commit") {
        Write-Host "Nothing to commit. Proceeding to push..."
    } else {
        exit 1
    }
}

Write-Host "Pushing to origin/$branch..."
git push -u origin $branch
if ($LASTEXITCODE -eq 0) { Write-Host "Push successful." } else { Write-Host "Push failed. Check remote URL and your credentials."; exit 1 }
