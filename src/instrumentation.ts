export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureDb } = await import("./db/bootstrap");
    await ensureDb();
  }
}
