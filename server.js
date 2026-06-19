const express = require('express');
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
}

// Store active automation sessions
const activeSessions = new Map();

// API endpoint to start automation
app.post('/api/automate', async (req, res) => {
    const { userId, password, b1Number, index } = req.body;

    if (!userId || !password || !b1Number) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields: userId, password, or b1Number'
        });
    }

    console.log(`\n[${new Date().toISOString()}] Starting automation for B1: ${b1Number}`);
    console.log(`User ID: ${userId}, Index: ${index}`);

    try {
        const result = await runAutomation(userId, password, b1Number);
        
        console.log(`[${new Date().toISOString()}] Automation completed for B1: ${b1Number}`);
        console.log(`Result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
        
        res.json(result);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error for B1 ${b1Number}:`, error.message);
        res.json({
            success: false,
            message: error.message
        });
    }
});

// Main automation function
async function runAutomation(userId, password, b1Number) {
    let browser = null;
    let page = null;

    try {
        // Launch browser
        browser = await chromium.launch({
            headless: true, // Run in headless mode for server
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const context = await browser.newContext({
            ignoreHTTPSErrors: true
        });

        page = await context.newPage();

        // Step 1: Navigate to login page
        console.log(`  Step 1: Navigating to login page...`);
        await page.goto('https://caddla-4127.belldev.dev.bce.ca:9007/smweb_taptest05/Login', {
            waitUntil: 'networkidle',
            timeout: 60000
        });

        // Step 2: Enter User ID
        console.log(`  Step 2: Entering User ID...`);
        const userIdXPath = '/html/body/table[3]/tbody/tr/td/form/table/tbody/tr/td/table[4]/tbody/tr/td[2]/table[2]/tbody/tr[3]/td[2]/table/tbody/tr[1]/td[2]/table/tbody/tr[3]/td/input';
        await page.locator(`xpath=${userIdXPath}`).fill(userId);
        await page.waitForTimeout(500);

        // Step 3: Enter Password
        console.log(`  Step 3: Entering Password...`);
        const passwordXPath = '/html/body/table[3]/tbody/tr/td/form/table/tbody/tr/td/table[4]/tbody/tr/td[2]/table[2]/tbody/tr[3]/td[2]/table/tbody/tr[1]/td[2]/table/tbody/tr[6]/td/input';
        await page.locator(`xpath=${passwordXPath}`).fill(password);
        await page.waitForTimeout(500);

        // Step 4: Click Login button
        console.log(`  Step 4: Clicking Login button...`);
        const loginButtonXPath = '/html/body/table[3]/tbody/tr/td/form/table/tbody/tr/td/table[4]/tbody/tr/td[2]/table[2]/tbody/tr[3]/td[2]/table/tbody/tr[4]/td/input';
        await page.locator(`xpath=${loginButtonXPath}`).click();
        await page.waitForTimeout(2000);

        // Step 5: Enter B1 Number
        console.log(`  Step 5: Entering B1 Number: ${b1Number}...`);
        const b1NumberXPath = '/html/body/table[3]/tbody/tr/td/form/table/tbody/tr/td/table[8]/tbody/tr/td[2]/table/tbody/tr/td/table[2]/tbody/tr[2]/td[2]/table/tbody/tr/td/table/tbody/tr/td/table/tbody/tr/td[2]/table/tbody/tr[2]/td/input';
        await page.locator(`xpath=${b1NumberXPath}`).fill(b1Number);
        await page.waitForTimeout(500);

        // Step 6: Click Search button
        console.log(`  Step 6: Clicking Search button...`);
        const searchButtonXPath = '/html/body/table[3]/tbody/tr/td/form/table/tbody/tr/td/table[4]/tbody/tr/td[2]/table/tbody/tr/td[5]/input';
        await page.locator(`xpath=${searchButtonXPath}`).click();
        await page.waitForTimeout(2000);

        // Step 7: Wait for results table
        console.log(`  Step 7: Waiting for results table...`);
        const tableXPath = '/html/body/table[3]/tbody/tr/td/form/table[3]/tbody/tr/td[2]/div/table[2]/tbody/tr/td[1]/table[2]';
        await page.locator(`xpath=${tableXPath}`).waitFor({ state: 'visible', timeout: 10000 });

        // Take screenshot of results table
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const screenshotPath = path.join(screenshotsDir, `${b1Number}_${timestamp}_results.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`  📸 Screenshot saved: ${screenshotPath}`);

        // Step 8: Process rows
        console.log(`  Step 8: Processing service codes...`);
        const processResult = await processServiceCodes(page);

        // Take final screenshot after processing
        const finalScreenshotPath = path.join(screenshotsDir, `${b1Number}_${timestamp}_final.png`);
        await page.screenshot({ path: finalScreenshotPath, fullPage: true });
        console.log(`  📸 Final screenshot saved: ${finalScreenshotPath}`);

        await browser.close();

        return {
            success: true,
            message: `Processed ${processResult.processedCount} service code(s). ${processResult.details}`,
            details: processResult,
            screenshots: {
                results: `screenshots/${b1Number}_${timestamp}_results.png`,
                final: `screenshots/${b1Number}_${timestamp}_final.png`
            }
        };

    } catch (error) {
        console.error(`  Error during automation:`, error.message);
        
        // Take error screenshot if page exists
        if (page) {
            try {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const errorScreenshotPath = path.join(screenshotsDir, `${b1Number}_${timestamp}_error.png`);
                await page.screenshot({ path: errorScreenshotPath, fullPage: true });
                console.log(`  📸 Error screenshot saved: ${errorScreenshotPath}`);
            } catch (screenshotError) {
                console.error(`  Could not capture error screenshot: ${screenshotError.message}`);
            }
        }
        
        if (browser) {
            await browser.close();
        }

        return {
            success: false,
            message: `Automation failed: ${error.message}`
        };
    }
}

// Process service codes
async function processServiceCodes(page) {
    const serviceCodeXPaths = [
        '/html/body/table[3]/tbody/tr/td/form/table[3]/tbody/tr/td[2]/div/table[2]/tbody/tr/td[1]/table[2]/tbody/tr[2]/td[1]',
        '/html/body/table[3]/tbody/tr/td/form/table[3]/tbody/tr/td[2]/div/table[2]/tbody/tr/td[1]/table[2]/tbody/tr[3]/td[1]',
        '/html/body/table[3]/tbody/tr/td/form/table[3]/tbody/tr/td[2]/div/table[2]/tbody/tr/td[1]/table[2]/tbody/tr[4]/td[1]'
    ];
    
    const statusXPaths = [
        '/html/body/table[3]/tbody/tr/td/form/table[3]/tbody/tr/td[2]/div/table[2]/tbody/tr/td[1]/table[2]/tbody/tr[2]/td[5]',
        '/html/body/table[3]/tbody/tr/td/form/table[3]/tbody/tr/td[2]/div/table[2]/tbody/tr/td[1]/table[2]/tbody/tr[3]/td[5]',
        '/html/body/table[3]/tbody/tr/td/form/table[3]/tbody/tr/td[2]/div/table[2]/tbody/tr/td[1]/table[2]/tbody/tr[4]/td[5]'
    ];

    const viewChildrenXPaths = [
        '/html/body/table[3]/tbody/tr/td/form/table[3]/tbody/tr/td[2]/div/table[2]/tbody/tr/td[1]/table[2]/tbody/tr[2]/td[8]/input',
        '/html/body/table[3]/tbody/tr/td/form/table[3]/tbody/tr/td[2]/div/table[2]/tbody/tr/td[1]/table[2]/tbody/tr[3]/td[8]/input',
        '/html/body/table[3]/tbody/tr/td/form/table[3]/tbody/tr/td[2]/div/table[2]/tbody/tr/td[1]/table[2]/tbody/tr[4]/td[8]/input'
    ];

    // Collect rows
    const rows = [];
    for (let i = 0; i < statusXPaths.length; i++) {
        try {
            const serviceCodeElement = page.locator(`xpath=${serviceCodeXPaths[i]}`);
            const statusElement = page.locator(`xpath=${statusXPaths[i]}`);
            
            await serviceCodeElement.waitFor({ state: 'visible', timeout: 5000 });
            await statusElement.waitFor({ state: 'visible', timeout: 5000 });
            
            const serviceCode = (await serviceCodeElement.textContent()).trim();
            const status = (await statusElement.textContent()).trim();
            
            rows.push({
                index: i,
                serviceCode,
                status,
                viewChildrenXPath: viewChildrenXPaths[i]
            });
        } catch (error) {
            // Row not found, continue
        }
    }

    // Filter and sort rows
    const inProgressRows = rows.filter(row =>
        row.status.toLowerCase() === 'in progress' &&
        !row.serviceCode.toUpperCase().includes('BILL')
    );

    if (inProgressRows.length === 0) {
        return {
            processedCount: 0,
            details: 'No "In Progress" rows found'
        };
    }

    // Sort by priority
    inProgressRows.sort((a, b) => {
        const priorityA = categorizeServiceCode(a.serviceCode);
        const priorityB = categorizeServiceCode(b.serviceCode);
        return priorityA - priorityB;
    });

    let processedCount = 0;

    // Process each row
    for (const row of inProgressRows) {
        console.log(`    Processing: ${row.serviceCode}`);
        
        const viewChildrenButton = page.locator(`xpath=${row.viewChildrenXPath}`);
        await viewChildrenButton.click();
        await page.waitForTimeout(2000);

        // Select "All" from Block Size dropdown
        try {
            const blockSizeDropdownXPath = '/html/body/table[3]/tbody/tr/td/form/table[2]/tbody/tr/td/table[2]/tbody/tr/td[12]/select';
            const blockSizeDropdown = page.locator(`xpath=${blockSizeDropdownXPath}`);
            await blockSizeDropdown.waitFor({ state: 'visible', timeout: 10000 });
            await blockSizeDropdown.selectOption({ label: 'All' });
            await page.waitForTimeout(2000);
        } catch (error) {
            // Continue without changing block size
        }

        // Process child activities
        await processChildActivities(page);
        
        processedCount++;

        // Go back to main table if more rows to process
        if (row !== inProgressRows[inProgressRows.length - 1]) {
            const backLinkXPath = '/html/body/table[3]/tbody/tr/td/form/table[1]/tbody/tr/td/table[2]/tbody/tr/td[2]/table/tbody/tr/td/table/tbody/tr/td/a[2]';
            try {
                const backLink = page.locator(`xpath=${backLinkXPath}`);
                await backLink.waitFor({ state: 'visible', timeout: 10000 });
                await backLink.click();
                await page.waitForTimeout(2000);
            } catch (error) {
                await page.goBack();
                await page.waitForTimeout(2000);
            }
        }
    }

    return {
        processedCount,
        details: `Successfully processed ${processedCount} service code(s)`
    };
}

// Process child activities
async function processChildActivities(page) {
    const childTableXPath = '/html/body/table[3]/tbody/tr/td/form/table[3]/tbody/tr/td[2]/div/table[2]/tbody/tr/td[1]/table[2]';
    await page.locator(`xpath=${childTableXPath}`).waitFor({ state: 'visible', timeout: 10000 });

    let cycleCount = 0;
    const maxCycles = 50;
    const maxAttemptsPerRow = 2;
    const rowAttempts = {};

    while (cycleCount < maxCycles) {
        cycleCount++;
        
        await page.locator(`xpath=${childTableXPath}`).waitFor({ state: 'visible', timeout: 10000 });
        
        let foundInProgressChild = false;
        let rowIndex = 2;
        
        while (true) {
            try {
                const childStatusXPath = `/html/body/table[3]/tbody/tr/td/form/table[3]/tbody/tr/td[2]/div/table[2]/tbody/tr/td[1]/table[2]/tbody/tr[${rowIndex}]/td[4]`;
                const childStatusElement = page.locator(`xpath=${childStatusXPath}`);
                
                await childStatusElement.waitFor({ state: 'visible', timeout: 2000 });
                
                const childStatusText = (await childStatusElement.textContent()).trim();
                const normalizedStatus = childStatusText.toLowerCase().replace(/\s+/g, '-');
                
                if (normalizedStatus === 'in-progress') {
                    const attempts = rowAttempts[rowIndex] || 0;
                    
                    if (attempts >= maxAttemptsPerRow) {
                        rowIndex++;
                        continue;
                    }
                    
                    // Check if ID column contains an image
                    const idCellXPath = `/html/body/table[3]/tbody/tr/td/form/table[3]/tbody/tr/td[2]/div/table[2]/tbody/tr/td[1]/table[2]/tbody/tr[${rowIndex}]/td[2]`;
                    const idCellElement = page.locator(`xpath=${idCellXPath}`);
                    const hasImage = await idCellElement.locator('img').count() > 0;
                    
                    if (hasImage) {
                        rowIndex++;
                        continue;
                    }
                    
                    rowAttempts[rowIndex] = attempts + 1;
                    
                    // Click ID link
                    const idLinkXPath = `/html/body/table[3]/tbody/tr/td/form/table[3]/tbody/tr/td[2]/div/table[2]/tbody/tr/td[1]/table[2]/tbody/tr[${rowIndex}]/td[2]/a`;
                    const idLinkElement = page.locator(`xpath=${idLinkXPath}`);
                    await idLinkElement.click();
                    await page.waitForTimeout(2000);
                    
                    foundInProgressChild = true;
                    
                    // Check and select "COMPLETE" from dropdown
                    const dropdownXPath = '/html/body/table[3]/tbody/tr/td/form/table[4]/tbody/tr/td[2]/table/tbody/tr/td[1]/select';
                    
                    try {
                        const dropdown = page.locator(`xpath=${dropdownXPath}`);
                        await dropdown.waitFor({ state: 'visible', timeout: 10000 });
                        
                        const options = await dropdown.locator('option').allTextContents();
                        const completeOption = options.find(opt => opt.trim().toUpperCase() === 'COMPLETE');
                        
                        if (completeOption) {
                            await dropdown.selectOption({ value: 'COMPLETE' });
                            await page.waitForTimeout(1000);
                        }
                    } catch (error) {
                        // Continue
                    }
                    
                    // Return to child table
                    const returnLinkXPath = '/html/body/table[3]/tbody/tr/td/form/table[2]/tbody/tr/td[2]/table/tbody/tr/td/table/tbody/tr/td/a[3]';
                    try {
                        const returnLink = page.locator(`xpath=${returnLinkXPath}`);
                        await returnLink.waitFor({ state: 'visible', timeout: 10000 });
                        await returnLink.click();
                        await page.waitForTimeout(2000);
                    } catch (error) {
                        await page.goBack();
                        await page.waitForTimeout(2000);
                    }
                    
                    break;
                }
                
                rowIndex++;
            } catch (error) {
                break;
            }
        }
        
        if (!foundInProgressChild) {
            break;
        }
    }
}

// Categorize service code
function categorizeServiceCode(serviceCode) {
    const upperCode = serviceCode.toUpperCase();
    
    if (upperCode.includes('BILL')) {
        return 3;
    }
    
    if (/T\d+(MN|MC)/i.test(upperCode) || /D\d+N/i.test(upperCode)) {
        return 1;
    }
    
    if (upperCode.includes('MOD')) {
        return 2;
    }
    
    return 3;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve index.html for root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 Web Automation Server is running!`);
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
    console.log(`\nPress Ctrl+C to stop the server.\n`);
});


