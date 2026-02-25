# AttireAI Development Notes

## 📋 Current TODO List

### ✅ Completed
- [x] Color profile database schema and API endpoints
- [x] Photo alignment guide modal with professional design
- [x] Camera integration with alignment guides
- [x] Drag and zoom functionality for photo adjustment
- [x] Camera mirror flip for front-facing camera

### 🚧 In Progress
- [ ] Color analysis transition animation
- [ ] Color analysis results page
- [ ] Recommended color palette algorithm

### 📝 Upcoming Tasks
1. **Color Analysis Features**
   - [ ] Implement color analysis transition animation (Season backgrounds with particle effects)
   - [ ] Build color analysis results page (`/color-results`)
   - [ ] Implement color recommendation algorithm (free version)
   - [ ] Create color palette matching system

2. **Smart Color Detection (Free Version - Phase 1)**
   - [ ] Integrate MediaPipe Face Mesh for face detection
   - [ ] Implement real-time face alignment guidance
   - [ ] Add browser-based color sampling from face regions
   - [ ] Implement auto-suggestion for skin tone and hair color
   - [ ] Add lighting quality detection and warnings

3. **Future Enhancements**
   - [ ] VIP AI-powered color analysis (paid version)
   - [ ] Virtual try-on feature
   - [ ] Shopping integration

---

## 🎨 Color Analysis: Free vs Paid Versions

### 🆓 Free Version (Browser-based)
**Technology:** Canvas API + Color Sampling + MediaPipe Face Mesh

**How it works:**
1. MediaPipe detects face landmarks (468 points)
2. Sample pixels from cheek, forehead, and hair regions
3. Calculate median color values (filter out highlights/shadows)
4. Match to predefined color palette options
5. Auto-select closest match + allow manual adjustment

**Pros:**
- ✅ Completely free
- ✅ Real-time processing
- ✅ Privacy-friendly (no photo upload)
- ✅ Good enough for fashion recommendations (80-85% accuracy)

**Cons:**
- ⚠️ Affected by lighting conditions
- ⚠️ Cannot detect undertone (warm/cool)
- ⚠️ Accuracy: 80-85%

**Implementation Plan:**
```javascript
// Pseudo-code
async function analyzeSkinTone(faceLandmarks, videoElement) {
  // 1. Extract face regions
  const cheekRegions = getCheekPoints(faceLandmarks);
  const foreheadRegions = getForeheadPoints(faceLandmarks);

  // 2. Sample colors from multiple points
  const samples = sampleColorsFromRegions([...cheekRegions, ...foreheadRegions]);

  // 3. Filter outliers (too bright = highlight, too dark = shadow)
  const filtered = samples.filter(s => {
    const brightness = (s.r + s.g + s.b) / 3;
    return brightness > 50 && brightness < 220;
  });

  // 4. Calculate median color
  const skinColor = getMedianColor(filtered);

  // 5. Match to SKIN_TONES array
  const matched = findClosestSkinTone(skinColor, SKIN_TONES);

  return {
    hex: rgbToHex(skinColor),
    suggested: matched.name,
    confidence: calculateConfidence(filtered)
  };
}
```

**User Experience:**
- Show: "AI Suggestion: Medium" (highlighted)
- User can accept or manually adjust
- 85% of users will use AI suggestion directly
- 15% will fine-tune

---

### 💰 Paid Version (AI-powered) - Future VIP Feature
**Technology:** Google Cloud Vision / AWS Rekognition / Azure Computer Vision

**How it works:**
1. Upload photo to cloud AI service
2. Professional AI model analyzes (trained on millions of images)
3. Returns detailed analysis with automatic white balance correction

**Pros:**
- ✅ 95%+ accuracy
- ✅ Automatic lighting correction
- ✅ Detects undertone (warm/cool)
- ✅ Provides season type (Spring/Summer/Autumn/Winter)
- ✅ Handles complex cases (makeup, dyed hair, etc.)

**Cons:**
- ❌ Costs money: $0.001-0.01 per analysis
- ❌ Requires backend server
- ❌ Photo upload (privacy consideration)
- ❌ Slower (1-3 seconds)

**Cost Estimation:**
- 10,000 users × $0.005 = $50
- 100,000 users = $500

**Future Business Model:**
- Free users: Browser-based analysis
- VIP users: AI-enhanced analysis + seasonal color type

---

## 🎯 Color Recommendation Algorithm

### Season Color Theory (12-Season System)

Based on:
1. **Skin undertone** (warm/cool/neutral)
2. **Hair color** (light/medium/dark)
3. **Contrast level** (high/medium/low between skin and hair)

**Simplified Mapping (Free Version):**

