# Required GitHub Secrets

## Azure VM Secrets

| Secret                | Description                  | How to get                       |
| --------------------- | ---------------------------- | -------------------------------- |
| AZURE_SSH_PRIVATE_KEY | Private key for Azure VM SSH | Contents of your Azure .pem file |
| AZURE_VM_IP           | Public IP of Azure VM        | Azure Portal → VM → Overview     |

## DigitalOcean Secrets

| Secret                 | Description                | How to get                                                                                       |
| ---------------------- | -------------------------- | ------------------------------------------------------------------------------------------------ |
| DO_SSH_PRIVATE_KEY_RAW | Raw private key for DO SSH | Contents of C:\Users\zainr\.ssh\id_ed25519                                                       |
| DO_SSH_PRIVATE_KEY     | Base64 encoded version     | PowerShell: [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\zainr\.ssh\id_ed25519")) |

## Application Secrets

| Secret                         | Description                     |
| ------------------------------ | ------------------------------- |
| NEXT_PUBLIC_SUPABASE_URL       | Supabase project URL            |
| NEXT_PUBLIC_SUPABASE_ANON_KEY  | Supabase anon key               |
| SUPABASE_SERVICE_ROLE_KEY      | Supabase service role key       |
| GEMINI_API_KEY                 | Google Gemini API key           |
| CRON_SECRET                    | Secret for cron endpoints       |
| AGENT_SECRET                   | Internal agent auth secret      |
| WAZUH_WEBHOOK_SECRET           | Bearer token for Wazuh webhook  |
| WAZUH_MANAGER_IP               | 167.172.85.62                   |
| WAZUH_API_TOKEN                | JWT from Wazuh API authenticate |
| CLOUDFLARE_API_TOKEN           | Cloudflare API token            |
| CLOUDFLARE_ZONE_ID             | Cloudflare zone ID              |
| DISCORD_ESCALATION_WEBHOOK_URL | Discord webhook URL             |
| NEXT_PUBLIC_APP_URL            | https://phishslayer.tech        |
