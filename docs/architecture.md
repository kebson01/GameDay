# GameDay App - Architecture Documentation

## Project Overview

GameDay is a Progressive Web App (PWA) for college football fans to track games, tailgate, and connect with friends.

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GAMEDAY PWA                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         PRESENTATION LAYER                           │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │    │
│  │  │  Home   │ │ GameDay │ │Schedule │ │ MyTeams │ │ Friends │       │    │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘       │    │
│  │       │           │           │           │           │             │    │
│  │  ┌────┴───────────┴───────────┴───────────┴───────────┴────┐       │    │
│  │  │                    Shared Components                      │       │    │
│  │  │  GameCard │ TeamDetailView │ SafetyButton │ Maps │ AI    │       │    │
│  │  └─────────────────────────────────────────────────────────┘       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│  ┌───────────────────────────────────┼─────────────────────────────────┐    │
│  │                         STATE MANAGEMENT                             │    │
│  │                                   │                                  │    │
│  │  ┌──────────────┐  ┌──────────────┴──────────────┐  ┌────────────┐  │    │
│  │  │ React Query  │  │      React useState/        │  │  Context   │  │    │
│  │  │  (API Data)  │  │      useEffect (Local)      │  │  (Auth)    │  │    │
│  │  └──────────────┘  └─────────────────────────────┘  └────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│  ┌───────────────────────────────────┼─────────────────────────────────┐    │
│  │                         DATA LAYER                                   │    │
│  │                                   │                                  │    │
│  │  ┌──────────────┐  ┌──────────────┴──────────────┐  ┌────────────┐  │    │
│  │  │  sportsApi   │  │       localStorage          │  │   config   │  │    │
│  │  │  (ESPN API)  │  │    dataService / auth       │  │   (.env)   │  │    │
│  │  └──────┬───────┘  └─────────────────────────────┘  └────────────┘  │    │
│  └─────────┼───────────────────────────────────────────────────────────┘    │
│            │                                                                 │
└────────────┼─────────────────────────────────────────────────────────────────┘
             │
┌────────────┼─────────────────────────────────────────────────────────────────┐
│            ▼                    EXTERNAL SERVICES                            │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐           │
│  │    ESPN API      │  │  Google Maps API │  │   Browser APIs   │           │
│  │   (Public)       │  │   (API Key)      │  │  (Geolocation)   │           │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘           │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Directory Structure

```
src/
├── api/
│   └── client.js              # API client facade
│
├── components/
│   ├── ai/
│   │   └── GameDayAssistant   # AI chatbot
│   │
│   ├── auth/
│   │   ├── AuthModal          # Login/signup modal
│   │   └── LoginPrompt        # Login prompt component
│   │
│   ├── common/
│   │   ├── FriendCard         # Friend display card
│   │   ├── GameCard           # Game score card
│   │   ├── LoadingSkeleton    # Loading placeholders
│   │   ├── OfflineIndicator   # Offline status
│   │   ├── QuickAction        # Action buttons
│   │   ├── SafetyButton       # Emergency SOS
│   │   ├── TailgateCard       # Tailgate display
│   │   └── WeatherWidget      # Weather display
│   │
│   ├── gameday/
│   │   ├── GameAlerts         # Live game notifications
│   │   ├── LiveGameStats      # Real-time stats
│   │   └── PlayByPlay         # Play-by-play feed
│   │
│   ├── map/
│   │   ├── GoogleMapView      # Google Maps integration
│   │   └── MapView            # Leaflet fallback
│   │
│   ├── teams/
│   │   ├── TeamDetailView     # Team info modal
│   │   ├── TeamFeed           # Team social feed
│   │   └── PredictionWidget   # Game predictions
│   │
│   └── ui/                    # Shadcn UI components
│       ├── button, badge, card, dialog, etc.
│
├── hooks/
│   ├── use-mobile             # Mobile detection
│   ├── useNetworkStatus       # Online/offline
│   └── useOfflineQuery        # Offline data caching
│
├── lib/
│   ├── auth.js                # Authentication service
│   ├── config.js              # Environment config
│   ├── dataService.js         # Data CRUD operations
│   ├── localStorage.js        # Storage utilities
│   ├── offlineStorage.js      # Offline data sync
│   ├── sportsApi.js           # ESPN API client
│   ├── syncService.js         # Data synchronization
│   └── utils.js               # Utility functions
│
├── pages/
│   ├── Home.jsx               # Main dashboard
│   ├── GameDay.jsx            # Live scores
│   ├── Schedule.jsx           # Game schedule
│   ├── MyTeams.jsx            # Followed teams
│   ├── FindFriends.jsx        # Friend location
│   ├── CampusMap.jsx          # Campus navigation
│   ├── Settings.jsx           # User settings
│   └── Layout.jsx             # App shell/nav
│
└── utils/
    └── index.ts               # URL utilities
```

