# Optimization Task List - Zoho CRM Widget

**Goal:** Improve project score from 62/100 to 85+/100 by addressing critical and optimization issues.

**Estimated Timeline:** 2-3 weeks of focused development

---

## 🔴 CRITICAL PRIORITY (Week 1 - Days 1-3)

### Task 1: Fix SDK Initialization
**File:** `src/App.jsx:23-32`  
**Current Score Impact:** -4 points (SDK Implementation)  
**Expected Improvement:** +3 points

**Implementation:**
```javascript
// Add error state
const [initError, setInitError] = useState(null);

useEffect(() => {
  // Check if ZOHO SDK is available
  if (typeof window.ZOHO === 'undefined' || !window.ZOHO?.embeddedApp) {
    const error = 'Zoho SDK not loaded. Please refresh the page.';
    console.error(error);
    setInitError(error);
    return;
  }

  ZOHO.embeddedApp.init()
    .then(() => {
      setZohoLoaded(true);
      return ZOHO.CRM.CONFIG.getCurrentUser();
    })
    .then((data) => {
      setLoggedInUser(data?.users?.[0] || null);
    })
    .catch((error) => {
      console.error('Failed to initialize Zoho SDK:', error);
      setInitError('Failed to initialize Zoho widget. Please try refreshing.');
    });
}, []);
```

**Testing:**
- Test with SDK loaded
- Test with SDK not loaded (simulate slow network)
- Test error scenarios

---

### Task 2: Fix Infinite Loop Risk
**File:** `src/App.jsx:254`  
**Current Score Impact:** -2 points (Performance)  
**Expected Improvement:** +2 points

**Implementation:**
```javascript
useEffect(() => {
  async function getData() {
    // Check cache before making API calls
    if (cache[filterDate]) {
      setEvents(cache[filterDate]);
      setLoading(false);
      return;
    }

    if (!zohoLoaded) return; // Guard clause

    // ... rest of data fetching ...
    setCache((prevCache) => ({
      ...prevCache,
      [filterDate]: sortedUniqueEvents,
    }));
  }
  getData();
  // Remove cache from dependencies
}, [zohoLoaded, filterDate, customDateRange]); // ✅ Removed cache
```

**Testing:**
- Verify cache still works correctly
- Check that changing filterDate triggers new fetch
- Ensure no infinite loops in console

---

### Task 3: Remove Dead Code Blocking Functionality
**File:** `src/components/CreateActivityModal.jsx:484-488`  
**Current Score Impact:** -3 points (Code Quality)  
**Expected Improvement:** +3 points

**Implementation:**
```javascript
} else {
  const transformedData = transformFormSubmission(formData);
  
  // Remove console.log and return statement
  try {
    const data = await ZOHO.CRM.API.insertRecord({
      Entity: "Events",
      APIData: transformedData,
      Trigger: ["workflow"],
    });

    const wasSuccessful =
      data.data && data.data.length > 0 && data.data[0].code === "SUCCESS";

    await logResponse({
      name: `Event for ${
        formData.scheduledWith?.[0]?.name || "Single Contact"
      }`,
      payload: transformedData,
      response: data,
      result: wasSuccessful ? "Success" : "Error",
      trigger: "Record Create",
      meetingType: formData.Meeting_Type || "",
      Widget_Source: "All Activities",
    });

    if (wasSuccessful) {
      const createdEvent = data.data[0].details;
      setEvents((prev) => [
        { ...transformedData, id: createdEvent.id },
        ...prev,
      ]);
      setSelectedRowIndex(createdEvent.id);
      setHighlightedRow(createdEvent.id);
      setSnackbarSeverity("success");
      setSnackbarMessage("Event Created Successfully");
      setSnackbarOpen(true);
      if (transformedData?.Recurring_Activity?.RRULE !== null) {
        window.location.reload();
      }
      setTimeout(() => {
        handleClose();
      }, 1000);
    } else {
      throw new Error("Failed to create event");
    }
  } catch (error) {
    await logResponse({
      name: `Event for ${
        formData.scheduledWith?.[0]?.name || "Single Contact"
      }`,
      payload: transformedData,
      response: { error: error.message },
      result: "Error",
      trigger: "Record Create",
      meetingType: formData.Meeting_Type || "",
      Widget_Source: "All Activities",
    });
    console.error("Error submitting the form:", error);
    setSnackbarSeverity("error");
    setSnackbarMessage("Error creating event.");
    setSnackbarOpen(true);
  }
}
```

