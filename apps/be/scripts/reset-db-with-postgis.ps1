param(
  [string]$EnvFile = ".env",
  [string]$ContainerName = "dens-cakra-postgis",
  [string]$PostgisImage = "postgis/postgis:16-3.4",
  [switch]$KeepExistingContainer
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Get-EnvValue {
  param(
    [string]$Path,
    [string]$Key
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Environment file not found: $Path"
  }

  foreach ($line in Get-Content -LiteralPath $Path) {
    if ($line -match "^\s*$Key=(.+)$") {
      $value = $Matches[1].Trim()
      if ($value.StartsWith('"') -and $value.EndsWith('"')) {
        return $value.Substring(1, $value.Length - 2)
      }

      return $value
    }
  }

  throw "Key '$Key' not found in $Path"
}

function Test-Command {
  param([string]$Name)
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Wait-For-Postgres {
  param(
    [string]$Name,
    [string]$User,
    [int]$MaxAttempts = 30
  )

  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    $null = docker exec $Name pg_isready -U $User -d postgres 2>$null
    if ($LASTEXITCODE -eq 0) {
      return
    }

    Start-Sleep -Seconds 2
  }

  throw "PostgreSQL in container '$Name' did not become ready in time."
}

if (-not (Test-Command "docker")) {
  throw "Docker CLI not found. Install Docker Desktop first."
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendRoot = Split-Path -Parent $scriptDir
$envPath = Join-Path $backendRoot $EnvFile
$databaseUrl = Get-EnvValue -Path $envPath -Key "DATABASE_URL"

if (-not $databaseUrl.StartsWith("postgresql://")) {
  throw "Only postgresql:// DATABASE_URL values are supported by this helper."
}

$uri = [System.Uri]$databaseUrl
$databaseName = $uri.AbsolutePath.TrimStart("/")
$dbUser = $uri.UserInfo.Split(":")[0]
$dbPassword = if ($uri.UserInfo.Contains(":")) { $uri.UserInfo.Split(":", 2)[1] } else { "" }
$dbHost = $uri.Host
$dbPort = if ($uri.Port -gt 0) { $uri.Port } else { 5432 }

if ([string]::IsNullOrWhiteSpace($databaseName)) {
  throw "Database name is missing in DATABASE_URL."
}

if ([string]::IsNullOrWhiteSpace($dbUser)) {
  throw "Database user is missing in DATABASE_URL."
}

if ($dbHost -notin @("localhost", "127.0.0.1")) {
  throw "This helper only manages local Docker databases. Current host: $dbHost"
}

Write-Step "Checking Docker daemon"
$null = docker info 2>$null
if ($LASTEXITCODE -ne 0) {
  throw "Docker daemon is not available. Start Docker Desktop first."
}

$existingContainerName = ""
$existingContainerImage = ""
$portMatch = docker ps -a --filter "publish=$dbPort" --format "{{.Names}}|{{.Image}}" 2>$null
if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($portMatch)) {
  $firstMatch = $portMatch | Select-Object -First 1
  $parts = $firstMatch.Split("|", 2)
  $existingContainerName = $parts[0]
  $existingContainerImage = if ($parts.Length -gt 1) { $parts[1] } else { "" }
}

if (-not [string]::IsNullOrWhiteSpace($existingContainerName)) {
  if ($existingContainerImage -like "postgis/postgis*") {
    $ContainerName = $existingContainerName
    Write-Step "Reusing existing PostGIS container '$ContainerName'"
    docker start $ContainerName | Out-Null
  }
  elseif ($KeepExistingContainer) {
    throw "Port $dbPort is occupied by non-PostGIS container '$existingContainerName' ($existingContainerImage). Re-run without -KeepExistingContainer to replace it."
  }
  else {
    Write-Step "Replacing non-PostGIS container '$existingContainerName' on port $dbPort"
    docker rm -f $existingContainerName | Out-Null
  }
}

if ([string]::IsNullOrWhiteSpace($existingContainerName) -or $existingContainerImage -notlike "postgis/postgis*") {
  $namedContainer = docker ps -a --filter "name=^${ContainerName}$" --format "{{.Names}}" 2>$null
  if ($LASTEXITCODE -eq 0 -and $namedContainer -contains $ContainerName) {
    Write-Step "Removing stale container '$ContainerName'"
    docker rm -f $ContainerName | Out-Null
  }

  Write-Step "Starting PostGIS container '$ContainerName'"
  docker run `
    --detach `
    --name $ContainerName `
    --publish "${dbPort}:5432" `
    --env "POSTGRES_USER=$dbUser" `
    --env "POSTGRES_PASSWORD=$dbPassword" `
    --env "POSTGRES_DB=postgres" `
    $PostgisImage | Out-Null
}

Write-Step "Waiting for PostgreSQL to be ready"
Wait-For-Postgres -Name $ContainerName -User $dbUser

Write-Step "Ensuring target database '$databaseName' exists"
$dbExists = docker exec `
  --env "PGPASSWORD=$dbPassword" `
  $ContainerName `
  psql -U $dbUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$databaseName';"

if (($dbExists | Out-String).Trim() -ne "1") {
  docker exec `
    --env "PGPASSWORD=$dbPassword" `
    $ContainerName `
    psql -U $dbUser -d postgres -c "CREATE DATABASE `"$databaseName`";" | Out-Null
}

Write-Step "Resetting migrations with Prisma"
Push-Location $backendRoot
try {
  npx prisma migrate reset --force
}
finally {
  Pop-Location
}
