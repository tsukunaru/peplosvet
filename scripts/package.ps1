$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$projectDirectory = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$archivePath = Join-Path $projectDirectory 'peplosvet-yandex.zip'
$releaseDirectory = Join-Path $projectDirectory ('.release-' + [System.IO.Path]::GetRandomFileName())
New-Item -ItemType Directory -Path $releaseDirectory | Out-Null
try {
  Copy-Item -LiteralPath (Join-Path $projectDirectory 'index.html'),(Join-Path $projectDirectory 'style.css') -Destination $releaseDirectory
  Copy-Item -LiteralPath (Join-Path $projectDirectory 'src') -Destination $releaseDirectory -Recurse
  Compress-Archive -Path (Join-Path $releaseDirectory '*') -DestinationPath $archivePath -Force -CompressionLevel Optimal
  $archive = [System.IO.Compression.ZipFile]::OpenRead($archivePath)
  try {
    if (-not ($archive.Entries | Where-Object FullName -eq 'index.html')) { throw 'Missing root index.html' }
    if ($archive.Entries | Where-Object FullName -match '[^\x00-\x7F]|\s') { throw 'Invalid archive filenames' }
    if (($archive.Entries | Measure-Object Length -Sum).Sum -gt 100MB) { throw 'Release exceeds 100 MB' }
  } finally { $archive.Dispose() }
} finally {
  $resolvedRelease = [System.IO.Path]::GetFullPath($releaseDirectory)
  if (-not $resolvedRelease.StartsWith($projectDirectory + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe cleanup path' }
  Remove-Item -LiteralPath $resolvedRelease -Recurse -Force
}
Get-Item -LiteralPath $archivePath | Select-Object FullName, Length
