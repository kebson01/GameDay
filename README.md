# 🏈 GameDay - College Football Tailgate Companion

GameDay is a Progressive Web App (PWA) designed to enhance your college football game day experience. Find your friends, locate your car, discover tailgates, and never miss a moment of the action!

![GameDay](https://img.shields.io/badge/version-1.0.0-orange)
![PWA](https://img.shields.io/badge/PWA-ready-green)
![React](https://img.shields.io/badge/React-18.2-blue)

## ✨ Features

### 📍 Find My Car
Never lose your car in a sea of 50,000 vehicles again. Drop a pin when you park, add notes and photos, and navigate back with one tap.

### 👥 Find Friends
Create groups with your tailgate crew and share real-time locations. See everyone on a map and navigate to any friend instantly.

### 🎉 Tailgate Discovery
Browse public tailgates, RSVP to events, or host your own. Connect with fellow fans and make new friends.

### 🗺️ Campus Map
Navigate the stadium area with ease. Find restrooms, food vendors, first aid stations, and more.

### 🤖 AI Assistant
Powered by ChatGPT, get instant answers about tailgating tips, parking strategies, what to bring, and more.

### 🛡️ Safety Features
Quick access SOS button, check-ins with your group, and ride request features to keep everyone safe.

### 📱 Works Offline
PWA architecture with IndexedDB caching means the app works even with poor stadium cell service.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/gameday.git
cd gameday

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Google Maps API Key (required for maps)
# Get yours at: https://console.cloud.google.com/google/maps-apis
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# OpenAI API Key (required for AI assistant)
# Get yours at: https://platform.openai.com/api-keys
VITE_OPENAI_API_KEY=your_openai_api_key
```

### Development

```bash
# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

## 📱 PWA Installation

GameDay is a Progressive Web App that can be installed on your device:

### iOS (Safari)
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"

### Android (Chrome)
1. Open the app in Chrome
2. Tap the menu (⋮)
3. Select "Add to Home Screen" or "Install App"

### Desktop (Chrome/Edge)
1. Look for the install icon in the address bar
2. Click "Install"

## 🏗️ Tech Stack

- **Frontend:** React 18, Vite
- **Styling:** Tailwind CSS, shadcn/ui
- **Maps:** Google Maps API (@react-google-maps/api)
- **AI:** OpenAI GPT-4o-mini
- **Sports Data:** ESPN Public API (live scores, rankings, news)
- **State Management:** TanStack Query (React Query)
- **Storage:** Local Storage + IndexedDB (fully offline capable)
- **PWA:** Vite PWA Plugin, Workbox

## 📁 Project Structure

```
gameday/
├── public/
│   ├── icons/          # PWA icons
│   └── manifest.json   # PWA manifest
├── src/
│   ├── api/            # API clients
│   ├── components/
│   │   ├── ai/         # AI assistant
│   │   ├── auth/       # Authentication
│   │   ├── common/     # Shared components
│   │   ├── map/        # Map components
│   │   ├── onboarding/ # Onboarding flow
│   │   └── ui/         # UI components (shadcn)
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utilities & services
│   ├── pages/          # Page components
│   └── utils/          # Helper functions
├── index.html
├── vite.config.js
└── tailwind.config.js
```

## 🔒 Privacy & Security

- Location sharing is opt-in and can be disabled at any time
- Location is only shared with group members you choose
- Data is encrypted in transit
- See our [Privacy Policy](/PrivacyPolicy) for more details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Icons by [Lucide](https://lucide.dev/)
- UI components by [shadcn/ui](https://ui.shadcn.com/)
- Maps by [Google Maps Platform](https://developers.google.com/maps)

---

Made with 🏈 for fans everywhere
