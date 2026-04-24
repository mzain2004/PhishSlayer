export async function createJiraIssue(
  case_id: string, 
  title: string, 
  severity: string, 
  description: string
): Promise<string | null> {
  const url = process.env.JIRA_URL;
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  const projectKey = process.env.JIRA_PROJECT_KEY;

  if (!url || !email || !token || !projectKey) return null;

  const auth = Buffer.from(`${email}:${token}`).toString("base64");
  const priorityMap: Record<string, string> = {
    p1: "Highest", p2: "High", p3: "Medium", p4: "Low"
  };

  try {
    const res = await fetch(`${url}/rest/api/3/issue`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fields: {
          project: { key: projectKey },
          summary: title,
          description: {
            type: "doc",
            version: 1,
            content: [{
              type: "paragraph",
              content: [{ type: "text", text: `${description}\n\nCase ID: ${case_id}` }]
            }]
          },
          issuetype: { name: "Bug" },
          priority: { name: priorityMap[severity] || "Medium" },
          labels: ["PhishSlayer", "Security"]
        }
      })
    });

    if (!res.ok) throw new Error("Jira issue creation failed");
    const data = await res.json();
    return data.key || null;
  } catch (error) {
    console.error("[jira] Error:", error);
    return null;
  }
}

export async function closeJiraIssue(issue_key: string, resolution: string = "Fixed"): Promise<void> {
  const url = process.env.JIRA_URL;
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;

  if (!url || !email || !token) return;
  const auth = Buffer.from(`${email}:${token}`).toString("base64");

  try {
    // 1. Get transitions to find "Done"
    const transRes = await fetch(`${url}/rest/api/3/issue/${issue_key}/transitions`, {
        headers: { "Authorization": `Basic ${auth}` }
    });
    const transData = await transRes.json();
    const doneTransition = transData.transitions?.find((t: any) => t.name === "Done" || t.name === "Resolved");

    if (doneTransition) {
        await fetch(`${url}/rest/api/3/issue/${issue_key}/transitions`, {
            method: "POST",
            headers: {
                "Authorization": `Basic ${auth}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                transition: { id: doneTransition.id },
                fields: { resolution: { name: resolution } }
            })
        });
    }
  } catch (error) {
    console.error("[jira] Close error:", error);
  }
}
