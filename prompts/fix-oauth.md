Task: Create playbook engine with phishing playbook

Create these 3 files only:
lib/soc/playbooks/types.ts with Playbook, PlaybookStep, PlaybookResult types
lib/soc/playbooks/engine.ts with PlaybookEngine class
lib/soc/playbooks/phishing.ts with full phishing response playbook

Phishing steps: extractIOCs then enrichIOCs then blockSender then notifyUsers then createReport
Each step logs to case timeline via Supabase using createClient from @/lib/supabase/server
Do not touch any other file.
Run npm run build, fix errors, commit: feat: playbook engine, push.