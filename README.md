# Attendance PWA with Next.js & Firebase

A modern, mobile-first Attendance Management System built with Next.js 15 and Firebase. This Progressive Web App (PWA) allows employees to check in and out using geolocation and photo verification, while providing administrators with a comprehensive dashboard for management and reporting.

## 🚀 Features

### 📱 Employee Portal (PWA)
- **Geolocation Fencing:** Ensures employees are within a specified radius of the office before checking in.
- **Photo Verification:** Captures and compresses photos (Direct Base64 storage) for check-in/out verification.
- **Smart Check-in:** Automatically marks attendance as "On-Time" or "Late" based on office schedules.
- **Leave Requests:** Employees can request sick leave or time off directly from the app.
- **Live Clock:** Real-time server-synced clock display.
- **PWA Support:** Installable on mobile devices for a native app-like experience.

### 🛠️ Admin Dashboard
- **Dashboard:** Real-time overview of daily attendance (On-Time, Late, Absent, On-Leave).
- **Employee Management:** Add, edit, and manage employee profiles.
- **Office Settings:** Configure office location (latitude/longitude), radius, work hours, and late tolerance.
- **Reports:** View and export detailed attendance logs.

## 🛠️ Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
- **Language:** TypeScript
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [Radix UI](https://www.radix-ui.com/) / shadcn/ui
- **Backend:** Firebase (Firestore, Authentication)
- **Icons:** [Lucide React](https://lucide.dev/)
- **PWA:** `@ducanh2912/next-pwa`
- **Charts:** Recharts

## 📂 Project Structure

```
src/
├── app/
│   ├── (admin)/        # Admin dashboard routes
│   │   ├── dashboard/  # Attendance summary
│   │   ├── employees/  # Employee management
│   │   ├── reports/    # Attendance logs & reports
│   │   └── settings/   # Office location & schedule settings
│   ├── (auth)/         # Authentication routes
│   └── check-in/       # Client-facing attendance portal
├── components/         # Reusable UI components
├── firebase/           # Firebase configuration & hooks
└── lib/                # Data models & utilities
```

## 🏁 Getting Started

### Prerequisites
- Node.js 18+ installed.
- A Firebase project set up.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <project-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Firebase:**
    - The project currently uses a configuration file at `src/firebase/config.ts`.
    - Ensure your Firebase project has Firestore and Authentication (Anonymous & Email/Password) enabled.
    - Update `src/firebase/config.ts` with your own Firebase credentials if needed.

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

5.  **Open the app:**
    - The app runs on port **9003** by default.
    - **Admin Dashboard:** `http://localhost:9003/dashboard` (or `http://localhost:9003/login`)
    - **Employee Check-in:** `http://localhost:9003/check-in`

## 📱 PWA Instructions
To test the PWA features:
1.  Run the production build:
    ```bash
    npm run build
    npm start
    ```
2.  Open `http://localhost:3000` (default start port) or check the console output.
3.  Open DevTools -> Application tab -> Manifest to verify settings.
4.  On mobile, use "Add to Home Screen" to install.
