StreetScore is a neighborhood reputation platform that helps users discover trusted local service providers based on real performance signals rather than advertising spend or review count alone.

The platform ranks operators within specific neighborhoods and ZIP codes using a reputation scoring system that combines multiple trust indicators into a single REP Score. Instead of simply listing businesses, StreetScore highlights which operators are consistently performing well in their local markets.

## Project Overview

This repository contains the prototype standings application built with Next.js, TypeScript, and PostgreSQL. The application demonstrates how operators can be ranked and filtered by league, neighborhood, and reputation metrics using real database queries.

The goal of this project is to validate the core concept of neighborhood-based reputation rankings while providing a scalable foundation for future platform development.

---

## Problem

Finding trustworthy local service providers is difficult.

Consumers often have to compare information across multiple platforms such as:

- Google Reviews
- Yelp
- Facebook
- Personal referrals
- Reviews are unreliable
- Paid visibility

These sources provide useful information but rarely present a complete picture of a company's actual performance.

StreetScore combines multiple trust signals into one easy-to-understand reputation score so users can make better decisions.

---

## Reputation Signals

The platform is designed to incorporate factors such as:

- Average Rating
- Review Count
- Work Volume
- Response Time
- On-Time Percentage
- Verification Status
- Ranking Movement
- Overall REP Score

Rather than rewarding advertising spend or popularity alone, TrustBlock rewards consistent performance.

---

## Features

Current prototype includes:

- Neighborhood standings
- Operator rankings
- Reputation scores
- Leauge-based rankings
- PostgreSQL-backed API routes
- Responsive dashboard built with Next.js
- Dynamic data retrieval from Neon PostgreSQL

Future features include:

- Customer reviews
- Verified badges
- Neighborhood leaderboards
- Performance analytics
- Operator improvement recommendations

---

## Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend

- Next.js API Routes
- PostgreSQL
- Neon Cloud Database

### Deployment

- Vercel

### Development Tools

- Git
- GitHub
- Drizzle ORM (database management)
- VS Code

---

## Project Structure

```
app/
components/
hooks/
lib/
public/
types/
```

The application follows the Next.js App Router architecture with reusable React components, API routes, and shared database utilities.

---

## Database

The application uses a hosted PostgreSQL database through Neon.

Current data includes:

- Operators - operator_id, operator_name, league_id, operator_type, is_verified, is_current_user
- Leagues - league_id, league_name, volume_label
- Neighborhoods - neighborhood_id, league_id, zip_code, neighborhood_name
- Standing Entries -entry_id, season_id, time_window, league_id, neighborhood_id, zip_code, operator_id, rank, rep_score, rank_delta_30d, distance_miles

The standings displayed on the dashboard are generated from PostgreSQL queries rather than static data.

---

## Current Functionality

Users can:

- View operator standings
- Filter standings by league
- Compare reputation scores
- View ranking positions
- Browse neighborhood performance

The frontend retrieves live data through server-side API routes connected to the Neon PostgreSQL database.

---

## Future Development

Planned improvements include:

- Reputation score calculations
- Historical ranking trends
- Interactive maps
- Search functionality
- Analytics dashboard

---

## Running the Project

Clone the repository:

```bash
git clone <https://github.com/omargarcia10-k/autoledger_project.git>
```

Install dependencies:

```bash
npm install
```

Configure environment variables:

```
DATABASE_URL=your_neon_database_url
```

Start the development server:

```bash
npm run dev
```

Visit:

```
<http://localhost:3000>
```

---

## Vision

StreetScore is built on the idea that trust should be earned through consistent performance—not purchased through advertising.

By combining meaningful reputation signals into neighborhood-based rankings, StreetScore aims to make it easier for customers to find reliable operators while giving businesses a fair and transparent way to be recognized for quality work.

---

## Authors

Developed as part of the CHAMA neighborhood reputation platform project.

Project Manager/Marketing – Khadejah Beckles
Data/Frontend/Research – Omar Garcia and Christopher Rampersaud