import "reflect-metadata";
import { appPorts } from "@agent-control-plane/config";
import { createApp } from "./create-app";

async function bootstrap() {
  const app = await createApp();
  await app.listen(appPorts.api);
  console.log(`API listening on http://localhost:${appPorts.api}`);
}

bootstrap().catch((error) => {
  console.error("Failed to start API", error);
  process.exit(1);
});

