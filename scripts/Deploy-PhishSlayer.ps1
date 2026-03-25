<#
.SYNOPSIS
    Enterprise MDM Deployment Script for Phish-Slayer Endpoint Sensor.
.DESCRIPTION
    Silently downloads, configures, and installs the Phish-Slayer
    Windows Background Service via Microsoft Intune or Active Directory GPO.
    It automatically starts on boot ensuring continuous fleet telemetry.
.PARAMETER CompanyApiKey
    The 32-character enterprise API key issued from the Command Center.
#>
[CmdletBinding()]
param (
    [Parameter(Mandatory=$true, HelpMessage="Enter your Phish-Slayer Enterprise API Key.")]
    [string]$CompanyApiKey
)

# Configuration Variables
$InstallDir = "C:\Program Files\Phish-Slayer"
$ExePath = "$InstallDir\PhishSlayerSensor.exe"
$ConfigPath = "$InstallDir\config.json"
$ServiceName = "PhishSlayerSensor"
$DownloadUrl = "https://phishslayer.tech/downloads/PhishSlayerSensor.exe"

# 1. Create directory
if (-not (Test-Path -Path $InstallDir)) {
    Write-Host "Creating installation directory at $InstallDir..."
    New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
}

# 2. Write Configuration
Write-Host "Writing configuration file..."
$ConfigJson = @"
{
    "companyApiKey": "$CompanyApiKey",
    "serverEndpoint": "wss://phishslayer.tech/api/fleet/ws",
    "autoUpdate": true,
    "logLevel": "info"
}
"@
Set-Content -Path $ConfigPath -Value $ConfigJson -Encoding UTF8

# 3. Download the standalone executable
Write-Host "Downloading PhishSlayerSensor.exe from Command Center..."
try {
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $ExePath -UseBasicParsing
} catch {
    Write-Error "Failed to download sensor binary. Please check network connectivity or URL."
    # We continue anyway if testing locally, since the file might be injected via MDM directly.
}

# 4. Install & Register Windows Service
Write-Host "Registering persistent Windows Background Service..."
# Stop and delete if exists
if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
    Stop-Service -Name $ServiceName -Force
    sc.exe delete $ServiceName
    Start-Sleep -Seconds 2
}

# Create new service set to autostart
$result = sc.exe create $ServiceName binPath= "$ExePath" start= auto obj= "LocalSystem" DisplayName= "Phish-Slayer EDR Sensor"
if ($LASTEXITCODE -ne 0) {
    Write-Warning "Failed to create service via sc.exe, proceeding to fallback."
}

sc.exe description $ServiceName "Autonomous Blue Team endpoint monitoring sensor. Do not disable."

# 5. Start the service
Write-Host "Starting $ServiceName service..."
Start-Service -Name $ServiceName -ErrorAction SilentlyContinue

# Verify Status
$Status = (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue).Status
if ($Status -eq 'Running') {
    Write-Host "SUCCESS: Phish-Slayer Sensor deployed and running." -ForegroundColor Green
} else {
    Write-Error "DEPLOYMENT FAILED: Service did not start correctly."
}
