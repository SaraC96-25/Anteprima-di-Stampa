# Deploy su Render Free + Supabase Free

Questa app era configurata su Railway:

```text
https://anteprima-di-stampa-production.up.railway.app
```

La configurazione Shopify ora deve puntare al dominio Render:

```text
https://anteprima-di-stampa.onrender.com
```

## 1. Crea il database su Supabase

1. Crea un progetto su Supabase.
2. Vai in **Project Settings > Database**.
3. Copia due connection string:
   - **Transaction pooler** per `DATABASE_URL`
   - **Direct connection** per `DIRECT_URL`
4. Sostituisci `[PASSWORD]` con la password database del progetto.

Esempio:

```env
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

## 2. Crea il servizio su Render

1. Vai su Render
2. `New +` -> `Blueprint`
3. Seleziona il repository GitHub `SaraC96-25/Anteprima-di-Stampa`
4. Render leggerà `render.yaml` e creerà il web service free.

## 3. Configura le env richieste su Render

Imposta questi valori:

- `SHOPIFY_APP_URL=https://anteprima-di-stampa.onrender.com`
- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `DATABASE_URL`
- `DIRECT_URL`

Gli altri sono già nel blueprint:

- `NODE_ENV=production`
- `SCOPES=read_products,write_products`

## 4. Verifica gli URL Shopify

In `shopify.app.toml` devono esserci:

- `application_url = "https://anteprima-di-stampa.onrender.com"`
- `https://anteprima-di-stampa.onrender.com/auth/callback`
- `https://anteprima-di-stampa.onrender.com/auth/shopify/callback`
- `https://anteprima-di-stampa.onrender.com/api/auth`

## 5. Pubblica la config Shopify

```bash
npm run deploy
```

## 6. Reinstalla l'app sullo shop ufficiale

Apri l'app dal link di installazione aggiornato dopo il deploy.

## Note sul piano free

Render Free va in sleep dopo un periodo di inattivita. Quando riapri l'app da Shopify Admin, il primo caricamento puo richiedere circa un minuto.

Le sessioni OAuth Shopify sono salvate su Supabase Postgres, quindi Render non ha bisogno di un persistent disk.
