param(
    [ValidateSet('up', 'build', 'backup', 'migrate', 'api', 'infra', 'qdrant', 'down', 'status', 'logs', 'admin', 'demo-users')]
    [string]$Action = 'up',
    [string]$CentreRoot = 'F:\Docker_Centre\kodmod'
)

$ErrorActionPreference = 'Stop'
$sourceRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
if ($dockerCommand) {
    $dockerExe = $dockerCommand.Source
} else {
    $dockerDirectory = Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\resources\bin'
    $dockerExe = Join-Path $dockerDirectory 'docker.exe'
    $env:Path = "$dockerDirectory;$env:Path"
}
if (-not (Test-Path -LiteralPath $dockerExe)) {
    throw 'Docker CLI not found. Start Docker Desktop first.'
}

$composeArgs = @('compose', '--project-directory', $sourceRoot)
$centreEnv = [System.IO.Path]::Combine($CentreRoot, '.env')
$centreOverride = [System.IO.Path]::Combine($CentreRoot, 'compose.override.yaml')
if ((Test-Path -LiteralPath $centreEnv) -and (Test-Path -LiteralPath $centreOverride)) {
    $entry = Get-Content -LiteralPath $centreEnv |
        Where-Object { $_ -match '^KODMOD_SOURCE_ROOT=' } | Select-Object -First 1
    if (-not $entry) { throw 'Docker Centre has no KODMOD_SOURCE_ROOT.' }
    $configuredRoot = ($entry -split '=', 2)[1].Trim().Trim('"').Trim("'")
    $resolvedRoot = (Resolve-Path -LiteralPath $configuredRoot).Path
    if ($resolvedRoot -ne $sourceRoot) {
        throw "Docker Centre points to a different checkout: $resolvedRoot"
    }
    $composeArgs += @('--project-name', 'kodmod-centre', '--env-file', $centreEnv,
        '--file', (Join-Path $sourceRoot 'docker-compose.yml'), '--file', $centreOverride)
} else {
    $composeArgs += @('--file', (Join-Path $sourceRoot 'docker-compose.yml'))
}

function Save-DatabaseBackup {
    param([switch]$Required)
    $taskContainer = & $dockerExe @composeArgs ps --all -q postgres
    if ($LASTEXITCODE -ne 0) { throw 'Could not inspect the PostgreSQL service.' }
    if (-not $taskContainer) {
        if ($Required) { throw 'Start PostgreSQL before creating a backup.' }
        return # Fresh installation: no existing database to back up.
    }
    $taskContainer = $taskContainer.Trim()
    $taskBackupDirectory = if (Test-Path -LiteralPath $centreOverride) {
        Join-Path $CentreRoot 'backups'
    } else {
        Join-Path $sourceRoot '.runtime/backups'
    }
    New-Item -ItemType Directory -Force -Path $taskBackupDirectory | Out-Null
    $taskName = 'kodmod-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [guid]::NewGuid().ToString('N').Substring(0, 8) + '.dump'
    $taskRemotePath = '/tmp/' + $taskName
    $taskDestination = Join-Path $taskBackupDirectory $taskName
    & $dockerExe @composeArgs exec -T postgres pg_dump -U kodmod -d kodmod -Fc -f $taskRemotePath
    if ($LASTEXITCODE -ne 0) { throw 'Database backup failed. Runtime update cancelled.' }
    $taskArchive = & $dockerExe @composeArgs exec -T postgres pg_restore --list $taskRemotePath
    if ($LASTEXITCODE -ne 0 -or $taskArchive.Count -lt 10) { throw 'Database backup archive is invalid.' }
    & $dockerExe cp "${taskContainer}:$taskRemotePath" $taskDestination
    if ($LASTEXITCODE -ne 0) { throw 'Could not copy the database backup to persistent storage.' }
    $taskFile = Get-Item -LiteralPath $taskDestination
    if ($taskFile.Length -eq 0) { throw 'Database backup is empty.' }
    $taskManifest = @{
        created_at = [DateTimeOffset]::UtcNow.ToString('o')
        filename = $taskName
        bytes = $taskFile.Length
        sha256 = (Get-FileHash -LiteralPath $taskDestination -Algorithm SHA256).Hash.ToLowerInvariant()
        archive_entries = $taskArchive.Count
        source_checkout = $sourceRoot
    }
    $taskManifest | ConvertTo-Json | Set-Content -LiteralPath ($taskDestination + '.json') -Encoding utf8
    Write-Host "Verified PostgreSQL backup: $taskDestination"
}

# Preserve the existing database before Compose's migration dependency runs.
if ($Action -in @('up', 'api', 'migrate')) {
    & $dockerExe @composeArgs up -d --wait --wait-timeout 90 postgres
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL is unavailable. Runtime update cancelled.' }
    Save-DatabaseBackup -Required
} elseif ($Action -eq 'backup') {
    Save-DatabaseBackup -Required
}

switch ($Action) {
    'backup' { exit 0 }
    'up' { $composeArgs += @('up', '-d', '--build', '--wait', '--wait-timeout', '180') }
    'api' { $composeArgs += @('up', '-d', '--build', '--wait', '--wait-timeout', '180') }
    'build' { $composeArgs += @('build', 'ai-engine', 'web') }
    'infra' { $composeArgs += @('up', '-d', 'postgres', 'redis') }
    'migrate' { $composeArgs += @('run', '--rm', '--build', 'migrate') }
    'qdrant' { $composeArgs += @('--profile', 'qdrant', 'up', '-d', 'qdrant') }
    'down' { $composeArgs += @('down') }
    'status' { $composeArgs += @('ps', '--all') }
    'logs' { $composeArgs += @('logs', '--tail', '100', '--follow') }
    'admin' { $composeArgs += @('exec', 'ai-engine', 'python', '-m', 'scripts.create_admin', '--username', 'admin') }
    'demo-users' {
        & $dockerExe @composeArgs build ai-engine
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        $runContainer = "kodmod-demo-users-$PID"
        $composeArgs += @('run', '--rm', '--no-deps', '--name', $runContainer, 'ai-engine', 'python', '-m', 'scripts.seed_demo_users')
    }
}
& $dockerExe @composeArgs
exit $LASTEXITCODE
