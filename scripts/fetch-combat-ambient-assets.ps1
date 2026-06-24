# Royalty-free Mixkit assets for slagorde round-bar ambience (free license).
# Run from repo root: .\scripts\fetch-combat-ambient-assets.ps1

$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path 'Video/combat', 'audio/combat-ambient' | Out-Null

$assets = @(
  @{ Url = 'https://assets.mixkit.co/videos/preview/mixkit-firewood-burning-in-a-fireplace-close-up-4298-large.mp4'; Out = 'Video/combat/rust-campfire.mp4' },
  @{ Url = 'https://assets.mixkit.co/videos/preview/mixkit-slow-motion-of-samurai-training-with-a-katana-32899-large.mp4'; Out = 'Video/combat/combat-knights.mp4' },
  @{ Url = 'https://assets.mixkit.co/videos/preview/mixkit-embers-and-fire-glowing-in-the-dark-4278-large.mp4'; Out = 'Video/combat/pause-embers.mp4' },
  @{ Url = 'https://assets.mixkit.co/sfx/preview/mixkit-summer-night-crickets-and-insects-60.wav'; Out = 'audio/combat-ambient/rust-crickets.wav' },
  @{ Url = 'https://assets.mixkit.co/sfx/preview/mixkit-campfire-crackles-1733.wav'; Out = 'audio/combat-ambient/rust-fire-crackle.wav' },
  @{ Url = 'https://assets.mixkit.co/sfx/preview/mixkit-medieval-sword-clash-2608.wav'; Out = 'audio/combat-ambient/combat-swords.wav' },
  @{ Url = 'https://assets.mixkit.co/sfx/preview/mixkit-light-wind-1165.wav'; Out = 'audio/combat-ambient/pause-wind.wav' }
)

foreach ($asset in $assets) {
  Write-Host "Downloading $($asset.Out)..."
  Invoke-WebRequest -Uri $asset.Url -OutFile $asset.Out
}

Write-Host 'Done. Point src/lib/combatAmbientLibrary.js at local files when ready.'
