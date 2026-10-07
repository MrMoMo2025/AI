# Fool the AI — Render Ready

A mobile-first AI prompt challenge for an educational booth. The browser sends prompts to a Node.js/Express backend, and the backend calls the OpenAI Responses API. The API key stays server-side.

## Deploy to Render

1. Put this folder in a GitHub repository.
2. In Render, choose **New → Blueprint** and connect the repository. Render will read `render.yaml`.
3. When prompted for `OPENAI_API_KEY`, enter your API key in Render. Do not commit `.env` or the key to GitHub.
4. Deploy. Render supplies the web service `PORT`; the app binds to it.
5. Open the generated `https://...onrender.com` URL and test the game.

Render supports Node web services with a build command and start command, and Blueprints can declare secret environment variables with `sync: false`. See the Render docs for deployment and environment variables.

## Local testing

```bash
npm install
cp .env.example .env
# edit .env and add OPENAI_API_KEY
npm start
```

Open http://localhost:3000

## Environment variables

- `OPENAI_API_KEY` — required; set only in Render/local `.env`.
- `OPENAI_MODEL` — defaults to `gpt-6-luna` in Render. Change it in Render if your API project uses a different available model.
- `PORT` — supplied automatically by Render.

## Security

The browser never receives the OpenAI API key. For a public booth, add authentication/rate limiting and usage limits before a large event. Do not expose the key in `public/` files.

## QR code

After deployment, use the public Render URL as the QR-code destination.
