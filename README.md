# Fantasy Europa ⚽

Fantasy de **todos los equipos +18 del CE Europa**, masculino y femenino en un mismo equipo.
Web móvil-first instalable como app (PWA).

## Qué incluye

- **Cuentas** con email y contraseña (hay que confirmar ser mayor de edad).
- **Ligas públicas** (te mete en una con hueco o crea una nueva) y **privadas** con código para compartir.
- **Equipo inicial aleatorio** (11 jugadores: 1 POR, 4 DEF, 4 MED, 2 DEL) y **20 M€** de caja.
- **Mercado diario de pujas**: cada día a las 8:00 (hora de Madrid) se resuelven las pujas secretas y salen jugadores nuevos.
  También puedes vender al instante o subastar a tus rivales. Cada jugador solo puede estar en un equipo por liga.
- **Alineación** sobre el campo con 7 formaciones y capitán (puntos x2). Se bloquea al cierre de la jornada.
- **Puntos desde el acta**: minutos, goles por posición, portería a cero, goles encajados, resultado, tarjetas, penaltis, propia puerta.
  El valor de mercado sube o baja según los puntos. Reglas en `/reglas` y en `src/lib/scoring.ts`.
- **Partidos de la jornada con marcador en directo** (se refresca solo cada 20 s).
- **Panel de administración** (`/admin`): equipos, jugadores (alta manual o CSV), jornadas, partidos,
  marcador en directo y acta.
- **Solo mayores de edad**: cualquier jugador menor de 18 años según su fecha de nacimiento queda excluido del juego automáticamente.

## Publicarlo (gratis, sin tocar código)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Gonzalo2377/fantasy&project-name=fantasy-europa)

1. Pulsa el botón de arriba (o en Vercel: *Add New → Project → fantasy*) y luego **Deploy**.
2. En el proyecto de Vercel: **Storage → Create / Connect Database → Turso** (gratis) y conéctala al proyecto.
   Esto crea solo las variables `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN`.
3. **Deployments → ⋯ → Redeploy** para que use la base de datos.
4. Abre la web y **regístrate: el primer usuario es el administrador**.

Al arrancar, la app crea sola las tablas, los 4 equipos +18, una plantilla de ejemplo, 12 jornadas y una liga pública.
Sin el paso 2 la web funciona, pero los datos se borran cada poco (base de datos temporal).

Variables opcionales: `AUTH_SECRET`, `ADMIN_EMAILS` (emails admin separados por comas), `CRON_SECRET`,
`AUTO_IMPORT_ACTAS=1`, `SEED_DEMO=0` (no crear datos de ejemplo).

## Probarlo en local

```bash
npm install
npm run setup     # datos de demostración con usuarios de prueba e historial
npm run dev       # http://localhost:3000
```

Usuarios de ejemplo: `admin@europa.test / admin1234` (admin) y `laia@europa.test / europa1234`.

> ⚠️ Los jugadores de ejemplo tienen **nombres ficticios**. Carga las plantillas reales desde `/admin/jugadores`
> (importación CSV: `nombre;AAAA-MM-DD;POS;equipo;dorsal;valor;nombre_en_acta`). Las competiciones de cada equipo
> también están "por confirmar" en `/admin/equipos`.

Para recrear los datos: `npm run db:seed -- --reset`. Si cambias `src/db/schema.ts`: `npm run db:generate`.

## Actas de la federación

Ahora mismo el admin mete el acta en `/admin/partido/[id]`. Hay tres formas:

1. A mano en la tabla (minutos, goles, tarjetas…).
2. **Pegar el texto del acta** → el lector lo interpreta y rellena la tabla para revisar.
3. **URL del acta** → la descarga y la interpreta.

El lector (`src/lib/federation/acta.ts`) reconoce secciones tipo *Titulars / Suplents / Gols / Targetes / Substitucions*
y empareja nombres en formato `APELLIDOS, NOMBRE` con la plantilla (campo "nombre en el acta").
**No se ha podido probar contra las webs reales de la FCF/RFEF** (no eran accesibles desde el entorno de desarrollo),
así que seguramente haya que ajustarlo con un acta real. Cuando funcione, `AUTO_IMPORT_ACTAS=1` hace que el cron
las aplique solo (únicamente si la lectura parece completa; si no, quedan para revisión manual).

## Instalar en el móvil

- **Android / Chrome**: botón "Instalar" en la portada o menú ⋮ → *Instalar aplicación*.
- **iPhone / Safari**: Compartir → *Añadir a pantalla de inicio*.

## Desarrollo

```bash
npm test          # pruebas de puntuación, edad, mercado, horarios y lector de actas
npm run typecheck
npm run lint
```

Stack: Next.js 15 (App Router, server actions) · Tailwind CSS 4 · Drizzle ORM · SQLite/libSQL (Turso).
