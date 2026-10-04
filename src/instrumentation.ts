/** Next.js lo ejecuta una vez al arrancar cada servidor, antes de atender peticiones. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureDb } = await import("@/db/bootstrap");
    try {
      await ensureDb();
    } catch (e) {
      console.error("[fantasy] No se pudo preparar la base de datos:", e);
    }
  }
}
