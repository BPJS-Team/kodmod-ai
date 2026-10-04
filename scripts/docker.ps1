param(
    [ValidateSet('up', 'build', 'migrate', 'api', 'infra', 'qdrant', 'down', 'status', 'logs', 'admin')]
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

switch ($Action) {
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
}
& $dockerExe @composeArgs
exit $LASTEXITCODE
