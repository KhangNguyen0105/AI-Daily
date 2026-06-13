---
status: complete
phase: 03-pricing-comparison-table
source: 03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md
started: 2026-06-13T14:00:00Z
updated: 2026-06-13T14:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Provider Logos Display
expected: Open the pricing table at localhost:3000. Each row should show a provider logo image next to the provider name. Providers without a logo file should display a colored initial circle (first letter of provider name). Logos should have consistent 6x6 sizing with rounded corners.
result: pass

### 2. Global Search
expected: Type a model name (e.g., "GPT-4") in the search box. The table should filter in real-time to show only matching rows. The filtered row count should update (e.g., "Showing 3 of 34 models"). Clearing the search should restore all rows.
result: pass

### 3. Provider Dropdown Filter
expected: Click the "All Providers" dropdown. It should list all unique providers from the data. Select one provider (e.g., "OpenAI"). The table should filter to show only that provider's models. The row count should update accordingly.
result: pass

### 4. Active Filter Summary
expected: Apply at least one filter (search, provider, or price range). An "Filters" section should appear below the filter bar showing active filter pills (e.g., "Provider: OpenAI ×"). Click the × on a pill to remove that filter. Click "Clear all" to remove all filters at once.
result: pass

### 5. Currency Toggle USD→VND
expected: Click the "₫ VND" button in the currency toggle. All price columns should convert from USD to VND using the dynamic exchange rate from the database. Price headers should change from "($/1M)" to "(₫/1M)". VND values should show dot thousands separator and ₫ symbol (e.g., "1.275.000 ₫").
result: pass

### 6. Currency Toggle VND→USD
expected: With VND active, click the "$ USD" button. All prices should convert back to USD format (e.g., "$50.00"). The toggle should highlight the active button with blue background.
result: pass

### 7. Exchange Rate Fallback Chain
expected: The system fetches USD/VND rate from open.er-api.com during the daily pipeline. If the API is down, it uses the most recent rate from the exchange_rates DB table. If the table is empty, it falls back to the hardcoded rate of 25,500. The frontend always receives a valid rate via page.tsx server component.
result: pass

### 8. Confidence Badges
expected: Each row should show a confidence badge (green "high", yellow "medium", or red "low"). Hovering over a badge should show a tooltip explaining what the confidence level means.
result: pass

### 9. Source Links
expected: Each row should have a clickable source link. Clicking should open the source URL in a new tab. URLs should only be http/https (no javascript: or other schemes).
result: pass

### 10. Mobile Responsiveness
expected: Resize the browser to a mobile width (< 768px). The table should hide the Family and Context columns. Further narrowing (< 640px) should hide Source column. The table should remain horizontally scrollable with a sticky header.
result: pass

### 11. Sorting
expected: Click any column header (e.g., "Model" or "Input Price"). The table should sort by that column with an arrow indicator (▲ ascending). Click again to reverse sort (▼ descending).
result: pass

### 12. Pagination Controls
expected: If there are more than 50 models, pagination controls should appear below the table showing "Page 1 of N" with Previous/Next buttons. Clicking "Next" should advance to page 2. Changing filters should reset to page 1.
result: pass

## Summary

total: 12
passed: 12
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[issues fixed - see code changes above]