**Testing:**
- Create single event (not multi-contact)
- Verify event appears in table
- Test error scenarios

---

### Task 4: Optimize Data Fetching Strategy
**File:** `src/App.jsx:190-229`  
**Current Score Impact:** -3 points (Performance)  
**Expected Improvement:** +3 points

**Implementation:**
```javascript
// Remove the redundant getAllRecords() call
// The search API already returns filtered results

if (filterDate === "Custom Range") {
  setEvents(eventsData);
} else {
  // eventsData already contains filtered results from search API
  // Just deduplicate and sort
  const uniqueEventsMap = new Map();
  eventsData.forEach((event) => {
    if (!uniqueEventsMap.has(event.id)) {
      uniqueEventsMap.set(event.id, event);
    }
  });
  const uniqueEvents = Array.from(uniqueEventsMap.values());

  // Sort events by `Start_DateTime`
  const sortedUniqueEvents = uniqueEvents.sort((a, b) => {
    return new Date(a.Start_DateTime) - new Date(b.Start_DateTime);
  });

  // Cache and update state
  setCache((prevCache) => ({
    ...prevCache,
    [filterDate]: sortedUniqueEvents,
  }));

  setEvents(sortedUniqueEvents);
}
```

**Testing:**
- Verify all date filters still work
- Check network tab for reduced API calls
- Verify performance improvement with large datasets

---

### Task 5: Add Error Boundaries
**File:** Create new `src/components/ErrorBoundary.jsx`  
**Current Score Impact:** -2 points (Error Handling)  
**Expected Improvement:** +2 points

**Implementation:**
```javascript
import React from 'react';
import { Box, Typography, Button } from '@mui/material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            p: 3,
          }}
        >
          <Typography variant="h5" gutterBottom>
            Something went wrong
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Typography>
          <Button variant="contained" onClick={this.handleReset}>
            Reload Widget
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

**Usage in App.jsx:**
```javascript
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  // ... existing code ...
  
  return (
    <ErrorBoundary>
      <ZohoContext.Provider>
        {/* ... rest of app ... */}
      </ZohoContext.Provider>
    </ErrorBoundary>
  );
}
```

**Testing:**
- Simulate errors in components
- Verify error boundary catches and displays error
- Test reset functionality

---

### Task 6: Improve Pagination Error Handling
**File:** `src/App.jsx:124-160`  
**Current Score Impact:** -1 point (Error Handling)  
**Expected Improvement:** +1 point

**Implementation:**
```javascript
// Add error state
const [paginationErrors, setPaginationErrors] = useState([]);

// In pagination loop:
let allEventsData = [];
let currentPage = 1;
let hasMoreRecords = true;
let recordsPerPage = 100;
const errors = [];

while (hasMoreRecords && currentPage < 11) {
  const req_data_meetings = {
    // ... existing request ...
  };

  try {
    const data = await ZOHO.CRM.CONNECTION.invoke(
      "zoho_crm_conn",
      req_data_meetings
    );

    const pageEventsData = data?.details?.statusMessage?.data || [];
    const moreRecords = data?.details?.statusMessage?.info?.more_records || false;

    allEventsData = [...allEventsData, ...pageEventsData];
    hasMoreRecords = moreRecords;
    currentPage++;
  } catch (error) {
    console.error(`Error fetching page ${currentPage}:`, error);
    errors.push({ page: currentPage, error: error.message });
    // Continue with next page instead of stopping
    hasMoreRecords = false;
  }
}

