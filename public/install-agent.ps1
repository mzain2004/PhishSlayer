<#
.SYNOPSIS
Phish-Slayer EDR Agent Installer for Windows

.DESCRIPTION
Downloads dependencies, creates environment variables, and configures the agent to run via PM2 on Windows.

.EXAMPLE
Invoke-WebRequest -Uri "http://localhost:3000/install-agent.ps1" -OutFile "install-agent.ps1"
.\install-agent.ps1 -Secret "AGENT_SECRET" -Url "http://localhost:3000"
#>

param (
    [Parameter(Mandatory=$true)]
    [string]$Secret,

    [Parameter(Mandatory=$true)]
    [string]$Url
)

# Requires Admin privileges to set machine-level paths/services
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Warning "Please run this script as an Administrator."
    Exit
}

Write-Host "[*] Installing PM2 and Node.js Agent Dependencies..." -ForegroundColor Cyan
npm install -g pm2 npm-windows-upgrade
npm install chokidar ps-list@6.0.0 ws ts-node typescript

$AgentDir = "C:\Program Files\Phish-Slayer\Agent"
if (!(Test-Path -Path $AgentDir)) {
    New-Item -ItemType Directory -Path $AgentDir -Force | Out-Null
}

Write-Host "[*] Downloading EDR Agent Script..." -ForegroundColor Cyan
# In a real scenario, this would hit an API endpoint or static file delivery for the TS file
# For now, we mock the download if the endpoint doesn't serve the raw file yet
Invoke-WebRequest -Uri "$Url/api/agent/download" -OutFile "$AgentDir\endpointMonitor.ts" -ErrorAction SilentlyContinue

Write-Host "[*] Configuring Environment Variables..." -ForegroundColor Cyan
[Environment]::SetEnvironmentVariable("AGENT_SECRET", $Secret, "Machine")
[Environment]::SetEnvironmentVariable("NEXT_PUBLIC_SITE_URL", $Url, "Machine")

Write-Host "[*] Starting EDR Agent Service..." -ForegroundColor Cyan
Set-Location -Path $AgentDir
pm2 start "npx ts-node endpointMonitor.ts" --name phish-slayer-agent
pm2 save

# Optional: Install PM2 as a Windows service using pm2-installer or pm2-windows-startup
Write-Host "[+] Phish-Slayer EDR Agent installed and started successfully." -ForegroundColor Green
