# GHG Carbon Footprint Dashboard

Standalone web application for Scope 1 and Scope 2 GHG data management. Excel is used only as a reference for the initial parameter structure; the application is designed to store activity data in a database and calculate emissions dynamically.

## Current prototype
- Dashboard
- Dedicated pages for LPG 14kg, LPG 50kg, Diesel, Petrol and Electricity
- Direct monthly data entry
- Automatic emission calculation
- Monthly line charts
- Supabase-ready database schema

## Run
```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and add Supabase credentials when connecting the database.

## Important
The emission factors in the prototype are placeholders/reference values and must be replaced with the approved factors for the reporting framework and reporting year before production use. The Excel files provided were not made a runtime dependency.
