export async function createServiceNowIncident(
  case_id: string, 
  title: string, 
  severity: string, 
  description: string
): Promise<string | null> {
  const url = process.env.SERVICENOW_URL;
  const user = process.env.SERVICENOW_USER;
  const pass = process.env.SERVICENOW_PASSWORD;

  if (!url || !user || !pass) return null;

  const auth = Buffer.from(`${user}:${pass}`).toString("base64");
  const urgency = severity === "p1" ? "1" : (severity === "p2" ? "2" : (severity === "p3" ? "3" : "4"));

  try {
    const res = await fetch(`${url}/api/now/table/incident`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        short_description: title,
        description: `${description}\n\nCase ID: ${case_id}`,
        urgency,
        impact: urgency,
        category: "Security",
        subcategory: "Other Security"
      })
    });

    if (!res.ok) throw new Error("ServiceNow incident creation failed");
    const data = await res.json();
    return data.result?.number || null;
  } catch (error) {
    console.error("[servicenow] Error:", error);
    return null;
  }
}

export async function updateServiceNowIncident(
  incident_number: string, 
  state: string, 
  close_notes: string | null = null
): Promise<void> {
  const url = process.env.SERVICENOW_URL;
  const user = process.env.SERVICENOW_USER;
  const pass = process.env.SERVICENOW_PASSWORD;

  if (!url || !user || !pass) return;

  const auth = Buffer.from(`${user}:${pass}`).toString("base64");
  const stateMap: Record<string, string> = {
    "investigating": "2",
    "resolved": "6",
    "closed": "7"
  };

  try {
    const res = await fetch(`${url}/api/now/table/incident?sysparm_query=number=${incident_number}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
            state: stateMap[state] || "2",
            close_notes: close_notes || "",
            close_code: close_notes ? "Solved Permanently" : ""
        })
    });
    if (!res.ok) console.warn("[servicenow] Update failed");
  } catch (error) {
    console.error("[servicenow] Update error:", error);
  }
}
