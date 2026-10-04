# Fantasy Clubs ⚽

Fantasy de fútbol **por clubs**: cada liga pertenece a un club y solo usa los equipos +18 de ese club
(masculino y femenino mezclados), sus jugadores, su calendario y sus resultados. El piloto es el **CE Europa**.
Web móvil-first instalable como app (PWA). El nombre es provisional (`src/lib/brand.ts` o `NEXT_PUBLIC_APP_NAME`).

## Cómo funciona

- **Clubs** (`/admin/clubes`): cada club tiene sus equipos, jugadores, jornadas y partidos. El panel de admin
  trabaja sobre el club elegido arriba.
- **Ligas** de un club: privadas con código o públicas (se elige el club). Al entrar recibes **11 jugadores al azar
  del club** (1 POR, 4 DEF, 4 MED, 2 DEL, de cualquiera de sus equipos) y **20 M€**.
- **Mercado diario de pujas** con jugadores libres **del club de la liga** (cierre a las 8:00, hora de Madrid).
- **Alineación** con 7 formaciones y capitán (x2); se bloquea al cierre de la jornada del club.
- **Partidos** de la jornada del club con marcador en directo (se refresca cada 20 s).
- **Puntos desde el acta** y valor de mercado que sube o baja (`src/lib/scoring.ts`, `/reglas`).
- **Solo mayores de edad**: los menores de 18 según su fecha de nacimiento quedan fuera automáticamente.

### Liga de prueba del CE Europa

Con los datos de ejemplo hay una liga privada **"Liga CE Europa"** con código **`EUROPA`**:
regístrate, entra con ese código y te dará un equipo con jugadores del Europa, sus partidos y su mercado.
(Los jugadores y rivales de ejemplo son ficticios.)

## Probarlo en local

```bash
npm install
npm run setup     # crea la base de datos y datos de ejemplo
npm run dev       # http://localhost:3000
```

Usuarios de ejemplo: `admin@europa.test / admin1234` (admin) y `laia@europa.test / europa1234`. Código de liga: `EUROPA`.

> ⚠️ Los jugadores de ejemplo tienen **nombres ficticios**. Carga las plantillas reales desde `/admin/jugadores`
> (importación CSV: `nombre;AAAA-MM-DD;POS;equipo;dorsal;valor;nombre_en_acta`). Las competiciones de cada equipo
> también están "por confirmar" en `/admin/equipos`.

Para recrear los datos: `npm run db:seed -- --reset`.

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

## Publicarlo (gratis)

1. Importa el repo en [Vercel](https://vercel.com). **Sin configurar nada ya funciona en modo demo**
   (base de datos temporal con datos de ejemplo que se reinicia sola; aviso amarillo arriba).
2. Para guardar datos de verdad: crea una base de datos en [Turso](https://turso.tech) y añade en Vercel
   `DATABASE_URL` (`libsql://…`) y `DATABASE_AUTH_TOKEN` (también valen `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`).
   Añade también `AUTH_SECRET` (cadena larga aleatoria), `ADMIN_EMAILS` y `CRON_SECRET`, y vuelve a desplegar.
3. Las tablas se crean solas al arrancar. Con `SEED_DEMO=1` además mete los datos de ejemplo si la BD está vacía.
4. El cron de `vercel.json` cierra el mercado cada mañana; además el mercado se resuelve solo cuando alguien entra.

El primer usuario que se registre (o los emails de `ADMIN_EMAILS`) es administrador.

Si cambias `src/db/schema.ts`, ejecuta `npm run db:bootstrap` para regenerar `src/db/bootstrap-sql.ts`.

## Desarrollo

```bash
npm test          # pruebas de puntuación, edad, mercado, horarios y lector de actas
npm run typecheck
npm run lint
```

Stack: Next.js 15 (App Router, server actions) · Tailwind CSS 4 · Drizzle ORM · SQLite/libSQL (Turso).
