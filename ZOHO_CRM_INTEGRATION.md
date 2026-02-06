# Zoho CRM Integration Guide

This document explains how this React application integrates with Zoho CRM using the Zoho Embedded App SDK.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [SDK Setup](#sdk-setup)
4. [Initialization](#initialization)
5. [Core Integration Patterns](#core-integration-patterns)
6. [API Methods Used](#api-methods-used)
7. [Implementation Examples](#implementation-examples)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

## Overview

This application is a Zoho CRM Embedded App that manages Events (Activities) within Zoho CRM. It provides functionality to:

- View, create, edit, and delete Events
- Filter events by date ranges
- Manage event participants, owners, and related records
- Search and associate records (Contacts, Accounts, etc.)
- Store and retrieve organization-level variables

The application uses the **Zoho Embedded App SDK** (version 1.0.6) to interact with Zoho CRM APIs.

## Prerequisites

1. **Zoho CRM Account**: You need an active Zoho CRM account
2. **Embedded App Setup**: The application must be configured as a Zoho Embedded App in your Zoho CRM instance
3. **API Connection**: A connection named `zoho_crm_conn` must be configured in Zoho CRM
4. **Custom Modules** (if applicable): 
   - `Log_Module` - For logging application events
   - Custom fields on Events module as needed

## SDK Setup

### 1. Include the Zoho SDK Script

The Zoho Embedded App SDK is loaded in `index.html`:

```html
<script src="https://live.zwidgets.com/js-sdk/1.0.6/ZohoEmbededAppSDK.min.js"></script>
```

This makes the `ZOHO` object available globally in your application.

### 2. Access the ZOHO Object

In your React components, access the Zoho SDK via the global `window` object:

```javascript
const ZOHO = window.ZOHO;
```

## Initialization

### App Initialization

The application initializes the Zoho SDK in the main `App.jsx` component:

```javascript
useEffect(() => {
  // Initialize Zoho Embedded App once
  ZOHO.embeddedApp.init().then(() => {
    setZohoLoaded(true);
    // Fetch the logged-in user
    ZOHO.CRM.CONFIG.getCurrentUser().then(function (data) {
      setLoggedInUser(data?.users[0]);
    });
  });
}, []);
```

**Key Points:**
- `ZOHO.embeddedApp.init()` must be called before any other Zoho API calls
- This method returns a Promise that resolves when initialization is complete
- Always wait for initialization before making API calls

## Core Integration Patterns

### 1. Context Provider Pattern

The application uses React Context to share Zoho SDK access across components:

```javascript
export const ZohoContext = createContext();

// In App.jsx
<ZohoContext.Provider
  value={{
    users,
    events,
    ZOHO,
    filterDate,
    setFilterDate,
    // ... other shared state
  }}
>
  {/* Child components */}
</ZohoContext.Provider>
```

### 2. Async/Await Pattern

All Zoho API calls are asynchronous and should be handled with async/await or Promises:

```javascript
try {
  const data = await ZOHO.CRM.API.getRecord({
    Entity: "Events",
    RecordID: recordId
  });
  // Handle success
} catch (error) {
  console.error("Error fetching record:", error);
  // Handle error
}
```

## API Methods Used

### 1. Configuration APIs

#### Get Current User
```javascript
ZOHO.CRM.CONFIG.getCurrentUser().then(function (data) {
  const currentUser = data?.users[0];
  // Use currentUser.id, currentUser.full_name, etc.
});
```

### 2. Record Management APIs

#### Get a Single Record
```javascript
const response = await ZOHO.CRM.API.getRecord({
  Entity: "Events",
  RecordID: "1234567890123456789"
});
```

#### Get All Records
```javascript
const usersResponse = await ZOHO.CRM.API.getAllRecords({
  Entity: "users",
  sort_order: "asc",
  per_page: 100,
  page: 1
});
```

#### Insert Record (Create)
```javascript
const data = await ZOHO.CRM.API.insertRecord({
  Entity: "Events",
  APIData: {
    Event_Title: "Meeting with Client",
    Start_DateTime: "2026-01-26T10:00:00+11:00",
    End_DateTime: "2026-01-26T11:00:00+11:00",
    // ... other fields
  },
  Trigger: ["workflow"] // Optional: trigger workflows
});
```

#### Update Record
```javascript
const data = await ZOHO.CRM.API.updateRecord({
  Entity: "Events",
  RecordID: "1234567890123456789",
  APIData: {
    Event_Title: "Updated Meeting Title",
    // ... other fields to update
  },
  Trigger: ["workflow"]
});
```

#### Delete Record
```javascript
const deleteResponse = await ZOHO.CRM.API.deleteRecord({
  Entity: "Events",
  RecordID: "1234567890123456789"
});
```

#### Search Records
```javascript
const searchResults = await ZOHO.CRM.API.searchRecord({
  Entity: "Contacts",
  SearchWord: "John",
  SearchBy: "Email", // or "Name", "Phone", etc.
  per_page: 200,
  page: 1
});
```

#### Get Related Records
```javascript
const relatedRecords = await ZOHO.CRM.API.getRelatedRecords({
  Entity: "Events",
  RecordID: "1234567890123456789",
  RelatedList: "Contacts" // or other related module
});
```

### 3. Organization Variables

#### Get Organization Variable
```javascript
const orgVar = await ZOHO.CRM.API.getOrgVariable("recent_colors");
const colorsArray = JSON.parse(orgVar?.Success?.Content || "[]");
```

### 4. Custom API Calls (Connection Invoke)

For custom API endpoints or advanced queries, use `CONNECTION.invoke`:

```javascript
const req_data = {
  url: `https://www.zohoapis.com.au/crm/v3/Events/search?criteria=((Start_DateTime:greater_equal:${encodeURIComponent(
    formattedBeginDate
  )})and(End_DateTime:less_equal:${encodeURIComponent(
    formattedCloseDate
  )}))&per_page=${recordsPerPage}&page=${currentPage}`,
  method: "GET",
  param_type: 1,
};

const data = await ZOHO.CRM.CONNECTION.invoke(
  "zoho_crm_conn", // Connection name configured in Zoho CRM
  req_data
);
```

**Note:** The connection name (`zoho_crm_conn`) must be configured in your Zoho CRM instance under Settings > Developer Space > Connections.

## Implementation Examples

### Example 1: Fetching Events with Pagination

```javascript
async function fetchEventsWithPagination(beginDate, endDate) {
  let allEventsData = [];
  let currentPage = 1;
  let hasMoreRecords = true;
  let recordsPerPage = 100;

  while (hasMoreRecords && currentPage < 11) {
    const req_data = {
      url: `https://www.zohoapis.com.au/crm/v3/Events/search?criteria=((Start_DateTime:greater_equal:${encodeURIComponent(
        beginDate
      )})and(End_DateTime:less_equal:${encodeURIComponent(
        endDate
      )}))&per_page=${recordsPerPage}&page=${currentPage}`,
      method: "GET",
      param_type: 1,
    };

    try {
      const data = await ZOHO.CRM.CONNECTION.invoke(
        "zoho_crm_conn",
        req_data
      );

      const pageEventsData = data?.details?.statusMessage?.data || [];
      const moreRecords = data?.details?.statusMessage?.info?.more_records || false;

      allEventsData = [...allEventsData, ...pageEventsData];
      hasMoreRecords = moreRecords;
      currentPage++;
    } catch (error) {
      console.error(`Error fetching page ${currentPage}:`, error);
      hasMoreRecords = false;
    }
  }

  return allEventsData;
}
```

