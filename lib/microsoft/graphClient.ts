import { ClientSecretCredential } from "@azure/identity";
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";

const credential = new ClientSecretCredential(
  process.env.AZURE_TENANT_ID!,
  process.env.AZURE_CLIENT_ID!,
  process.env.AZURE_CLIENT_SECRET!,
);

const authProvider = new TokenCredentialAuthenticationProvider(credential, {
  scopes: ["https://graph.microsoft.com/.default"],
});

export const graphClient = Client.initWithMiddleware({
  authProvider,
});
