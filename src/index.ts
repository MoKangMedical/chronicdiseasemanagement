import { createApp } from "./app.js";
import { ChronicCarePlatform } from "./services/chronic-care-platform.js";

const port = Number(process.env.PORT ?? 3010);
const platform = new ChronicCarePlatform();
const app = createApp(platform);

app.listen(port, () => {
  console.log(`ChroniCare OS demo listening on http://localhost:${port}`);
});
