const app = require("./src/app");
const { connectDb } = require("./src/db");

const PORT = process.env.PORT || 3001;

connectDb().then(() => {
  app.listen(PORT, () => {
    console.log(`API running on port ${PORT}`);
  });
});
