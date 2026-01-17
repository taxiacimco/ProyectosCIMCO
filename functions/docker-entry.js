import app from "./server.js";

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log("============================================");
  console.log(`🚀 TAXIA CIMCO ejecutándose en modo Docker en puerto ${PORT}`);
  console.log("============================================");
});