if (errors.length > 0) {
  setPaginationErrors(errors);
  // Show notification to user
  console.warn('Some pages failed to load:', errors);
}
```

**Testing:**
- Simulate network errors during pagination
- Verify partial data is still displayed
- Check error notifications appear

---

## 🟡 HIGH PRIORITY (Week 1 - Days 4-5)

### Task 7: Remove Console.log Statements
**Files:** Multiple files  
**Current Score Impact:** -1 point (Code Quality)  
**Expected Improvement:** +1 point

**Implementation:**
Create utility: `src/utils/logger.js`
```javascript
const isDevelopment = import.meta.env.DEV;

export const logger = {
  log: (...args) => {
    if (isDevelopment) console.log(...args);
  },
  error: (...args) => {
    if (isDevelopment) console.error(...args);
  },
  warn: (...args) => {
    if (isDevelopment) console.warn(...args);
  },
};
```

**Replace all console.log with logger.log:**
- `App.jsx:142,154,162`
- `ActivityTable.jsx:471,572`
- `CreateActivityModal.jsx:486`
- All other files

---

### Task 8: Fix useMemo Dependencies
**File:** `src/components/ActivityTable.jsx:460-470`  
**Current Score Impact:** -1 point (Performance)  
**Expected Improvement:** +1 point

**Implementation:**
```javascript
const filteredRows = React.useMemo(() => {
  return rows.filter((row) => {
    // ... filtering logic ...
  });
}, [
  rows,
  filterType,
  filterPriority,
  filterUser,
  customDateRange,
  filterDate,
  showCleared,
  // Remove order and orderBy - they're not used in filtering
]);
```

---

### Task 9: Memoize Sorted Results
**File:** `src/components/ActivityTable.jsx:882`  
**Current Score Impact:** -1 point (Performance)  
**Expected Improvement:** +1 point

**Implementation:**
```javascript
const sortedRows = React.useMemo(() => {
  return [...filteredRows].sort(getComparator(order, orderBy));
}, [filteredRows, order, orderBy]);

// Then use sortedRows instead of sorting inline
{sortedRows.map((row, index) => (
  // ... render row ...
))}
```

---

### Task 10: Extract Hardcoded URLs
**Files:** `ActivityTable.jsx:981`, `ClearActivityModal.jsx:603`  
**Current Score Impact:** -1 point (Code Quality)  
**Expected Improvement:** +1 point

**Implementation:**
Create `src/config/constants.js`:
```javascript
export const ZOHO_CONFIG = {
  CRM_BASE_URL: import.meta.env.VITE_ZOHO_CRM_URL || 'https://crm.zoho.com.au',
  ORG_ID: import.meta.env.VITE_ZOHO_ORG_ID || 'org7004396182',
  CANVAS_ID: import.meta.env.VITE_ZOHO_CANVAS_ID || '76775000000287551',
};

export const getContactUrl = (contactId) => {
  return `${ZOHO_CONFIG.CRM_BASE_URL}/crm/${ZOHO_CONFIG.ORG_ID}/tab/Contacts/${contactId}/canvas/${ZOHO_CONFIG.CANVAS_ID}`;
};

export const getHistoryUrl = (historyId) => {
  return `${ZOHO_CONFIG.CRM_BASE_URL}/crm/${ZOHO_CONFIG.ORG_ID}/tab/CustomModule4/${historyId}`;
};
```

**Usage:**
```javascript
import { getContactUrl, getHistoryUrl } from '../config/constants';

// Replace hardcoded URLs
href={getContactUrl(participant.participant)}
href={getHistoryUrl(existingHistory[0].id)}
```

---

### Task 11: Parallelize API Calls
**File:** `src/App.jsx:232-243`  
**Current Score Impact:** -1 point (Performance)  
**Expected Improvement:** +1 point

**Implementation:**
```javascript
// Instead of sequential calls:
// const orgVar = await ZOHO.CRM.API.getOrgVariable("recent_colors");
// const usersResponse = await ZOHO.CRM.API.getAllRecords({...});

