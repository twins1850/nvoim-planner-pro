const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();
  const page = contexts[0].pages()[0];
  
  // Click the Run button
  await page.getByTestId('sql-run-button').click();
  
  // Wait for execution to complete
  await page.waitForTimeout(2000);
  
  console.log('SQL executed');
  
  await browser.close();
})();