---

## 🔄 Component Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                            App.jsx                                  │
│                    (Router + Query Provider)                        │
└────────────────────────────────┬───────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────┐
│                           Layout.jsx                                │
│              (Navigation + Page Container + Toaster)                │
└────────────────────────────────┬───────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
┌───────────────┐      ┌─────────────────┐      ┌────────────────┐
│   Home.jsx    │      │   GameDay.jsx   │      │  MyTeams.jsx   │
│               │      │                 │      │                │
│ ┌───────────┐ │      │ ┌─────────────┐ │      │ ┌────────────┐ │
│ │ GameCard  │ │      │ │  GameCard   │ │      │ │TeamDetail  │ │
│ └───────────┘ │      │ └─────────────┘ │      │ │   View     │ │
│ ┌───────────┐ │      │ ┌─────────────┐ │      │ └────────────┘ │
│ │ QuickAction│ │      │ │ Filter Btns │ │      │ ┌────────────┐ │
│ └───────────┘ │      │ └─────────────┘ │      │ │  NewsFeed  │ │
│ ┌───────────┐ │      │ ┌─────────────┐ │      │ └────────────┘ │
│ │TailgateCard│ │      │ │TeamDetail   │ │      │                │
│ └───────────┘ │      │ │   View      │ │      │                │
└───────────────┘      └─────────────────┘      └────────────────┘
```

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USER INTERACTION                           │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         REACT COMPONENTS                             │
│                                                                      │
│   User clicks "View Scores"  ───────────────────────┐               │
│                                                      │               │
│   useQuery({ queryKey: ['games'], queryFn })  ◄─────┘               │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         REACT QUERY                                  │
│                                                                      │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐            │
│   │   Cache     │◄──►│   Query     │◄──►│  Mutation   │            │
│   │   Layer     │    │   State     │    │   State     │            │
│   └─────────────┘    └──────┬──────┘    └─────────────┘            │
└─────────────────────────────┼───────────────────────────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            │                                   │
            ▼                                   ▼
┌───────────────────────┐           ┌───────────────────────┐
│     sportsApi.js      │           │    localStorage.js    │
│                       │           │                       │
│  fetchScoreboard()    │           │  getItem() / setItem()│
│  fetchTeamSchedule()  │           │                       │
│  fetchRankings()      │           │  User preferences     │
│  fetchNews()          │           │  Favorite teams       │
└───────────┬───────────┘           │  Auth tokens          │
            │                       └───────────────────────┘
            ▼
┌───────────────────────┐
│      ESPN API         │
│                       │
│  /scoreboard          │
│  /teams/{id}/schedule │
│  /rankings            │
│  /news                │
└───────────────────────┘
```

---

## 🗄️ Data Models

