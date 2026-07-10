import { app } from "./app";
import { env } from "./lib/env";

app.listen(env.port, () => {
  console.log(`El Amanecer API listening on port ${env.port}`);
});
