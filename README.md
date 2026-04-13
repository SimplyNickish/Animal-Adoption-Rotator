<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 🐾 Adoptable Animal Rotator

A premium broadcast overlay for OBS Studio and Meld Studio that automatically cycles through real adoptable dogs and cats during your livestream — complete with interactive Twitch chat commands, real-time remote control, and a scannable QR code for each animal.

## Features

- **Live Animal Feed** — Pulls real adoptable animals from RescueGroups (US), PetRescue (AU), and DogsBlog (UK)
- **OBS/Meld Browser Source** — Fully transparent overlay with premium glassmorphism design
- **Twitch Chat Commands** — Viewers can type `!dog`, `!cat`, or `!adopt` to interact
- **Realtime Remote Control** — Change settings from the dashboard and they sync instantly to OBS
- **QR Code Adoption Links** — Each animal card has a scannable QR code linking to their adoption page
- **Location Filtering** — Filter by ZIP code, city, or state
- **Licensing System** — Supports Fourthwall membership keys and one-time Etsy voucher codes

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and fill in your credentials
3. Run the dev server: `npm run dev`
4. Open `http://localhost:3000/dashboard` to access the control panel

## Deployment

This app is designed to deploy on **Vercel** with a **Supabase** backend. See `.env.example` for the full list of required environment variables.
