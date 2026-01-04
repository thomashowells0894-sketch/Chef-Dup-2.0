# NutriChef - AI Nutrition & Fitness Coach

<div align="center">

  **Your AI-Powered Personal Health Companion**

  [![iOS](https://img.shields.io/badge/iOS-15.0+-blue.svg)](https://developer.apple.com/ios/)
  [![React](https://img.shields.io/badge/React-19.2-61dafb.svg)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6.svg)](https://www.typescriptlang.org/)
  [![Capacitor](https://img.shields.io/badge/Capacitor-6.0-119eff.svg)](https://capacitorjs.com/)
</div>

---

## Features

### AI-Powered Food Scanning
- Instant ingredient recognition from photos
- Barcode scanning for packaged foods
- Restaurant menu analysis
- Natural language food logging

### Smart Nutrition Tracking
- Automatic calorie and macro calculation
- Complete micronutrient breakdown
- Daily, weekly, and monthly trends
- Personalized calorie goals

### Recipe Generation
- AI-generated recipes from your ingredients
- Dietary preference support (Vegan, Keto, Gluten-Free)
- Step-by-step cooking guidance
- Cost savings calculations

### Fitness Tracking
- 60+ exercises across 5 categories
- 25+ pre-built workout plans
- Set, rep, and weight logging
- Calorie burn estimation

### Health Integration
- Apple HealthKit sync
- Weight trend analysis
- Intermittent fasting timer
- Water intake tracking
- Progress photo gallery

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript 5.8, Tailwind CSS |
| **Native** | Capacitor 6.0, iOS 15+ |
| **AI** | Google Gemini API |
| **Backend** | Supabase (PostgreSQL) |
| **Build** | Vite 6.2 |

---

## Project Structure

```
├── App.tsx                    # Main application component
├── index.html                 # HTML template with iOS meta tags
├── capacitor.config.ts        # Capacitor iOS configuration
├── vite.config.ts             # Vite build configuration
├── package.json               # Dependencies and scripts
│
├── components/
│   ├── ios/                   # iOS-specific components
│   │   └── IOSComponents.tsx  # HIG-compliant UI components
│   ├── AuthScreen.tsx         # Authentication
│   ├── CameraView.tsx         # Food/barcode scanning
│   ├── FitnessScreen.tsx      # Workout selection
│   └── ...                    # 20+ more components
│
├── services/
│   ├── iosNative.ts           # Native iOS services
│   ├── aiService.ts           # Gemini AI integration
│   ├── storage.ts             # Data persistence
│   └── ...                    # More services
│
├── hooks/
│   └── useNativeFeatures.ts   # React hooks for native features
│
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service worker
│   └── icons/                 # App icons
│
└── ios/
    └── App/
        ├── App/
        │   ├── Info.plist     # iOS configuration
        │   └── App.entitlements # iOS capabilities
        └── AppStore.md        # App Store submission guide
```

---

## Getting Started

### Prerequisites

- **Node.js** 18.0 or later
- **npm** or **yarn**
- **Xcode** 15.0 or later (for iOS)
- **CocoaPods** (`sudo gem install cocoapods`)
- **Apple Developer Account** (for device testing)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/nutrichef.git
cd nutrichef

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your GEMINI_API_KEY to .env
```

### Development (Web)

```bash
# Start development server
npm run dev

# Open in browser
open http://localhost:3000
```

### iOS Build

```bash
# Build web assets
npm run build

# Initialize Capacitor (first time only)
npx cap init NutriChef ai.nutrichef.app --web-dir dist

# Add iOS platform (first time only)
npx cap add ios

# Sync web assets to iOS
npx cap sync ios

# Open in Xcode
npx cap open ios
```

### Running on iOS Device

1. Open `ios/App/App.xcworkspace` in Xcode
2. Select your development team in Signing & Capabilities
3. Connect your iPhone
4. Select your device as the build target
5. Press Cmd+R to build and run

### Live Reload Development

```bash
# Run with live reload on iOS device
npm run ios:live
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
# AI Services
GEMINI_API_KEY=your_gemini_api_key

# Backend (Optional)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## iOS Configuration

### Required Capabilities

Enable these in Xcode under Signing & Capabilities:

- **HealthKit** - For health data sync
- **Push Notifications** - For meal reminders
- **Background Modes** - For background refresh
- **App Groups** - For widget support (future)

### HealthKit Data Types

**Read Access:**
- Steps
- Active Energy Burned
- Weight
- Heart Rate

**Write Access:**
- Dietary Energy Consumed
- Dietary Protein
- Dietary Carbohydrates
- Dietary Total Fat
- Water
- Workout Sessions
- Body Mass

---

## App Store Submission

See [ios/App/AppStore.md](ios/App/AppStore.md) for complete submission guide including:

- App Store description
- Screenshot requirements
- Privacy policy
- Review notes
- Keywords optimization

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run cap:sync` | Sync web assets to native |
| `npm run cap:open:ios` | Open iOS project in Xcode |
| `npm run ios:build` | Build and open iOS project |
| `npm run ios:live` | Run with live reload |

---

## Key Features Implementation

### Haptic Feedback
```tsx
import { useHaptics } from './hooks/useNativeFeatures';

const MyComponent = () => {
  const haptics = useHaptics();

  return (
    <button onClick={() => {
      haptics.medium();
      // ... action
    }}>
      Tap Me
    </button>
  );
};
```

### HealthKit Integration
```tsx
import { useHealthKit } from './hooks/useNativeFeatures';

const HealthSync = () => {
  const { writeNutrition, writeWorkout } = useHealthKit();

  const logMeal = async () => {
    await writeNutrition({
      calories: 500,
      protein: 30,
      carbs: 50,
      fat: 20,
      date: new Date()
    });
  };
};
```

### Local Notifications
```tsx
import { useNotifications } from './hooks/useNativeFeatures';

const Reminders = () => {
  const { scheduleMealReminder } = useNotifications();

  useEffect(() => {
    scheduleMealReminder('breakfast', 8, 0);
    scheduleMealReminder('lunch', 12, 30);
    scheduleMealReminder('dinner', 18, 30);
  }, []);
};
```

---

## Native iOS Features

This app includes comprehensive iOS-native functionality:

| Feature | Description |
|---------|-------------|
| **Haptic Feedback** | Tactile feedback for all interactions |
| **HealthKit** | Full read/write integration with Apple Health |
| **Push Notifications** | Meal reminders, workout alerts, hydration |
| **Camera** | Native camera for food/barcode scanning |
| **Secure Storage** | iOS Keychain for sensitive data |
| **Background Sync** | Offline data synchronization |
| **Share Sheet** | Native sharing for recipes and progress |

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Support

- **Email:** support@nutrichef.ai
- **Website:** https://nutrichef.ai
- **Issues:** [GitHub Issues](https://github.com/your-repo/nutrichef/issues)

---

<div align="center">
  <p>Made with love for healthier lives</p>
  <p>NutriChef Team</p>
</div>
