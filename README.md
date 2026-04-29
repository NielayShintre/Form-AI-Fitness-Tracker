# FORM - AI Fitness Tracker

FORM is a next-generation, AI-powered fitness tracking application designed to help users log workouts, track progress, and receive intelligent, personalized coaching using Google's Gemini API. 

## 🚀 Features

- **Personalized AI Coaching:** Built-in integration with Google's Gemini API to provide contextual advice, tailored workout recommendations, and safety-first fitness guidance based on your logged history.
- **Dynamic Workout Logging:** Easily log workouts across various modalities (HIIT, Running, Cycling, Yoga, etc.) with a clean, responsive UI.
- **Progress Tracking & PRs:** Visualize your fitness journey with automatic tracking of personal records (PRs), workout frequencies, and total active time.
- **Modern, Premium UI:** A meticulously designed interface featuring custom glassmorphism, dynamic animations, and a cohesive design system for a premium user experience.
- **Privacy-First Storage:** User data and states are managed locally, keeping your fitness journey private and snappy.

## 🛠 Tech Stack

- **Framework:** React 18
- **Language:** TypeScript
- **Build Tool:** Vite
- **AI Integration:** Google Gemini API (`@google/genai`)
- **Styling:** Vanilla CSS with custom design tokens & CSS variables

## 📦 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm
- A Gemini API Key ([Get one here](https://aistudio.google.com/apikey))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/NielayShintre/Form----AI-Fitness-Tracker.git
   cd Form----AI-Fitness-Tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory and add your Gemini API key:
   ```env
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

4. **Start the Development Server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`.

## 🔒 Security & AI Safety
FORM implements a robust, multi-layered safety architecture for its AI coaching features to ensure users receive helpful and safe fitness advice:
1. **Pre-filter:** Client-side input validation to block inappropriate queries.
2. **System Instruction:** Strict persona alignment preventing the AI from offering medical advice.
3. **Model Configuration:** Configured to generate focused, low-hallucination responses.
4. **Post-filter:** Final output sanitization before presenting information to the UI.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/NielayShintre/Form----AI-Fitness-Tracker/issues) if you want to contribute.

## 📜 License
This project is open-source and available under the [MIT License](LICENSE).