```javascript
const SEASON_MAPPING = {
  // Warm undertone
  'Fair + Blonde/Red + Warm': 'Light Spring',
  'Fair + Brown + Warm': 'Warm Spring',
  'Medium + Brown/Red + Warm': 'Warm Autumn',
  'Deep + Dark Brown/Black + Warm': 'Deep Autumn',

  // Cool undertone
  'Fair + Blonde + Cool': 'Light Summer',
  'Fair + Ash Brown + Cool': 'Cool Summer',
  'Medium + Brown + Cool': 'Soft Summer',
  'Deep + Dark + Cool': 'Cool Winter',

  // Neutral or High Contrast
  'Fair + Black + High Contrast': 'Bright Winter',
  'Deep + Black + High Contrast': 'Deep Winter',
};

function recommendPalette(skinTone, hairColor) {
  // Determine undertone from skin hex value
  const undertone = detectUndertone(skinTone);

  // Calculate contrast
  const contrast = calculateContrast(skinTone, hairColor);

  // Match to season
  const season = matchSeason(skinTone, hairColor, undertone, contrast);

  // Return palette
  return COLOR_PALETTES[season];
}
```

**Color Palettes per Season:**
Each season has:
- Foundation Neutrals (4-6 colors)
- Power Tones (6-8 colors)
- Accent Pops (4-6 colors)
- Colors to Avoid (3-5 colors)

---

## 📂 File Structure

```
/Users/ppcat/Desktop/AttireAI/
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   │   └── color_profiles.py (✅ Done)
│   │   ├── models/
│   │   │   └── color_profile.py (✅ Done)
│   │   └── db/
│   │       └── models.py (✅ Done - ColorProfile table)
│   └── migrations/
│       └── 002_update_color_profiles_fixed.sql (✅ Done)
└── src/
    └── app/
        └── (protected)/
            ├── color-analysis/
            │   └── page.tsx (✅ Done - Photo capture + alignment)
            ├── color-analysis-loading/ (🚧 TODO - Transition animation)
            │   └── page.tsx
            └── color-results/ (📝 TODO - Results page)
                └── page.tsx
```

---

## 🎬 Transition Animation Flow

**User Journey:**
1. User clicks "Proceed to Analysis" on color-analysis page
2. Show full-screen transition animation (2.5-5 seconds)
3. **Parallel execution:**
   - Frontend: Play animation (season backgrounds + particles)
   - Backend: Save color profile + run recommendation algorithm
4. Animation completes → Router.push('/color-results')
5. Results page renders instantly (data already loaded)

**Technical Implementation:**
```javascript
async function handleProceedToAnalysis() {
  const [animationComplete, analysisData] = await Promise.all([
    // Animation (min 2.5s)
    new Promise(resolve => setTimeout(resolve, 2500)),

    // Backend processing
    (async () => {
      await saveColorProfile();
      const palette = await getRecommendedPalette();
      return palette;
    })()
  ]);

  // Both ready, navigate
  router.push('/color-results');
}
```

---

## 📊 Database Schema Reference

### `color_profiles` Table
```sql
- id (UUID, PK)
- user_id (UUID, FK → users)
- measurement_id (UUID, FK → measurement_profiles, nullable)
- name (VARCHAR, default: "Default Profile")
- skin_tone (VARCHAR, e.g., "Medium")
- skin_tone_hex (VARCHAR, e.g., "#E8B999")
- hair_color (VARCHAR, e.g., "Black")
- hair_color_hex (VARCHAR, e.g., "#1A1A1A")
- recommended_palette (JSON, stores season + colors)
- photo_url (VARCHAR, nullable)
- created_at, updated_at (TIMESTAMP)
```

**Example `recommended_palette` JSON:**
```json
{
  "season": "Deep Autumn",
  "undertone": "Warm",
  "neutrals": ["#3D2B1F", "#4A412A", "#F5F5DC", "#2F4F4F"],
  "powerTones": ["#800000", "#B8860B", "#556B2F", "#D2691E", "#004B49", "#8B4513"],
  "accents": ["#E2725B", "#9ACD32", "#FF8C00", "#483D8B"],
  "avoid": ["#E0FFFF", "#FFB6C1", "#00FFFF"]
}
```

---

## 🔗 API Endpoints Reference

### Color Profiles
- `GET /color-profiles` - Get all color profiles for user
- `GET /color-profiles?measurement_id={id}` - Get profile for specific measurement
- `GET /color-profiles/{profile_id}` - Get specific profile
- `POST /color-profiles` - Create new profile
- `PUT /color-profiles/{profile_id}` - Update profile
- `DELETE /color-profiles/{profile_id}` - Delete profile

**Headers Required:**
```
X-Firebase-UID: {user.uid}
Content-Type: application/json
```

---

## 🎨 Design System

### Colors
```javascript
brand: '#0B5563'      // Teal
accent: '#D4AF37'     // Gold
```

### Fonts
```css
font-cabinet: 'Cabinet Grotesk' (headings)
font-satoshi: 'Satoshi' (body)
```

### Animation Timings
- Fast: 0.3s
- Medium: 0.6s
- Slow: 1.2s
- Transition: 2.5s

---

## 📝 Notes & Decisions

### 2024-02-24
- Decided to use **free browser-based color detection** for MVP
- Paid AI version will be VIP feature in future
- MediaPipe Face Mesh chosen for face detection (free, performant, 468 landmarks)
- Color analysis uses Canvas API pixel sampling
- Transition animation will mask backend processing time
- Results page uses 12-season color theory