### Example 2: Creating an Event with Participants

```javascript
async function createEvent(eventData) {
  const transformedData = {
    Event_Title: eventData.title,
    Start_DateTime: eventData.startDateTime,
    End_DateTime: eventData.endDateTime,
    Participants: eventData.participants, // Array of participant objects
    Owner: eventData.owner,
    // ... other fields
  };

  try {
    const response = await ZOHO.CRM.API.insertRecord({
      Entity: "Events",
      APIData: transformedData,
      Trigger: ["workflow"]
    });

    if (
      response.data &&
      response.data.length > 0 &&
      response.data[0].code === "SUCCESS"
    ) {
      const createdEvent = response.data[0].details;
      return { success: true, event: createdEvent };
    } else {
      throw new Error("Failed to create event");
    }
  } catch (error) {
    console.error("Error creating event:", error);
    return { success: false, error: error.message };
  }
}
```

### Example 3: Searching Contacts

```javascript
async function searchContacts(searchTerm) {
  try {
    const searchResults = await ZOHO.CRM.API.searchRecord({
      Entity: "Contacts",
      SearchWord: searchTerm,
      SearchBy: "Email", // or "Name", "Phone"
      per_page: 200,
      page: 1
    });

    return searchResults.data || [];
  } catch (error) {
    console.error("Error searching contacts:", error);
    return [];
  }
}
```

### Example 4: Updating an Event

```javascript
async function updateEvent(eventId, updateData) {
  try {
    const response = await ZOHO.CRM.API.updateRecord({
      Entity: "Events",
      RecordID: eventId,
      APIData: updateData,
      Trigger: ["workflow"]
    });

    if (
      response.data &&
      response.data.length > 0 &&
      response.data[0].code === "SUCCESS"
    ) {
      return { success: true, data: response.data[0].details };
    } else {
      throw new Error("Failed to update event");
    }
  } catch (error) {
    console.error("Error updating event:", error);
    return { success: false, error: error.message };
  }
}
```

## Best Practices

### 1. Error Handling

Always wrap Zoho API calls in try-catch blocks:

