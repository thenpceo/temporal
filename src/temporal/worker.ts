import { NativeConnection, Worker } from "@temporalio/worker";
import * as activities from "./activities";
import { env } from "../lib/env";

async function run() {
  const connection = await NativeConnection.connect({
    address: env.temporalAddress,
  });

  const worker = await Worker.create({
    connection,
    namespace: env.temporalNamespace,
    taskQueue: env.temporalTaskQueue,
    workflowsPath: require.resolve("./workflows"),
    activities,
  });

  console.log(
    `[worker] connected to ${env.temporalAddress} namespace=${env.temporalNamespace} taskQueue=${env.temporalTaskQueue}`,
  );

  await worker.run();
}

run().catch((err) => {
  console.error("[worker] fatal:", err);
  process.exit(1);
});
