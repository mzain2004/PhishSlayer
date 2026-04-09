import { Client } from "ssh2";

type SshConnectionConfig = {
  host: string;
  username: string;
  privateKey: string;
  port?: number;
};

export async function connectSsh(config: SshConnectionConfig): Promise<Client> {
  return new Promise((resolve, reject) => {
    const client = new Client();

    client
      .on("ready", () => resolve(client))
      .on("error", (error) => reject(error))
      .connect({
        host: config.host,
        port: config.port ?? 22,
        username: config.username,
        privateKey: config.privateKey,
        readyTimeout: 10000,
      });
  });
}

export async function runSshCommand(client: Client, command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    client.exec(command, (error, stream) => {
      if (error) {
        reject(error);
        return;
      }

      let stdout = "";
      let stderr = "";

      stream.on("data", (chunk: Buffer) => {
        stdout += chunk.toString();
      });

      stream.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      stream.on("close", (code: number | undefined) => {
        if (code === 0 || code === undefined) {
          resolve(stdout.trim());
          return;
        }

        reject(new Error(stderr.trim() || `Command failed with exit code ${code}`));
      });
    });
  });
}

export function decodeBase64PrivateKey(base64Key: string): string {
  return Buffer.from(base64Key, "base64").toString("utf8");
}

export function closeSsh(client: Client | null): void {
  if (client) {
    client.end();
  }
}