// Use Promise.all for parallel execution:
const [orgVar, usersResponse] = await Promise.all([
  ZOHO.CRM.API.getOrgVariable("recent_colors"),
  ZOHO.CRM.API.getAllRecords({
    Entity: "users",
    sort_order: "asc",
    per_page: 100,
    page: 1,
  }),
]);

const colorsArray = JSON.parse(orgVar?.Success?.Content || "[]");
setRecentColor(colorsArray);
setUsers(usersResponse.users);
```

---

### Task 12: Add Loading States
**Files:** `EditActivityModal.jsx`, other modals  
**Current Score Impact:** -1 point (UI/UX)  
**Expected Improvement:** +1 point

**Implementation:**
```javascript
// In EditActivityModal.jsx
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async () => {
  setIsSubmitting(true);
  try {
    // ... existing submit logic ...
  } catch (error) {
    // ... error handling ...
  } finally {
    setIsSubmitting(false);
  }
};

// In render:
<Button
  onClick={handleSubmit}
  disabled={isSubmitting}
>
  {isSubmitting ? <CircularProgress size={20} /> : 'Update'}
</Button>
```

---

## 🟢 MEDIUM PRIORITY (Week 2)

### Task 13: Create Centralized Error Handler
**File:** Create `src/utils/errorHandler.js`

**Implementation:**
```javascript
export const handleZohoError = (error, context = '') => {
  const errorMessage = error?.message || error?.details?.message || 'An unexpected error occurred';
  
  // Log for debugging
  console.error(`Zoho API Error [${context}]:`, error);
  
  // Return user-friendly message
  return {
    message: errorMessage,
    userMessage: getUserFriendlyMessage(error),
    shouldRetry: isRetryableError(error),
  };
};

const getUserFriendlyMessage = (error) => {
  // Map technical errors to user-friendly messages
  if (error?.code === 'AUTHENTICATION_FAILURE') {
    return 'Your session has expired. Please refresh the page.';
  }
  if (error?.code === 'RATE_LIMIT_EXCEEDED') {
    return 'Too many requests. Please wait a moment and try again.';
  }
  return 'Something went wrong. Please try again or contact support.';
};

const isRetryableError = (error) => {
  const retryableCodes = ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMIT_EXCEEDED'];
  return retryableCodes.includes(error?.code);
};
```

---

### Task 14: Remove Commented Code
**Files:** `App.jsx:168-188`, `CreateActivityModal.jsx:332`

**Action:** Delete all commented code blocks. If code needs to be preserved, move to a separate `ARCHIVE.md` file.

---

### Task 15: Extract Magic Numbers
**File:** Create `src/config/constants.js`

**Implementation:**
```javascript
export const PAGINATION = {
  RECORDS_PER_PAGE: 100,
  MAX_PAGES: 10,
};

export const DATE_RANGES = {
  DEFAULT_START_YEAR: 2023,
  DEFAULT_START_MONTH: 0, // January
  DEFAULT_START_DAY: 1,
  DEFAULT_DAYS_BACK: 29, // Last 30 days
  FUTURE_YEARS_AHEAD: 1,
};

export const TIMEZONE = {
  OFFSET: '+11:00', // Australia/Adelaide
};
```

---

### Task 16: Fix Naming Inconsistencies
**File:** `src/App.jsx:19`

**Implementation:**
```javascript
// Fix typo: setRecentColor should be consistent
const [recentColors, setRecentColors] = useState(""); // Plural and consistent
```

Update all references throughout codebase.

---

### Task 17: Add PropTypes
**File:** Install and configure PropTypes

**Implementation:**
```bash
npm install prop-types
```

```javascript
import PropTypes from 'prop-types';

