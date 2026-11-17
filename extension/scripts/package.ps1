$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression

$extensionRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $extensionRoot '..'))
$artifactRoot = Join-Path $repositoryRoot 'artifacts/extension'
$archivePath = Join-Path $artifactRoot 'formER-development.zip'
$receiptPath = Join-Path $artifactRoot 'formER-development.json'
$files = Get-Content -LiteralPath (Join-Path $extensionRoot 'package-files.json') -Raw | ConvertFrom-Json
$manifest = Get-Content -LiteralPath (Join-Path $extensionRoot 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if ($manifest.manifest_version -ne 3) { throw 'Expected a Manifest V3 extension.' }
if ($files.Count -ne @($files | Select-Object -Unique).Count) { throw 'Duplicate package entries.' }

# Only explicitly reviewed runtime files are packaged. No recursive folder copies.
$references = @('manifest.json', $manifest.background.service_worker, $manifest.action.default_popup, 'popup/review.css', 'popup/review.js', $manifest.side_panel.default_path, 'sidepanel/review.css', 'sidepanel/review.js', 'content/fill.js')
$references += @($manifest.icons.PSObject.Properties.Value)
$references += @($manifest.action.default_icon.PSObject.Properties.Value)
foreach ($reference in $references) {
  if ($files -cnotcontains $reference) { throw "Missing manifest dependency in package-files.json: $reference" }
}
$sourceHashes = @()
foreach ($file in $files) {
  if ($file -notmatch '^[a-zA-Z0-9_./-]+$' -or $file.Contains('..') -or $file.StartsWith('/') -or
      $file -match '(^|/)(node_modules|tests?|\.env)|\.(map|zip|pem|key)$') {
    throw "Unsafe package entry: $file"
  }
  $source = Join-Path $extensionRoot $file
  $item = Get-Item -LiteralPath $source
  if ($item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
    throw "Expected a regular source file: $file"
  }
  $sourceHashes += [ordered]@{ path = $file; sha256 = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant() }
}

# Build and inspect a temporary archive before replacing the previously verified one.
[IO.Directory]::CreateDirectory($artifactRoot) | Out-Null
$temporary = Join-Path $artifactRoot ('.package-' + [guid]::NewGuid().ToString('N') + '.zip')
try {
  $archive = [IO.Compression.ZipFile]::Open($temporary, [IO.Compression.ZipArchiveMode]::Create)
  try {
    foreach ($file in $files) {
      [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, (Join-Path $extensionRoot $file), $file, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
  } finally { $archive.Dispose() }

  $archive = [IO.Compression.ZipFile]::OpenRead($temporary)
  try {
    if ($archive.Entries.Count -ne $files.Count) { throw 'Unexpected archive entries.' }
    foreach ($record in $sourceHashes) {
      $entry = $archive.GetEntry($record.path)
      if ($null -eq $entry) { throw "Missing archive entry: $($record.path)" }
      $stream = $entry.Open()
      $hasher = [Security.Cryptography.SHA256]::Create()
      try { $hash = [BitConverter]::ToString($hasher.ComputeHash($stream)).Replace('-', '').ToLowerInvariant() }
      finally { $stream.Dispose(); $hasher.Dispose() }
      if ($hash -cne $record.sha256) { throw "Archive integrity mismatch: $($record.path)" }
    }
    $reader = [IO.StreamReader]::new($archive.GetEntry('manifest.json').Open())
    try { $packedManifest = $reader.ReadToEnd() | ConvertFrom-Json } finally { $reader.Dispose() }
    if ($packedManifest.manifest_version -ne 3) { throw 'Packaged manifest is invalid.' }
  } finally { $archive.Dispose() }

  $receipt = [ordered]@{
    version = $manifest.version
    sha256 = (Get-FileHash -LiteralPath $temporary -Algorithm SHA256).Hash.ToLowerInvariant()
    files = $sourceHashes
  }
  Move-Item -LiteralPath $temporary -Destination $archivePath -Force
  [IO.File]::WriteAllText($receiptPath, ($receipt | ConvertTo-Json -Depth 5), [Text.UTF8Encoding]::new($false))
  Write-Output "Verified $($files.Count) files; manifest.json is at the ZIP root."
  Write-Output "ZIP: $archivePath"
} finally {
  # This exact temporary file is created above inside the repository artifacts directory.
  if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary }
}
