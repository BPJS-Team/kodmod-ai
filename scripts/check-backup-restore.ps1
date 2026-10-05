param(
    [Parameter(Mandatory = $true)][string]$BackupPath,
    [string]$TestContainer = 'kodmod-postgres-test'
)
$ErrorActionPreference = 'Stop'
$taskDockerDirectory = Join-Path $env:LOCALAPPDATA 'Programs/DockerDesktop/resources/bin'
$taskDockerExe = (Get-Command docker -ErrorAction SilentlyContinue).Source
if (-not $taskDockerExe) { $taskDockerExe = Join-Path $taskDockerDirectory 'docker.exe'; $env:Path = "$taskDockerDirectory;$env:Path" }
if ($TestContainer -ne 'kodmod-postgres-test') { throw 'Restore checks only accept the dedicated test container.' }
$taskInspect = & $taskDockerExe inspect $TestContainer
if ($LASTEXITCODE -ne 0) { throw 'Dedicated test PostgreSQL is unavailable.' }
$taskContainer = ($taskInspect | ConvertFrom-Json)[0]
if ($taskContainer.Name -ne '/kodmod-postgres-test' -or $taskContainer.NetworkSettings.Ports.'5432/tcp'[0].HostPort -ne '5434') {
    throw 'Restore check requires the isolated PostgreSQL container on port 5434.'
}
$taskArchive = (Resolve-Path -LiteralPath $BackupPath).Path
$taskManifest = Get-Content -LiteralPath ($taskArchive + '.json') -Raw | ConvertFrom-Json
if ((Get-FileHash -LiteralPath $taskArchive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $taskManifest.sha256) {
    throw 'Backup SHA256 verification failed.'
}
$taskDatabase = 'kodmod_restore_test_' + [guid]::NewGuid().ToString('N').Substring(0, 12)
$taskRemoteArchive = '/tmp/' + $taskDatabase + '.dump'
$taskCreated = $false
try {
    & $taskDockerExe cp $taskArchive "${TestContainer}:$taskRemoteArchive"
    if ($LASTEXITCODE -ne 0) { throw 'Backup could not be copied to the isolated container.' }
    & $taskDockerExe exec $TestContainer pg_restore --list $taskRemoteArchive | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Backup archive is invalid.' }
    & $taskDockerExe exec $TestContainer createdb -U kodmod -T template0 $taskDatabase
    if ($LASTEXITCODE -ne 0) { throw 'Could not create the disposable restore database.' }
    $taskCreated = $true
    & $taskDockerExe exec $TestContainer pg_restore -U kodmod -d $taskDatabase --no-owner --no-privileges --exit-on-error $taskRemoteArchive
    if ($LASTEXITCODE -ne 0) { throw 'Restore failed on the isolated database.' }
    $taskVersion = & $taskDockerExe exec $TestContainer psql -U kodmod -d $taskDatabase -Atc 'SELECT version_num FROM alembic_version'
    if ($LASTEXITCODE -ne 0 -or -not $taskVersion) { throw 'Restored migration version could not be read.' }
    $taskCounts = & $taskDockerExe exec $TestContainer psql -U kodmod -d $taskDatabase -Atc 'SELECT count(*) FROM users'
    if ($LASTEXITCODE -ne 0) { throw 'Restored application records could not be read.' }
    Write-Host "PASS isolated backup restore: schema=$taskVersion users=$taskCounts sha256=$($taskManifest.sha256)"
} finally {
    if ($taskCreated) {
        if ($taskDatabase -notmatch '^kodmod_restore_test_[a-f0-9]{12}$') { throw 'Unsafe restore database name.' }
        & $taskDockerExe exec $TestContainer dropdb -U kodmod $taskDatabase
        if ($LASTEXITCODE -ne 0) { Write-Warning 'Disposable restore database cleanup needs attention.' }
    }
    & $taskDockerExe exec $TestContainer rm -f $taskRemoteArchive
}
