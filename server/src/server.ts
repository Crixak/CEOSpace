import { app } from "./app";
import { env } from "./lib/env";

app.listen(env.port, () => {
  console.log(`Palacio del Jamón API listening on port ${env.port}`);
});
