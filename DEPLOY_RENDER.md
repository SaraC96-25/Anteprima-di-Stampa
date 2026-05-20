# Deploy su Render

Questa app era configurata su Railway:

```text
https://anteprima-di-stampa-production.up.railway.app
```

La configurazione Shopify ora deve puntare al dominio Render:

```text
https://anteprima-di-stampa.onrender.com
```

## 1. Crea il servizio su Render

1. Vai su Render
2. `New +` -> `Blueprint`
3. Seleziona il repository GitHub `SaraC96-25/Anteprima-di-Stampa`
4. Render leggerà `render.yaml`

## 2. Configura le env richieste su Render

Imposta questi valori:

- `SHOPIFY_APP_URL=https://anteprima-di-stampa.onrender.com`
- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`

Gli altri sono già nel blueprint:

- `NODE_ENV=production`
- `SCOPES=read_products,write_products`
- `DATABASE_URL=file:/var/data/dev.sqlite`

## 3. Verifica gli URL Shopify

In `shopify.app.toml` devono esserci:

- `application_url = "https://anteprima-di-stampa.onrender.com"`
- `https://anteprima-di-stampa.onrender.com/auth/callback`
- `https://anteprima-di-stampa.onrender.com/auth/shopify/callback`
- `https://anteprima-di-stampa.onrender.com/api/auth`

## 4. Pubblica la config Shopify

```bash
npm run deploy
```

## 5. Reinstalla l'app sullo shop ufficiale

Apri l'app dal link di installazione aggiornato dopo il deploy.

## Nota sul piano Render

Questa app usa SQLite per salvare le sessioni OAuth Shopify. Su Render, SQLite deve stare su un persistent disk, quindi il blueprint usa `plan: starter`.

Per usare Render Free senza disco persistente bisogna prima spostare le sessioni su Postgres, ad esempio Supabase o Render Postgres. Render Postgres Free pero scade dopo 30 giorni.
