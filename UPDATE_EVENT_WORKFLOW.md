# Robust Event Update Workflow

## Overview

This document describes the robust `handleUpdateEvent` workflow that ensures event updates are properly synchronized across the application state, cache, and UI.

## Workflow Steps

### 1. API First (`EditActivityModal.jsx`)

The update process always starts with the API call:

```javascript
const data = await ZOHO.CRM.API.updateRecord({
  Entity: "Events",
  APIData: transformedData,
  Trigger: ["workflow"],
});
```

**Why API First?**
- Ensures data is saved to the database before updating UI
- Provides server-returned data that may have been modified by workflows
- Allows proper error handling if the update fails

### 2. Build Complete Updated Record

After successful API response, we merge:
- Original event data (`selectedRowData`)
- Transformed form data (`transformedData`)
- Server-returned data (`updatedEventData`)

This ensures we have the complete, up-to-date event object.

### 3. Global State Update (No Refetch)

The `updateEventState` function in `App.jsx` handles the state update:

```javascript
updateEventState(updatedRecord);
```

This function:
- **Updates the master events list** in the Zustand store
- **Updates all cache entries** (so switching filters shows fresh data)
- **Re-validates** if the event still matches the current filter
- **Manages visibility** based on filter match

### 4. Smart Caching

The store's `updateCacheEntry` method updates the event in **every cache entry**:

```javascript
updateCacheEntry: (updatedEvent) => {
  const currentCache = get().cache;
  const newCache = { ...currentCache };
  
  Object.keys(newCache).forEach(key => {
    if (newCache[key] && newCache[key].data) {
      newCache[key].data = newCache[key].data.map(event => 
        event.id === updatedEvent.id ? updatedEvent : event
      );
    }
  });
  
  set({ cache: newCache });
}
```

**Result**: When you switch filters later, the updated event data is already in the cache.

### 5. Re-Validation Logic

After updating the store and cache, we check if the event still matches the current filter:

```javascript
// Calculate current filter's date range
const currentRange = calculateDateRange(filterDate, customDateRange);

// Check if event's date falls within range
const eventFitsInRange = 
  eventDate >= currentRange.beginDate && 
  eventDate <= currentRange.closeDate;
```

### 6. Visibility Management

**If event fits in range:**
- Event stays in the master list (already updated)
- Reactive filtering in `ActivityTable` will show it with new data
- Console log: `✅ Event updated and still matches filter - visible with new data`

**If event doesn't fit in range:**
- Event is removed from the current view (master list)
- Event remains updated in all cache entries
- Console log: `⚠️ Event updated but no longer matches current filter - removed from view (still in cache)`
- When you switch to a filter that includes the new date, the updated event will appear

## Code Locations

### `App.jsx` - `updateEventState` function (Lines 166-240)

This is the main handler that orchestrates the update workflow.

### `EditActivityModal.jsx` - `handleSubmit` function (Lines 302-395)

This handles the API call and calls `updateEventState` on success.

## Example Scenarios

### Scenario 1: Date Change Within Current Filter

**Before**: Event on Dec 25, viewing "Last 30 Days" filter
**Action**: Change date to Dec 28
**Result**: 
- ✅ Event stays visible
- ✅ Shows new date (Dec 28)
- ✅ Updated in cache

### Scenario 2: Date Change Outside Current Filter

**Before**: Event on Dec 25, viewing "Last 30 Days" filter
**Action**: Change date to Jan 15 (next year)
**Result**:
- ⚠️ Event disappears from current view (no longer matches "Last 30 Days")
- ✅ Event is updated in cache
- ✅ When switching to "Current Month" (January), the updated event appears

### Scenario 3: Other Field Change (Title, Priority, etc.)

**Before**: Event on Dec 25, viewing "Last 30 Days" filter
**Action**: Change title only (date unchanged)
**Result**:
- ✅ Event stays visible
- ✅ Shows new title immediately
- ✅ Updated in cache

## Benefits

1. **No Disappearing Records**: Records only disappear if they genuinely don't match the filter
2. **Immediate UI Updates**: Changes appear instantly without waiting for refetch
3. **Cache Consistency**: All cache entries stay in sync
4. **Smart Filtering**: Automatic re-validation ensures correct visibility
5. **No Unnecessary API Calls**: Updates happen locally, no refetch needed

## Error Handling

- Invalid dates: Event is still updated in store/cache, but re-validation is skipped
- Missing filter range: Event is kept visible (safe default)
- API failures: Error is shown to user, no state update occurs

## Testing Checklist

- [ ] Edit event date within current filter → stays visible with new date
- [ ] Edit event date outside current filter → disappears from view
- [ ] Switch to filter that includes new date → updated event appears
- [ ] Edit non-date fields → event stays visible with updated data
- [ ] Check cache after update → all cache entries have updated data
- [ ] Verify no API refetch occurs after update
