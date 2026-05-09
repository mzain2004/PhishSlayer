import { Queue, Worker, QueueEvents } from "bullmq";
import IORedis from "ioredis";

let _connection: IORedis | null = null;

function getConnection(): IORedis {
  if (!_connection) {
    _connection = new IORedis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: null,
    });
  }
  return _connection;
}

export function getAlertQueue(): Queue {
  return new Queue("alert-ingestion", {
    connection: getConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { age: 86400 },
      removeOnFail: { age: 604800 },
    },
  });
}

export function getDlqQueue(): Queue {
  return new Queue("alert-dlq", { connection: getConnection() });
}

export function createAlertWorker(): Worker {
  const worker = new Worker(
    "alert-ingestion",
    async (job) => {
      const { alertData, orgId, source } = job.data;
      const apiUrl = process.env.PYTHON_API_URL ?? "http://localhost:8000";
      const response = await fetch(`${apiUrl}/agents/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alert: alertData, org_id: orgId, source }),
      });
      if (!response.ok) {
        throw new Error(`Agent service returned ${response.status}`);
      }
      return response.json();
    },
    {
      connection: getConnection(),
      concurrency: 5,
      limiter: { max: 50, duration: 60000 },
    }
  );

  worker.on("failed", async (job, err) => {
    if (job && job.attemptsMade >= 3) {
      const dlq = getDlqQueue();
      await dlq.add("failed-alert", {
        ...job.data,
        error: err.message,
        failedAt: new Date().toISOString(),
      });
    }
  });

  return worker;
}
