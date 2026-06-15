# Generate Application

This is a code bundle for Generate Application. The original project is available at https://www.figma.com/design/mC8vxvR5w0NMciyjDzqz3d/Generate-Application.

## Running the code

Run `npm i` to install the dependencies.

Copy `.env.example` to `.env` and set your Agnes + Supabase keys.

Run `npm run dev` to start the Vite UI and local AI API server together.

- Web UI: http://localhost:5173
- Local AI API: http://localhost:3001 (proxied at `/api` from Vite)
- Supabase Edge Function (auth): deploy with `npm run deploy:functions`

Apply `supabase/migrations/20260615000000_create_initial_tables.sql` and optional `supabase/seed.sql` in your Supabase project when ready.

deployment
https://fitz-bay.vercel.app
