const express = require('express');
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(__dirname));

// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'tapestry-automation-ui.html'));
});

// Serve screenshots
app.get('/screenshots/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(__dirname, filename);
    if (fs.existsSync(filepath)) {
        res.sendFile(filepath);
    } else {
        res.status(404).send('Screenshot not found');
    }
});

// Run automation endpoint
app.post('/run-automation', async (req, res) => {
    const { username, password, b1Number } = req.body;

    // Set up SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    function sendLog(message, level = 'info') {
        res.write(`data: ${JSON.stringify({ type: 'log', message, level })}\n\n`);
    }

    function sendStatus(message, level = 'info') {
        res.write(`data: ${JSON.stringify({ type: 'status', message, level })}\n\n`);
    }

    function sendScreenshot(screenshotPath) {
        res.write(`data: ${JSON.stringify({ type: 'screenshot', path: screenshotPath })}\n\n`);
    }

    function sendComplete() {
        res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
    }

    function sendError(message) {
        res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
    }

    let browser;

    try {
        sendLog('Launching browser...');
        browser = await chromium.launch({
            headless: false,
            slowMo: 500
        });

        const context = await browser.newContext({
            ignoreHTTPSErrors: true
        });

        const page = await context.newPage();

        sendLog('Navigating to login page...');
        sendStatus('Logging in...');
        await page.goto('https://caddla-4127.belldev.dev.bce.ca:9007/smweb_taptest05/Login', {
            waitUntil: 'networkidle',
            timeout: 60000
        });

        sendLog('Entering credentials...');
        const userIdXPath = '/html/body/table[3]/tbody/tr/td/form/table/tbody/tr/td/table[4]/tbody/tr/td[2]/table[2]/tbody/tr[3]/td[2]/table/tbody/tr[1]/td[2]/table/tbody/tr[3]/td/input';
        await page.locator(`xpath=${userIdXPath}`).fill(username);
        await page.waitForTimeout(500);

        const passwordXPath = '/html/body/table[3]/tbody/tr/td/form/table/tbody/tr/td/table[4]/tbody/tr/td[2]/table[2]/tbody/tr[3]/td[2]/table/tbody/tr[1]/td[2]/table/tbody/tr[6]/td/input';
        await page.locator(`xpath=${passwordXPath}`).fill(password);
        await page.waitForTimeout(500);

        sendLog('Clicking login button...');
        const loginButtonXPath = '/html/body/table[3]/tbody/tr/td/form/table/tbody/tr/td/table[4]/tbody/tr/td[2]/table[2]/tbody/tr[3]/td[2]/table/tbody/tr[4]/td/input';
        await page.locator(`xpath=${loginButtonXPath}`).click();
        await page.waitForTimeout(2000);

        sendLog(`Entering B1 Number: ${b1Number}...`);
        sendStatus('Searching for service orders...');
        const b1NumberXPath = '/html/body/table[3]/tbody/tr/td/form/table/tbody/tr/td/table[8]/tbody/tr/td[2]/table/tbody/tr/td/table[2]/tbody/tr[2]/td[2]/table/tbody/tr/td/table/tbody/tr/td/table/tbody/tr/td[2]/table/tbody/tr[2]/td/input';
        await page.locator(`xpath=${b1NumberXPath}`).fill(b1Number);
        await page.waitForTimeout(500);

        sendLog('Clicking search button...');
        const searchButtonXPath = '/html/body/table[3]/tbody/tr/td/form/table/tbody/tr/td/table[4]/tbody/tr/td[2]/table/tbody/tr/td[5]/input';
        await page.locator(`xpath=${searchButtonXPath}`).click();
        await page.waitForTimeout(2000);

        sendLog('Waiting for results table...');
        const tableXPath = '/html/body/table[3]/tbody/tr/td/form/table[3]/tbody/tr/td[2]/div/table[2]/tbody/tr/td[1]/table[2]';
        await page.locator(`xpath=${tableXPath}`).waitFor({ state: 'visible', timeout: 10000 });

        sendLog('Analyzing service codes and status...');
        sendStatus('Processing service orders...');

        // Get all rows
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

        const rows = [];
        for (let i = 0; i < statusXPaths.length; i++) {
            try {
                const serviceCodeElement = page.locator(`xpath=${serviceCodeXPaths[i]}`);
                const statusElement = page.locator(`xpath=${statusXPaths[i]}`);

                await serviceCodeElement.waitFor({ state: 'visible', timeout: 5000 });
                await statusElement.waitFor({ state: 'visible', timeout: 5000 });

                const serviceCodeText = await serviceCodeElement.textContent();
                const statusText = await statusElement.textContent();

                const serviceCode = serviceCodeText.trim();
                const status = statusText.trim();

                sendLog(`Row ${i + 2}: Service Code="${serviceCode}", Status="${status}"`);

                rows.push({
                    index: i,
                    rowNumber: i + 2,
                    serviceCode: serviceCode,
                    status: status,
                    viewChildrenXPath: viewChildrenXPaths[i]
                });
            } catch (error) {
                sendLog(`Could not read row ${i + 2}: ${error.message}`, 'warning');
            }
        }

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

        const inProgressRows = rows.filter(row =>
            row.status.toLowerCase() === 'in progress' &&
            !row.serviceCode.toUpperCase().includes('BILL')
        );

        inProgressRows.sort((a, b) => {
            const priorityA = categorizeServiceCode(a.serviceCode);
            const priorityB = categorizeServiceCode(b.serviceCode);
            return priorityA - priorityB;
        });

        sendLog('Processing order:');
        inProgressRows.forEach((row, idx) => {
            const priority = categorizeServiceCode(row.serviceCode);
            const priorityLabel = priority === 1 ? 'TxxMN/TxxMC/DxxN' : priority === 2 ? 'MOD' : 'Other';
            sendLog(`  ${idx + 1}. Row ${row.rowNumber}: ${row.serviceCode} (Priority: ${priorityLabel})`);
        });

        let foundInProgress = false;

        for (let rowIdx = 0; rowIdx < inProgressRows.length; rowIdx++) {
            const selectedRow = inProgressRows[rowIdx];
            const priority = categorizeServiceCode(selectedRow.serviceCode);
            const priorityLabel = priority === 1 ? 'TxxMN/TxxMC/DxxN' : priority === 2 ? 'MOD' : 'Other';

            sendLog(`Processing ${priorityLabel} Row: ${selectedRow.rowNumber} - "${selectedRow.serviceCode}"`, 'info');
            sendStatus(`Processing ${selectedRow.serviceCode}...`);

            const viewChildrenButton = page.locator(`xpath=${selectedRow.viewChildrenXPath}`);
            await viewChildrenButton.click();
            await page.waitForTimeout(2000);

            foundInProgress = true;
            sendLog('Clicked "View Children" button', 'success');

            // Select "All" from Block Size dropdown
            const blockSizeDropdownXPath = '/html/body/table[3]/tbody/tr/td/form/table[2]/tbody/tr/td/table[2]/tbody/tr/td[12]/select';

            try {
                const blockSizeDropdown = page.locator(`xpath=${blockSizeDropdownXPath}`);
                await blockSizeDropdown.waitFor({ state: 'visible', timeout: 10000 });
                await blockSizeDropdown.selectOption({ label: 'All' });
                await page.waitForTimeout(2000);
                sendLog('Selected "All" from Block Size dropdown', 'success');
            } catch (error) {
                sendLog(`Could not find Block Size dropdown: ${error.message}`, 'warning');
            }

            const childTableXPath = '/html/body/table[3]/tbody/tr/td/form/table[3]/tbody/tr/td[2]/div/table[2]/tbody/tr/td[1]/table[2]';
            await page.locator(`xpath=${childTableXPath}`).waitFor({ state: 'visible', timeout: 10000 });

            // Check for "Get NM1 Discount AT248"
            sendLog('Checking for "Get NM1 Discount AT248"...');
            let foundNM1Discount = false;
            let nm1RowIndex = 2;

            while (true) {
                try {
                    const nameColumnXPath = `/html/body/table[3]/tbody/tr/td/form/table[3]/tbody/tr/td[2]/div/table[2]/tbody/tr/td[1]/table[2]/tbody/tr[${nm1RowIndex}]/td[1]`;
                    const nameElement = page.locator(`xpath=${nameColumnXPath}`);

                    await nameElement.waitFor({ state: 'visible', timeout: 2000 });
                    const nameText = await nameElement.textContent();
                    const trimmedName = nameText.trim();

                    if (trimmedName.includes('Get NM1 Discount AT248')) {
                        sendLog(`Found "Get NM1 Discount AT248" in row ${nm1RowIndex}`, 'success');
                        foundNM1Discount = true;

                        const nm1IdLinkXPath = `/html/body/table[3]/tbody/tr/td/form/table[3]/tbody/tr/td[2]/div/table[2]/tbody/tr/td[1]/table[2]/tbody/tr[${nm1RowIndex}]/td[2]/a`;
                        const nm1IdLink = page.locator(`xpath=${nm1IdLinkXPath}`);

                        await nm1IdLink.click();
                        await page.waitForTimeout(2000);
                        sendLog('Clicked ID link for NM1 Discount', 'success');

                        // Click "Remove Time Constraint"
                        try {
                            const removeTimeConstraintButton = page.locator('input[name="btnRemoveTimeConstraint"]');
                            await removeTimeConstraintButton.waitFor({ state: 'visible', timeout: 10000 });
                            await removeTimeConstraintButton.scrollIntoViewIfNeeded();
                            await page.waitForTimeout(500);
                            await removeTimeConstraintButton.click();
                            await page.waitForTimeout(2000);
                            sendLog('Clicked "Remove Time Constraint" button', 'success');
                        } catch (error) {
                            sendLog(`Trying XPath for Remove Time Constraint button`, 'warning');
                            const removeTimeConstraintXPath = '/html/body/table[3]/tbody/tr/td/form/table[5]/tbody/tr/td[2]/table/tbody/tr/td[3]/table/tbody/tr/td/input[2]';
                            const removeTimeConstraintButton = page.locator(`xpath=${removeTimeConstraintXPath}`);
                            await removeTimeConstraintButton.waitFor({ state: 'visible', timeout: 10000 });
                            await removeTimeConstraintButton.scrollIntoViewIfNeeded();
                            await page.waitForTimeout(500);
                            await removeTimeConstraintButton.click();
                            await page.waitForTimeout(2000);
                            sendLog('Clicked "Remove Time Constraint" button using XPath', 'success');
                        }

                        // Return to child table
                        const returnLinkXPath = '/html/body/table[3]/tbody/tr/td/form/table[2]/tbody/tr/td[2]/table/tbody/tr/td/table/tbody/tr/td/a[3]';
                        try {
                            const returnLink = page.locator(`xpath=${returnLinkXPath}`);
                            await returnLink.waitFor({ state: 'visible', timeout: 5000 });
                            await returnLink.click();
                            await page.waitForTimeout(2000);
                            sendLog('Returned to child activities table', 'success');
                        } catch (error) {
                            await page.goBack();
                            await page.waitForTimeout(2000);
                        }

                        break;
                    }

                    nm1RowIndex++;
                } catch (error) {
                    sendLog(`No "Get NM1 Discount AT248" found (checked up to row ${nm1RowIndex - 1})`);
                    break;
                }
            }

            if (foundNM1Discount) {
                await page.locator(`xpath=${childTableXPath}`).waitFor({ state: 'visible', timeout: 10000 });
            }

            // Process In-Progress items
            sendLog('Processing "In-Progress" items...');
            let cycleCount = 0;
            const maxCycles = 50;
            const maxAttemptsPerRow = 2;
            const rowAttempts = {};

            while (cycleCount < maxCycles) {
                cycleCount++;
                sendLog(`Cycle ${cycleCount}`);

                await page.locator(`xpath=${childTableXPath}`).waitFor({ state: 'visible', timeout: 10000 });

                let foundInProgressChild = false;
                let rowIndex = 2;

                while (true) {
                    try {
                        const childStatusXPath = `/html/body/table[3]/tbody/tr/td/form/table[3]/tbody/tr/td[2]/div/table[2]/tbody/tr/td[1]/table[2]/tbody/tr[${rowIndex}]/td[4]`;
                        const childStatusElement = page.locator(`xpath=${childStatusXPath}`);

                        await childStatusElement.waitFor({ state: 'visible', timeout: 2000 });

                        const childStatusText = await childStatusElement.textContent();
                        const trimmedChildStatus = childStatusText.trim();

                        const normalizedStatus = trimmedChildStatus.toLowerCase().replace(/\s+/g, '-');
                        if (normalizedStatus === 'in-progress') {
                            const attempts = rowAttempts[rowIndex] || 0;

                            if (attempts >= maxAttemptsPerRow) {
                                sendLog(`Row ${rowIndex} already attempted ${attempts} times. Skipping.`, 'warning');
                                rowIndex++;
                                continue;
                            }

                            sendLog(`Found "In-Progress" in row ${rowIndex} (Attempt ${attempts + 1}/${maxAttemptsPerRow})`);

                            // Check for image
                            const idCellXPath = `/html/body/table[3]/tbody/tr/td/form/table[3]/tbody/tr/td[2]/div/table[2]/tbody/tr/td[1]/table[2]/tbody/tr[${rowIndex}]/td[2]`;
                            const idCellElement = page.locator(`xpath=${idCellXPath}`);
                            const hasImage = await idCellElement.locator('img').count() > 0;

                            if (hasImage) {
                                sendLog(`Row ${rowIndex} ID column contains an image. Skipping.`, 'warning');
                                rowIndex++;
                                continue;
                            }

                            rowAttempts[rowIndex] = attempts + 1;

                            const idLinkXPath = `/html/body/table[3]/tbody/tr/td/form/table[3]/tbody/tr/td[2]/div/table[2]/tbody/tr/td[1]/table[2]/tbody/tr[${rowIndex}]/td[2]/a`;
                            const idLinkElement = page.locator(`xpath=${idLinkXPath}`);

                            await idLinkElement.click();
                            await page.waitForTimeout(2000);

                            foundInProgressChild = true;
                            sendLog('Clicked ID link', 'success');

                            // Check dropdown
                            const dropdownXPath = '/html/body/table[3]/tbody/tr/td/form/table[4]/tbody/tr/td[2]/table/tbody/tr/td[1]/select';

                            try {
                                const dropdown = page.locator(`xpath=${dropdownXPath}`);
                                await dropdown.waitFor({ state: 'visible', timeout: 10000 });

                                const options = await dropdown.locator('option').allTextContents();
                                const completeOption = options.find(opt => opt.trim().toUpperCase() === 'COMPLETE');

                                if (completeOption) {
                                    await dropdown.selectOption({ value: 'COMPLETE' });
                                    await page.waitForTimeout(1000);
                                    sendLog('Selected "COMPLETE" from dropdown', 'success');

                                    const returnLinkXPath = '/html/body/table[3]/tbody/tr/td/form/table[2]/tbody/tr/td[2]/table/tbody/tr/td/table/tbody/tr/td/a[3]';
                                    const returnLink = page.locator(`xpath=${returnLinkXPath}`);

                                    await returnLink.waitFor({ state: 'visible', timeout: 10000 });
                                    await returnLink.click();
                                    await page.waitForTimeout(2000);
                                } else {
                                    sendLog('"COMPLETE" option not found', 'warning');
                                    const returnLinkXPath = '/html/body/table[3]/tbody/tr/td/form/table[2]/tbody/tr/td[2]/table/tbody/tr/td/table/tbody/tr/td/a[3]';
                                    const returnLink = page.locator(`xpath=${returnLinkXPath}`);
                                    await returnLink.waitFor({ state: 'visible', timeout: 10000 });
                                    await returnLink.click();
                                    await page.waitForTimeout(2000);
                                }
                            } catch (error) {
                                sendLog(`Error with dropdown: ${error.message}`, 'error');
                                try {
                                    const returnLinkXPath = '/html/body/table[3]/tbody/tr/td/form/table[2]/tbody/tr/td[2]/table/tbody/tr/td/table/tbody/tr/td/a[3]';
                                    const returnLink = page.locator(`xpath=${returnLinkXPath}`);
                                    await returnLink.waitFor({ state: 'visible', timeout: 5000 });
                                    await returnLink.click();
                                    await page.waitForTimeout(2000);
                                } catch (linkError) {
                                    await page.goBack();
                                    await page.waitForTimeout(2000);
                                }
                            }

                            break;
                        }

                        rowIndex++;
                    } catch (error) {
                        sendLog(`No more rows to check (checked up to row ${rowIndex - 1})`);
                        break;
                    }
                }

                if (!foundInProgressChild) {
                    sendLog('No more "In-Progress" items found', 'success');
                    break;
                }
            }

            if (cycleCount >= maxCycles) {
                sendLog(`Reached maximum cycle limit (${maxCycles})`, 'warning');
            }

            // Go back to main table if more rows
            if (rowIdx < inProgressRows.length - 1) {
                sendLog('Returning to main table for next service code...');
                const backLinkXPath = '/html/body/table[3]/tbody/tr/td/form/table[1]/tbody/tr/td/table[2]/tbody/tr/td[2]/table/tbody/tr/td/table/tbody/tr/td/a[2]';

                try {
                    const backLink = page.locator(`xpath=${backLinkXPath}`);
                    await backLink.waitFor({ state: 'visible', timeout: 10000 });
                    await backLink.click();
                    await page.waitForTimeout(2000);
                    sendLog('Returned to main table', 'success');
                } catch (error) {
                    await page.goBack();
                    await page.waitForTimeout(2000);
                }

                await page.locator(`xpath=${tableXPath}`).waitFor({ state: 'visible', timeout: 10000 });
            }
        }

        if (inProgressRows.length === 0) {
            sendLog('No "In Progress" rows found with valid service codes', 'warning');
        }

        if (!foundInProgress) {
            sendLog('No rows with "In Progress" status found', 'warning');
        }

        // Take final screenshot
        sendLog('Taking final screenshot...');
        sendStatus('Capturing final result...');
        const screenshotPath = 'tapestry-automation-result.png';
        await page.screenshot({ path: screenshotPath, fullPage: true });
        sendLog('Screenshot saved', 'success');
        sendScreenshot(`/screenshots/${screenshotPath}`);

        await page.waitForTimeout(3000);

        await browser.close();
        sendLog('Browser closed', 'success');
        sendComplete();
        res.end();

    } catch (error) {
        sendError(error.message);
        sendLog(`Fatal error: ${error.message}`, 'error');
        
        if (browser) {
            await browser.close();
        }
        
        res.end();
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Tapestry Automation Server running at http://localhost:${PORT}`);
    console.log(`📝 Open your browser and navigate to http://localhost:${PORT}`);
});

// Made with Bob
