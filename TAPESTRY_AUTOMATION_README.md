# 🔧 Tapestry Automation Tool

A standalone web application for automating Tapestry service order processing. Users can input their credentials and B1 number through a beautiful web interface, and the tool will automatically process all "In Progress" service orders.

## ✨ Features

- **User-Friendly Interface**: Clean, modern web UI for easy interaction
- **Real-Time Logging**: See live updates as the automation runs
- **Screenshot Capture**: Automatically captures and displays the final result
- **Priority Processing**: Intelligently processes service codes by priority:
  - Priority 1: TxxMN, TxxMC, DxxN patterns (T25MN, T50MN, T50MC, D100N, T100MN, etc.)
  - Priority 2: MOD patterns (H3MOD, etc.)
  - Priority 3: Other codes
- **Special Handling**: Automatically detects and processes "Get NM1 Discount AT248" tasks
- **Smart Error Handling**: Skips rows with images in ID column, handles missing elements gracefully

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)

## 🚀 Installation

1. **Install Dependencies**

```bash
npm install express playwright
```

2. **Install Playwright Browsers**

```bash
npx playwright install chromium
```

## 💻 Usage

### Starting the Application

1. **Start the Server**

```bash
node tapestry-automation-server.js
```

2. **Open Your Browser**

Navigate to: `http://localhost:3000`

3. **Enter Your Credentials**

- **Username**: Your Tapestry username
- **Password**: Your Tapestry password
- **B1 Number**: The B1 number to search (e.g., b16bg4h8)

4. **Click "Start Automation"**

The tool will:
- Log in to Tapestry
- Search for the B1 number
- Identify all "In Progress" service orders
- Process them by priority
- Handle special cases (NM1 Discount)
- Complete all eligible tasks
- Display a final screenshot

## 📊 What It Does

### Step-by-Step Process

1. **Login**: Authenticates with provided credentials
2. **Search**: Finds service orders by B1 number
3. **Analyze**: Identifies "In Progress" orders and prioritizes them
4. **Process Each Service Code**:
   - Clicks "View Children"
   - Selects "All" from Block Size dropdown
   - Checks for "Get NM1 Discount AT248" and processes if found
   - Processes all "In-Progress" child activities
   - Selects "COMPLETE" from dropdown when available
5. **Screenshot**: Captures final result
6. **Display**: Shows screenshot in the UI

### Priority System

The tool processes service codes in this order:

1. **Highest Priority**: TxxMN, TxxMC, DxxN patterns
   - Examples: T25MN, T50MN, T50MC, D100N, T100MN
   
2. **Medium Priority**: MOD patterns
   - Examples: H3MOD
   
3. **Lowest Priority**: Other codes (BILL codes are skipped)

### Special Features

- **Image Detection**: Skips rows where ID column contains images
- **NM1 Discount Handling**: Automatically finds and processes "Get NM1 Discount AT248" tasks
- **Remove Time Constraint**: Clicks the "Remove Time Constraint" button when processing NM1 Discount
- **Status Normalization**: Handles both "In Progress" and "In-Progress" status formats
- **Retry Logic**: Attempts each row up to 2 times before skipping

## 🎨 User Interface

The application features:

- **Modern Design**: Gradient background with clean card layout
- **Real-Time Logs**: Live console showing all automation steps
- **Status Updates**: Clear status messages with color coding
- **Screenshot Display**: Final result shown directly in the browser
- **Responsive**: Works on desktop and mobile devices

## 🔒 Security Notes

- Credentials are only used for the current session
- No data is stored or logged permanently
- Browser runs in non-headless mode for transparency
- All communication happens locally

## 🐛 Troubleshooting

### Server Won't Start

```bash
# Check if port 3000 is already in use
netstat -ano | findstr :3000

# Kill the process if needed (Windows)
taskkill /PID <PID> /F

# Or use a different port by editing tapestry-automation-server.js
const PORT = 3001; // Change this line
```

### Playwright Not Found

```bash
# Reinstall Playwright
npm install playwright
npx playwright install chromium
```

### Automation Fails

- Check your credentials are correct
- Ensure the B1 number exists in the system
- Verify you have network access to the Tapestry server
- Check the logs for specific error messages

## 📝 Files

- `tapestry-automation-ui.html` - Frontend web interface
- `tapestry-automation-server.js` - Backend server with automation logic
- `TAPESTRY_AUTOMATION_README.md` - This documentation file

## 🎯 Example Usage

1. Start server: `node tapestry-automation-server.js`
2. Open browser: `http://localhost:3000`
3. Enter:
   - Username: `subi0001`
   - Password: `simple`
   - B1 Number: `b16bg4h8`
4. Click "Start Automation"
5. Watch the logs and wait for completion
6. View the final screenshot

## 📸 Screenshot

The final screenshot is automatically saved as `tapestry-automation-result.png` and displayed in the browser.

## 🤝 Support

For issues or questions, check the real-time logs in the UI for detailed error messages.

## 📄 License

This tool is provided as-is for internal use.

---

**Made with ❤️ using Node.js, Express, and Playwright**