# Pura AI dev — Windows Firewall opener for the AI proxy port.
#
# v10.38 — when the Metro middleware route fails (because Metro
# wasn't fully restarted after pulling), the client falls back to
# probing the proxy directly on port 8787. That fails on most
# Windows boxes because the default firewall blocks inbound TCP on
# unprivileged ports for new node.exe binaries.
#
# This script creates a one-time inbound rule for port 8787 so the
# direct-port probe can succeed. Requires admin (UAC will prompt).
#
# Usage (in any terminal, from the project root):
#   npm run firewall:allow
#
# To remove the rule later:
#   Remove-NetFirewallRule -DisplayName "Pura AI Proxy"

$ErrorActionPreference = 'Stop'
$ruleName = 'Pura AI Proxy'

Write-Host "[pura-ai] Checking for existing firewall rule..."
$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "[pura-ai] Rule '$ruleName' already exists. Removing first to refresh."
    Remove-NetFirewallRule -DisplayName $ruleName
}

Write-Host "[pura-ai] Creating inbound TCP rule for port 8787..."
New-NetFirewallRule `
    -DisplayName $ruleName `
    -Direction Inbound `
    -LocalPort 8787 `
    -Protocol TCP `
    -Action Allow `
    -Profile Any `
    -Description "Allows the Pura AI dev proxy to be reached from a phone on the same Wi-Fi." | Out-Null

Write-Host "[pura-ai] Done. Phones on the same Wi-Fi can now reach the proxy at port 8787."
Write-Host "[pura-ai] Reload your phone — the AI badge should swap to 'AI' green."