ActivityTable.propTypes = {
  events: PropTypes.arrayOf(PropTypes.object).isRequired,
  ZOHO: PropTypes.object.isRequired,
  users: PropTypes.array.isRequired,
  // ... other props
};
```

---

### Task 18: Remove Unused Code
**Files:** Multiple

**Action:** 
- Remove `isModalOpen` from App.jsx:22
- Run ESLint to find unused imports
- Remove any unused variables

---

### Task 19: Add Cleanup Functions
**Files:** All components with useEffect and async operations

**Implementation:**
```javascript
useEffect(() => {
  let isMounted = true;
  
  async function fetchData() {
    const data = await someAsyncOperation();
    if (isMounted) {
      setData(data);
    }
  }
  
  fetchData();
  
  return () => {
    isMounted = false;
  };
}, []);
```

---

### Task 20: Improve Error Messages
**Files:** All error handling locations

**Action:** Replace generic error messages with actionable ones:
- "Failed to load events" → "Unable to load events. Please check your connection and try again."
- "Error creating event" → "Event creation failed. Please verify all required fields are filled and try again."

---

## 🔵 LOW PRIORITY (Week 3)

### Task 21: Enable ESLint exhaustive-deps
**File:** `.eslintrc.js` or `eslint.config.js`

**Implementation:**
```javascript
{
  rules: {
    'react-hooks/exhaustive-deps': 'warn',
  },
}
```

---

### Task 22: Optimize Context Usage
**File:** `src/App.jsx`

**Action:** Review ZohoContext and split if needed:
- Create separate contexts for different concerns
- Use React.memo for context consumers

---

### Task 23: Add ARIA Labels
**Files:** All interactive components

**Implementation:**
```javascript
<Button
  aria-label="Create new activity"
  aria-describedby="create-activity-description"
>
  Create New Activity
</Button>
```

---

### Task 24: Document API Methods
**File:** Create `docs/API_USAGE.md`

**Action:** Document why both `ZOHO.CRM.API.*` and `CONNECTION.invoke()` are used.

---

### Task 25: Add Response Validation
**File:** Create `src/utils/responseValidator.js`

**Implementation:**
```javascript
export const validateZohoResponse = (response, expectedStructure) => {
  if (!response || !response.data) {
    throw new Error('Invalid response structure');
  }
  // Add more validation logic
  return response;
};
```

---

## 📊 Expected Score Improvements

| Category | Current | After Critical | After High | After All | Improvement |
|----------|---------|---------------|------------|-----------|-------------|
| SDK Implementation | 6/10 | 9/10 | 9/10 | 9/10 | +3 |
| React Best Practices | 7/10 | 7/10 | 8/10 | 9/10 | +2 |
| Code Quality | 6/10 | 7/10 | 8/10 | 9/10 | +3 |
| Performance | 5/10 | 7/10 | 9/10 | 9/10 | +4 |
| Error Handling | 5/10 | 7/10 | 7/10 | 8/10 | +3 |
| Maintainability | 6/10 | 7/10 | 8/10 | 9/10 | +3 |
| Zoho Integration | 7/10 | 7/10 | 8/10 | 9/10 | +2 |
| **TOTAL** | **42/70** | **51/70** | **57/70** | **62/70** | **+20** |
| **PERCENTAGE** | **62%** | **73%** | **81%** | **89%** | **+27%** |

---

## 🎯 Success Criteria

- ✅ All critical issues resolved
- ✅ No infinite loops or race conditions
- ✅ All functionality working (including single-event creation)
- ✅ Error boundaries catching and displaying errors gracefully
- ✅ Performance improvements measurable (reduced API calls, faster load times)
- ✅ Code quality improved (no dead code, consistent patterns)
- ✅ Score improved to 85+/100

---

## 📝 Notes

- Test each task thoroughly before moving to the next
- Commit after each completed task
- Update this document as tasks are completed
- Consider code reviews for critical changes