```
┌─────────────────────────────────────────────────────────────────────┐
│                              USER                                    │
├─────────────────────────────────────────────────────────────────────┤
│  id: string                                                          │
│  email: string                                                       │
│  full_name: string                                                   │
│  favorite_teams: string[]                                            │
│  school_id: string                                                   │
│  created_date: Date                                                  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                              GAME                                    │
├─────────────────────────────────────────────────────────────────────┤
│  id: string                                                          │
│  home_team: string                                                   │
│  away_team: string                                                   │
│  home_score: number                                                  │
│  away_score: number                                                  │
│  status: 'upcoming' | 'live' | 'final'                              │
│  game_date: string                                                   │
│  game_time: string                                                   │
│  venue: string                                                       │
│  tv_network: string                                                  │
│  home_logo: string                                                   │
│  away_logo: string                                                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                            TAILGATE                                  │
├─────────────────────────────────────────────────────────────────────┤
│  id: string                                                          │
│  name: string                                                        │
│  host_id: string                                                     │
│  game_date: Date                                                     │
│  start_time: string                                                  │
│  location: { lat, lng, lot_name }                                   │
│  is_public: boolean                                                  │
│  rsvp_count: number                                                  │
│  photo_url: string                                                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         TAILGATE_GROUP                               │
├─────────────────────────────────────────────────────────────────────┤
│  id: string                                                          │
│  name: string                                                        │
│  invite_code: string                                                 │
│  members: Member[]                                                   │
│  color: string                                                       │
│  avatar_emoji: string                                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔌 API Integration

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ESPN PUBLIC API                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Base URL: https://site.api.espn.com/apis/site/v2/sports/           │
│            football/college-football                                 │
│                                                                      │
│  Endpoints:                                                          │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  GET /scoreboard                                             │    │
│  │  → Returns current/upcoming games                            │    │
│  │  → Parameters: dates, seasontype, week, limit                │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  GET /teams/{id}/schedule                                    │    │
│  │  → Returns team's season schedule                            │    │
│  │  → Parameters: season                                        │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  GET /rankings                                               │    │
│  │  → Returns AP/Coaches Poll rankings                          │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  GET /news                                                   │    │
│  │  → Returns latest CFB news articles                          │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       GOOGLE MAPS API                                │
├─────────────────────────────────────────────────────────────────────┤
│  Requires: VITE_GOOGLE_MAPS_API_KEY                                 │
│  Used for: Campus maps, parking locations, friend tracking          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      LOCAL AUTHENTICATION                            │
│                    (No Backend Required)                             │
└─────────────────────────────────────────────────────────────────────┘

     ┌──────────┐         ┌──────────────┐         ┌─────────────┐
     │  User    │         │  AuthModal   │         │ localStorage│
     └────┬─────┘         └──────┬───────┘         └──────┬──────┘
          │                      │                        │
          │  Click "Sign In"     │                        │
          │─────────────────────►│                        │
          │                      │                        │
          │                      │  Enter email/password  │
          │                      │◄───────────────────────│
          │                      │                        │
          │                      │  Validate & Create     │
          │                      │  User Object           │
          │                      │───────────────────────►│
          │                      │                        │
          │                      │  Store in localStorage │
          │                      │◄───────────────────────│
          │                      │                        │
          │  Logged In!          │                        │
          │◄─────────────────────│                        │
          │                      │                        │

Note: For production, replace with Firebase Auth, Supabase, or 
      your own backend authentication.
```

---

## 📱 Page Navigation

```
                              ┌─────────────┐
                              │    Home     │
                              │   (Main)    │
                              └──────┬──────┘
                                     │
        ┌────────────┬───────────────┼───────────────┬────────────┐
        │            │               │               │            │
        ▼            ▼               ▼               ▼            ▼
  ┌───────────┐ ┌─────────┐   ┌───────────┐   ┌─────────┐  ┌─────────┐
  │  GameDay  │ │ Schedule│   │  MyTeams  │   │ Friends │  │ Profile │
  │   Live    │ │         │   │           │   │  Map    │  │Settings │
  └─────┬─────┘ └────┬────┘   └─────┬─────┘   └────┬────┘  └────┬────┘
        │            │              │              │            │
        ▼            │              ▼              │            ▼
  ┌───────────┐      │        ┌───────────┐       │      ┌───────────┐
  │ LiveGame  │      │        │ TeamPage  │       │      │  Privacy  │
  │  Detail   │      │        │  Detail   │       │      │   Terms   │
  └───────────┘      │        └───────────┘       │      └───────────┘
                     │                            │
                     ▼                            ▼
               ┌───────────┐              ┌────────────┐
               │ Tailgate  │              │  Campus    │
               │ Directory │              │    Map     │
               └─────┬─────┘              └────────────┘
                     │
                     ▼
               ┌───────────┐
               │ Tailgate  │
               │  Detail   │
               └───────────┘
```

