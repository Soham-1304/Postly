import { app } from "./app";
import { env } from "./config/env";

app.listen(env.PORT, () => {
  console.log(`Postly API listening on port ${env.PORT}`);
});
