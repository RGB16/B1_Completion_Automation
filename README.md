# 🤖 Web Automation Dashboard

A modern web-based dashboard for automating B1 processing with real-time status tracking and automatic screenshot capture.

## ✨ Features

- **Modern UI**: Clean, responsive design with gradient theme
- **Multiple B1 Support**: Process up to 8 B1 numbers simultaneously
- **Real-time Status**: Live progress tracking for each B1
- **Screenshot Capture**: Automatic screenshots of results and final state
- **Activity Logging**: Detailed timestamped logs
- **Visual Progress**: Animated progress bars and status indicators

## 🚀 Quick Start

### Prerequisites
- Node.js (v16.0.0 or higher)
- npm (Node Package Manager)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd web-automation
```

2. Install dependencies:
```bash
npm install
```

3. Install Playwright browsers (first time only):
```bash
npx playwright install chromium
```

### Running the Application

Start the server:
```bash
npm start
```

Open your browser and navigate to:
```
http://localhost:3000
```

## 📖 Usage

1. **Enter Credentials**: Input your User ID and Password
2. **Select B1 Count**: Choose how many B1 numbers to process (1-8)
3. **Enter B1 Numbers**: Fill in each B1 number field
4. **Start Automation**: Click "Start Automation" button
5. **Monitor Progress**: Watch real-time status updates
6. **View Screenshots**: Click screenshot links in completed B1 cards

## 📸 Screenshot Feature

The application automatically captures screenshots during automation:
- **Results Screenshot**: After B1 search completes
- **Final Screenshot**: After all processing is done
- **Error Screenshot**: If automation fails

Screenshots are saved in the `screenshots/` directory with timestamped filenames.

## 🎨 UI Components

### Configuration Panel
- User credentials input
- B1 count selector
- Dynamic B1 input fields
- Control buttons (Start, Stop, Reset)

### Status Panel
- Overall status cards
- Progress bar with percentage
- Individual B1 status cards
- Activity log with timestamps
- Screenshot links

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Automation**: Playwright (Chromium)
- **Screenshots**: Full-page PNG captures

## 📁 Project Structure

```
web-automation/
├── index.html          # Main UI
├── styles.css          # Styling
├── app.js              # Client logic
├── server.js           # Server with automation
├── package.json        # Dependencies
└── screenshots/        # Screenshot storage
```

## 🔧 Configuration

### Change Port
Set the `PORT` environment variable:
```bash
# Windows
set PORT=8080 && npm start

# Linux/Mac
PORT=8080 npm start
```

### Headless Mode
Edit `server.js` to change browser visibility:
```javascript
headless: true  // false to see browser
```

## 📝 API Endpoints

### POST /api/automate
Start automation for a B1 number.

**Request:**
```json
{
  "userId": "string",
  "password": "string",
  "b1Number": "string",
  "index": number
}
```

**Response:**
```json
{
  "success": boolean,
  "message": "string",
  "screenshots": {
    "results": "string",
    "final": "string"
  }
}
```

### GET /api/health
Health check endpoint.

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### Playwright Issues
```bash
npm uninstall playwright
npm install playwright
npx playwright install chromium
```

## 📄 License

MIT License

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues or questions, please open an issue on GitHub.

---

**Built with ❤️ using Node.js, Express, and Playwright**