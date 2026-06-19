// Global state
let automationState = {
    isRunning: false,
    b1Count: 1,
    b1Numbers: [],
    results: {},
    currentB1Index: 0,
    successCount: 0,
    failedCount: 0
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeB1Inputs();
    attachEventListeners();
    addLog('info', 'Application initialized. Ready to start automation.');
});

// Initialize B1 input fields
function initializeB1Inputs() {
    const b1Count = parseInt(document.getElementById('b1Count').value);
    automationState.b1Count = b1Count;
    generateB1Inputs(b1Count);
}

// Generate B1 input fields dynamically
function generateB1Inputs(count) {
    const container = document.getElementById('b1InputsContainer');
    container.innerHTML = '';
    
    for (let i = 1; i <= count; i++) {
        const inputGroup = document.createElement('div');
        inputGroup.className = 'b1-input-group';
        inputGroup.innerHTML = `
            <label for="b1_${i}">B1 #${i}</label>
            <input 
                type="text" 
                id="b1_${i}" 
                name="b1_${i}" 
                placeholder="Enter B1 number" 
                required
            >
        `;
        container.appendChild(inputGroup);
    }
}

// Attach event listeners
function attachEventListeners() {
    // B1 count selector
    document.getElementById('b1Count').addEventListener('change', (e) => {
        const count = parseInt(e.target.value);
        automationState.b1Count = count;
        generateB1Inputs(count);
        addLog('info', `B1 count changed to ${count}`);
    });

    // Form submission
    document.getElementById('automationForm').addEventListener('submit', handleFormSubmit);

    // Stop button
    document.getElementById('stopBtn').addEventListener('click', handleStop);

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', handleReset);

    // Clear log button
    document.getElementById('clearLogBtn').addEventListener('click', clearLog);
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    if (automationState.isRunning) {
        addLog('warning', 'Automation is already running!');
        return;
    }

    // Get form data
    const userId = document.getElementById('userId').value.trim();
    const password = document.getElementById('password').value.trim();
    const b1Count = automationState.b1Count;
    
    // Collect B1 numbers
    const b1Numbers = [];
    for (let i = 1; i <= b1Count; i++) {
        const b1Value = document.getElementById(`b1_${i}`).value.trim();
        if (b1Value) {
            b1Numbers.push(b1Value);
        }
    }

    if (b1Numbers.length === 0) {
        addLog('error', 'Please enter at least one B1 number!');
        return;
    }

    // Update state
    automationState.isRunning = true;
    automationState.b1Numbers = b1Numbers;
    automationState.currentB1Index = 0;
    automationState.successCount = 0;
    automationState.failedCount = 0;
    automationState.results = {};

    // Update UI
    updateOverallStatus('running');
    document.getElementById('startBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;
    document.getElementById('userId').disabled = true;
    document.getElementById('password').disabled = true;
    document.getElementById('b1Count').disabled = true;
    
    // Disable B1 inputs
    for (let i = 1; i <= b1Count; i++) {
        document.getElementById(`b1_${i}`).disabled = true;
    }

    addLog('info', `Starting automation for ${b1Numbers.length} B1 number(s)...`);
    addLog('info', `User ID: ${userId}`);
    
    // Generate B1 status cards
    generateB1StatusCards(b1Numbers);

    // Start automation
    await runAutomation(userId, password, b1Numbers);
}

// Generate B1 status cards
function generateB1StatusCards(b1Numbers) {
    const container = document.getElementById('b1StatusContainer');
    container.innerHTML = '';
    
    b1Numbers.forEach((b1, index) => {
        const card = document.createElement('div');
        card.className = 'b1-status-card pending';
        card.id = `b1-card-${index}`;
        card.innerHTML = `
            <div class="b1-card-header">
                <span class="b1-number">${b1}</span>
                <span class="b1-status-badge pending">Pending</span>
            </div>
            <div class="b1-card-body">
                <p><strong>Status:</strong> Waiting to start...</p>
                <p><strong>Progress:</strong> 0%</p>
                <p><strong>Details:</strong> Not started</p>
            </div>
        `;
        container.appendChild(card);
    });
}

// Run automation for all B1 numbers
async function runAutomation(userId, password, b1Numbers) {
    for (let i = 0; i < b1Numbers.length; i++) {
        if (!automationState.isRunning) {
            addLog('warning', 'Automation stopped by user');
            break;
        }

        automationState.currentB1Index = i;
        const b1Number = b1Numbers[i];
        
        updateProgress(i, b1Numbers.length);
        addLog('info', `Processing B1 #${i + 1}: ${b1Number}`);
        
        // Update card status to running
        updateB1Card(i, 'running', 'Processing...', 'Automation in progress');

        try {
            // Call the automation API
            const result = await callAutomationAPI(userId, password, b1Number, i);
            
            if (result.success) {
                automationState.successCount++;
                automationState.results[b1Number] = { success: true, message: result.message, screenshots: result.screenshots };
                updateB1Card(i, 'completed', 'Completed', result.message || 'Automation completed successfully', result.screenshots);
                addLog('success', `✓ B1 ${b1Number} completed successfully`);
                if (result.screenshots) {
                    addLog('info', `📸 Screenshots saved for ${b1Number}`);
                }
            } else {
                automationState.failedCount++;
                automationState.results[b1Number] = { success: false, message: result.message };
                updateB1Card(i, 'failed', 'Failed', result.message || 'Automation failed');
                addLog('error', `✗ B1 ${b1Number} failed: ${result.message}`);
            }
        } catch (error) {
            automationState.failedCount++;
            automationState.results[b1Number] = { success: false, message: error.message };
            updateB1Card(i, 'failed', 'Error', error.message);
            addLog('error', `✗ B1 ${b1Number} error: ${error.message}`);
        }

        // Update counters
        document.getElementById('successCount').textContent = automationState.successCount;
        document.getElementById('failedCount').textContent = automationState.failedCount;
    }

    // Final update
    updateProgress(b1Numbers.length, b1Numbers.length);
    
    if (automationState.isRunning) {
        updateOverallStatus('completed');
        addLog('success', `Automation completed! Success: ${automationState.successCount}, Failed: ${automationState.failedCount}`);
    }

    // Reset UI
    automationState.isRunning = false;
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
}

// Call automation API
async function callAutomationAPI(userId, password, b1Number, index) {
    try {
        const response = await fetch('/api/automate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId,
                password,
                b1Number,
                index
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API call error:', error);
        throw error;
    }
}

// Update B1 card
function updateB1Card(index, status, statusText, details, screenshots) {
    const card = document.getElementById(`b1-card-${index}`);
    if (!card) return;

    card.className = `b1-status-card ${status}`;
    
    const badge = card.querySelector('.b1-status-badge');
    badge.className = `b1-status-badge ${status}`;
    badge.textContent = statusText;

    const body = card.querySelector('.b1-card-body');
    const progress = status === 'running' ? '50%' : status === 'completed' ? '100%' : '0%';
    
    let screenshotLinks = '';
    if (screenshots && status === 'completed') {
        screenshotLinks = `
            <p><strong>Screenshots:</strong></p>
            <p style="font-size: 0.85rem;">
                📸 <a href="${screenshots.results}" target="_blank" style="color: #667eea; text-decoration: underline;">Results</a> |
                <a href="${screenshots.final}" target="_blank" style="color: #667eea; text-decoration: underline;">Final</a>
            </p>
        `;
    }
    
    body.innerHTML = `
        <p><strong>Status:</strong> ${statusText}</p>
        <p><strong>Progress:</strong> ${progress}</p>
        <p><strong>Details:</strong> ${details}</p>
        ${screenshotLinks}
    `;
}

// Update overall status
function updateOverallStatus(status) {
    const statusText = document.getElementById('statusText');
    statusText.className = `status-value ${status}`;
    
    const statusLabels = {
        idle: 'Idle',
        running: 'Running',
        completed: 'Completed',
        error: 'Error'
    };
    
    statusText.textContent = statusLabels[status] || status;
}

// Update progress
function updateProgress(current, total) {
    const percent = total > 0 ? Math.round((current / total) * 100) : 0;
    
    document.getElementById('progressText').textContent = `${current}/${total}`;
    document.getElementById('progressFill').style.width = `${percent}%`;
    document.getElementById('progressPercent').textContent = `${percent}%`;
}

// Handle stop
function handleStop() {
    if (!automationState.isRunning) return;
    
    automationState.isRunning = false;
    updateOverallStatus('error');
    addLog('warning', 'Automation stopped by user');
    
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
}

// Handle reset
function handleReset() {
    if (automationState.isRunning) {
        if (!confirm('Automation is running. Are you sure you want to reset?')) {
            return;
        }
        automationState.isRunning = false;
    }

    // Reset form
    document.getElementById('automationForm').reset();
    
    // Reset state
    automationState = {
        isRunning: false,
        b1Count: 1,
        b1Numbers: [],
        results: {},
        currentB1Index: 0,
        successCount: 0,
        failedCount: 0
    };

    // Reset UI
    updateOverallStatus('idle');
    document.getElementById('progressText').textContent = '0/0';
    document.getElementById('progressFill').style.width = '0%';
    document.getElementById('progressPercent').textContent = '0%';
    document.getElementById('successCount').textContent = '0';
    document.getElementById('failedCount').textContent = '0';
    document.getElementById('b1StatusContainer').innerHTML = '';
    
    // Enable inputs
    document.getElementById('userId').disabled = false;
    document.getElementById('password').disabled = false;
    document.getElementById('b1Count').disabled = false;
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;

    // Reinitialize B1 inputs
    initializeB1Inputs();
    
    addLog('info', 'Form reset. Ready to start new automation.');
}

// Add log entry
function addLog(type, message) {
    const logContainer = document.getElementById('logContainer');
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    
    const logEntry = document.createElement('p');
    logEntry.className = `log-entry ${type}`;
    logEntry.innerHTML = `
        <span class="log-time">[${time}]</span>
        <span class="log-message">${message}</span>
    `;
    
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

// Clear log
function clearLog() {
    const logContainer = document.getElementById('logContainer');
    logContainer.innerHTML = '<p class="log-entry info"><span class="log-time">[--:--:--]</span><span class="log-message">Log cleared.</span></p>';
    addLog('info', 'Ready to start automation...');
}

// Made with Bob
