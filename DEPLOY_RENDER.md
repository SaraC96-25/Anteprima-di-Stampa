# Deploy su GitHub e Render

## 1. Pubblica il progetto su GitHub

Da `/Users/sara/anteprima-di-stampa`:

```bash
git add .
git commit -m "Initial Shopify embedded app"
git branch -M main
```

Poi crea un repository vuoto su GitHub, per esempio `anteprima-di-stampa`, e collega il remote:

```bash
git remote add origin git@github.com:TUO-USERNAME/anteprima-di-stampa.git
git push -u origin main
```

Se preferisci HTTPS:

```bash
git remote add origin https://github.com/TUO-USERNAME/anteprima-di-stampa.git
git push -u origin main
```

## 2. Crea il servizio su Render

1. Vai su Render
2. `New +` -> `Blueprint`
3. Seleziona il repository GitHub
4. Render leggerà `render.yaml`

## 3. Configura le env richieste su Render

Imposta questi valori:

- `SHOPIFY_APP_URL`
- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`

Gli altri sono già nel blueprint:

- `NODE_ENV=production`
- `SCOPES=read_products,write_products`
- `DATABASE_URL=file:/var/data/dev.sqlite`

## 4. Quando Render genera il dominio pubblico

Esempio:

`https://anteprima-di-stampa.onrender.com`

Aggiorna `shopify.app.toml` con:

- `application_url = "https://anteprima-di-stampa.onrender.com"`
- `redirect_urls` coerenti con quel dominio

## 5. Pubblica la config Shopify

```bash
npm run deploy
```

## 6. Reinstalla l'app sullo shop ufficiale

Apri l'app dal link di installazione aggiornato dopo il deploy.