---

## 🛠️ Technology Stack

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND STACK                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │     React 18    │  │   Vite 5        │  │  Tailwind CSS   │     │
│  │   (UI Library)  │  │ (Build Tool)    │  │   (Styling)     │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │  React Router   │  │  React Query    │  │   Shadcn/UI     │     │
│  │  (Navigation)   │  │ (Data Fetching) │  │  (Components)   │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │  Framer Motion  │  │  Lucide Icons   │  │   date-fns      │     │
│  │  (Animations)   │  │    (Icons)      │  │ (Date Utils)    │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐                          │
│  │   VitePWA       │  │ Google Maps     │                          │
│  │ (Offline/PWA)   │  │  (Maps SDK)     │                          │
│  └─────────────────┘  └─────────────────┘                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Build & Deployment

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BUILD PROCESS                                 │
└─────────────────────────────────────────────────────────────────────┘

  Source Code          Build           Production
  ┌─────────┐        ┌─────────┐      ┌─────────────────┐
  │  src/   │  ───►  │  Vite   │ ───► │    dist/        │
  │  .jsx   │        │  Build  │      │  ├── index.html │
  │  .css   │        │         │      │  ├── assets/    │
  │  .js    │        │         │      │  ├── sw.js      │
  └─────────┘        └─────────┘      │  └── icons/     │
                                      └─────────────────┘
                                              │
                                              ▼
                                      ┌─────────────────┐
                                      │   Deploy To:    │
                                      │  • Vercel       │
                                      │  • Netlify      │
                                      │  • GitHub Pages │
                                      │  • Firebase     │
                                      └─────────────────┘
```

---

## 🎯 Key Features Map

| Feature | Page | Components | API |
|---------|------|------------|-----|
| Live Scores | GameDay | GameCard, Filters | ESPN Scoreboard |
| Schedule | Schedule | WeekSelector, GameCard | ESPN Calendar |
| My Teams | MyTeams | TeamDetailView, NewsFeed | ESPN Teams |
| Find Friends | FindFriends | GoogleMapView | Browser Geolocation |
| Tailgates | TailgateDirectory | TailgateCard, MapView | Local Storage |
| AI Assistant | All Pages | GameDayAssistant | Built-in |
| Campus Map | CampusMap | GoogleMapView | Google Maps |

---

## 🔮 Future Enhancements

```
┌─────────────────────────────────────────────────────────────────────┐
│                     POTENTIAL BACKEND ADDITION                       │
└─────────────────────────────────────────────────────────────────────┘

  Current (Frontend Only)          Future (With Backend)
  ┌─────────────────────┐          ┌─────────────────────┐
  │   React Frontend    │          │   React Frontend    │
  │         +           │    ───►  │         +           │
  │   Local Storage     │          │   Backend API       │
  └─────────────────────┘          │   (Node/Python)     │
                                   │         +           │
                                   │   Database          │
                                   │   (PostgreSQL)      │
                                   │         +           │
                                   │   Real-time         │
                                   │   (WebSockets)      │
                                   └─────────────────────┘

Benefits of Backend:
• Real user authentication
• Cross-device data sync  
• Real-time friend locations
• Push notifications
• OpenAI integration
• Shared tailgates
```

---

*Generated for GameDay PWA - College Football Tailgating App*



