# Ocean Garage Frontend

Modern, responsive frontend for the Ocean Garage Management System built with React, TypeScript, and Tailwind CSS.

## Features

- 🚗 **Vehicle Management** - Add vehicles by VIN, decode VIN automatically, track work descriptions
- ⏱️ **Time Logging** - Workers can log hours worked on vehicles with notes
- 📄 **Invoices & Quotes** - Create and manage invoices and quotes (Angebote) for vehicles
- 🔐 **Authentication** - Secure login and registration with JWT
- 📱 **100% Responsive** - Works perfectly on mobile, tablet, and desktop
- 🎨 **Modern UI** - Clean, professional design with smooth animations
- 🔔 **Notifications** - Toast notifications for all actions
- 🎯 **Old-School Feel** - Unique design that feels like classic garage software but modern

## Tech Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Axios** - HTTP client
- **React Hot Toast** - Notifications
- **Lucide React** - Icons
- **date-fns** - Date formatting

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API running on `http://localhost:3000` (or configure `VITE_API_URL`)

### Installation

```bash
# Install dependencies
npm install

# Create .env file (optional, defaults to http://localhost:3000)
echo "VITE_API_URL=http://localhost:3000" > .env
```

### Development

```bash
# Start dev server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/       # Reusable components (Layout, ProtectedRoute)
├── contexts/        # React contexts (AuthContext)
├── lib/             # Utilities (API client)
├── pages/           # Page components (Vehicles, TimeLogs, Invoices, Login)
├── App.tsx          # Main app component with routing
├── main.tsx         # Entry point
└── index.css        # Global styles with Tailwind
```

## Environment Variables

- `VITE_API_URL` - Backend API URL (default: `http://localhost:3000`)

## Features Overview

### Vehicles
- Search vehicles by VIN, brand, model, or license plate
- Decode VIN automatically to get vehicle details
- Add/edit vehicle information
- Track work descriptions
- Mark vehicles as active/inactive

### Time Logs
- Log hours worked on vehicles
- Add notes describing work done
- View statistics (total hours, entries, averages)
- Filter and manage time entries

### Invoices & Quotes
- Create invoices and quotes (Angebote)
- Add line items with quantities and prices
- Automatic tax calculation
- Track status (draft, sent, paid, cancelled)
- Link to vehicles

## Design Philosophy

The frontend combines modern web technologies with a classic garage software aesthetic:
- Clean, functional interface
- Professional color scheme
- Intuitive navigation
- Responsive design for all devices
- Smooth animations and transitions
- Clear visual hierarchy

## License

Private - Ocean Garage Management System
