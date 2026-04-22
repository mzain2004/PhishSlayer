Read ONLY next.config.ts or next.config.js
Find the Content Security Policy headers configuration
Add these domains to the script-src directive:
https://accounts.google.com
https://welcome-antelope-98.clerk.accounts.dev
Also add to connect-src:
https://accounts.google.com
https://welcome-antelope-98.clerk.accounts.dev
Save, run npm run build, commit "fix: add Clerk and Google to CSP headers", push
Do not touch any other file