Task: Create MITRE ATT&CK auto-tagger

Create file lib/soc/mitre.ts only
Function tagWithMITRE taking RawAlert returning tactic, technique, technique_id

Map these types:
brute_force to T1110, phishing to T1566, lateral_movement to T1021
data_exfiltration to T1041, malware to T1204, privilege_escalation to T1068, persistence to T1053

Use Gemini API for unknown types not in the map
Do not touch any other file.
Run npm run build, fix errors, commit: feat: MITRE ATT&CK tagger, push.