```javascript
try {
  const data = await ZOHO.CRM.API.getRecord({ /* ... */ });
  // Handle success
} catch (error) {
  console.error("API Error:", error);
  // Show user-friendly error message
  setError("Failed to fetch record. Please try again.");
}
```

### 2. Loading States

Show loading indicators while API calls are in progress:

```javascript
const [loading, setLoading] = useState(false);

async function fetchData() {
  setLoading(true);
  try {
    const data = await ZOHO.CRM.API.getAllRecords({ /* ... */ });
    // Process data
  } finally {
    setLoading(false);
  }
}
```

### 3. Response Validation

Always validate API responses before using the data:

```javascript
const response = await ZOHO.CRM.API.insertRecord({ /* ... */ });

if (
  response.data &&
  response.data.length > 0 &&
  response.data[0].code === "SUCCESS"
) {
  // Success - use response.data[0].details
} else {
  // Handle error
  const errorMessage = response.data?.[0]?.message || "Unknown error";
  throw new Error(errorMessage);
}
```

### 4. Date Formatting

Zoho CRM expects dates in ISO 8601 format with timezone:

```javascript
// Format date for Zoho API
function formatDateForZoho(date) {
  const pad = (num) => String(num).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  
  const timezoneOffset = -date.getTimezoneOffset();
  const offsetSign = timezoneOffset >= 0 ? "+" : "-";
  const offsetHours = pad(Math.floor(Math.abs(timezoneOffset) / 60));
  const offsetMinutes = pad(Math.abs(timezoneOffset) % 60);
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${offsetHours}:${offsetMinutes}`;
}
```

### 5. Caching

Implement caching for frequently accessed data:

```javascript
const [cache, setCache] = useState({});

async function getData(filterKey) {
  if (cache[filterKey]) {
    return cache[filterKey];
  }
  
  const data = await fetchDataFromZoho();
  setCache(prev => ({ ...prev, [filterKey]: data }));
  return data;
}
```

### 6. Pagination

Always implement pagination for large datasets:

```javascript
// Fetch records in pages
let allRecords = [];
let page = 1;
let hasMore = true;

while (hasMore) {
  const response = await ZOHO.CRM.API.getAllRecords({
    Entity: "Events",
    per_page: 100,
    page: page
  });
  
  allRecords = [...allRecords, ...response.data];
  hasMore = response.info?.more_records || false;
  page++;
}
```

## Troubleshooting

### Common Issues

1. **"ZOHO is not defined"**
   - Ensure the SDK script is loaded in `index.html`
   - Check that the script loads before your React app initializes

2. **"embeddedApp.init() failed"**
   - Verify the app is properly configured as a Zoho Embedded App
   - Check that you're running the app within Zoho CRM (not standalone)

3. **"Connection not found"**
   - Verify the connection name matches exactly (case-sensitive)
   - Ensure the connection is configured in Zoho CRM Settings > Developer Space > Connections

4. **API Rate Limits**
   - Zoho CRM has rate limits on API calls
   - Implement retry logic with exponential backoff
   - Cache responses when possible

5. **Date Format Errors**
   - Always use ISO 8601 format with timezone offset
   - Ensure dates are properly encoded in URL parameters

6. **Permission Errors**
   - Verify the user has appropriate permissions for the modules/records being accessed
   - Check field-level security settings

### Debugging Tips

1. **Console Logging**
   ```javascript
   console.log("Zoho SDK loaded:", typeof ZOHO !== "undefined");
   console.log("API Response:", data);
   ```

2. **Check Response Structure**
   ```javascript
   console.log("Full response:", JSON.stringify(data, null, 2));
   ```

3. **Validate Data Before Sending**
   ```javascript
   console.log("Sending data:", JSON.stringify(APIData, null, 2));
   ```

## Additional Resources

- [Zoho Embedded App SDK Documentation](https://www.zoho.com/crm/developer/docs/embedded-app-sdk/)
- [Zoho CRM API Documentation](https://www.zoho.com/crm/developer/docs/api/v3/)
- [Zoho CRM API Reference](https://www.zoho.com/crm/developer/docs/api/v3/get-records.html)

## Summary

This application demonstrates a comprehensive integration with Zoho CRM using the Embedded App SDK. Key integration points include:

1. **Initialization**: `ZOHO.embeddedApp.init()` to initialize the SDK
2. **User Management**: `ZOHO.CRM.CONFIG.getCurrentUser()` to get current user
3. **CRUD Operations**: Using `insertRecord`, `updateRecord`, `getRecord`, `deleteRecord`
4. **Search**: Using `searchRecord` for finding records
5. **Custom Queries**: Using `CONNECTION.invoke` for advanced API calls
6. **Organization Variables**: Using `getOrgVariable` for storing app-level data

The integration follows React best practices with proper error handling, loading states, and data caching.
