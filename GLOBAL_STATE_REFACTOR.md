# Global State Management Refactoring

## Overview

The application has been refactored to use **Zustand** for global state management. This ensures that:

1. **Single Source of Truth**: All events are stored in a global store
2. **Reactive Filtering**: Filtered lists automatically update when events change
3. **Optimistic Updates**: UI updates immediately when events are edited, created, or deleted
4. **No Disappearing Records**: Records stay visible if they still match filter criteria after updates

## Architecture

### Global Store (`src/store/eventsStore.js`)

The Zustand store manages:
- **Master Events List**: All events fetched from the API
- **Loading State**: Tracks when data is being fetched
- **Cache**: Stores fetched date ranges to avoid redundant API calls

#### Key Actions:
- `setEvents(events)`: Replace all events (used when fetching new date range)
- `addEvents(newEvents)`: Merge new events with existing (deduplicates by id)
- `updateEvent(updatedEvent)`: Update a single event in the store
- `addEvent(newEvent)`: Add a new event to the store
- `removeEvent(eventId)`: Remove an event from the store
- `setCache(key, data, range)`: Cache fetched data with date range metadata
- `updateCacheEntry(updatedEvent)`: Update an event in all cache entries

### Component Updates

#### `App.jsx`
- Uses global store instead of local `events` state
- Fetches data and adds to global store via `addEvents()`
- Maintains cache for date range optimization
- Provides backward-compatible `updateEventState` function

#### `ActivityTable.jsx`
- Reads events directly from global store using `useEventsStore((state) => state.events)`
- **Reactive Filtering**: `filteredRows` useMemo automatically re-calculates when:
  - Events in store change (via `rows` dependency)
  - Filter criteria change (type, priority, user, date, cleared)
- This ensures that when an event's date is updated, the filtered list immediately reflects whether it should be visible

#### `EditActivityModal.jsx`
- Updates global store optimistically via `updateEvent()` and `updateCacheEntry()`
- UI updates immediately without waiting for API response
- Reactive filters automatically re-calculate based on updated event data

#### `CreateActivityModal.jsx`
- Adds new events to global store via `addEvent()`
- New events immediately appear in filtered lists if they match criteria

#### `ClearActivityModal.jsx`
- Updates or removes events in global store
- Status changes and deletions are immediately reflected in UI

## Key Benefits

### 1. Reactive Filtering
```javascript
// In ActivityTable.jsx
const rows = React.useMemo(() => {
  return Array.isArray(events)
    ? events.map((event) => createData(event, event.Type_of_Activity || "Other"))
    : [];
}, [events]); // Re-calculates when events in store change

const filteredRows = React.useMemo(() => {
  // Filter logic that automatically re-runs when:
  // - rows change (because events changed)
  // - filter criteria change
  return rows.filter((row) => {
    // ... filtering logic
  });
}, [rows, filterType, filterPriority, filterUser, customDateRange, filterDate, showCleared]);
```

### 2. Optimistic Updates
When an event is edited:
1. Global store is updated immediately
2. Reactive filters re-calculate
3. UI updates instantly
4. If the updated event still matches current filter, it remains visible with new data
5. If the updated event no longer matches, it disappears from the list

### 3. No Disappearing Records
**Before**: When editing an event's date, it might disappear from the current view even if it still matched the filter.

**After**: The reactive filtering ensures that:
- If the new date matches the current filter → event stays visible with updated date
- If the new date doesn't match → event correctly disappears
- The decision is made automatically based on the filter criteria

## Installation

Zustand has been added to `package.json`. To install:

```bash
npm install
```

If you encounter npm errors, try:
```bash
npm install --legacy-peer-deps
```

## Usage Example

### Reading Events from Store
```javascript
import useEventsStore from '../store/eventsStore';

function MyComponent() {
  // Read events from global store
  const events = useEventsStore((state) => state.events);
  
  // The component will automatically re-render when events change
  return <div>{events.length} events</div>;
}
```

### Updating an Event
```javascript
import useEventsStore from '../store/eventsStore';

function EditComponent({ eventId }) {
  const { updateEvent, updateCacheEntry } = useEventsStore();
  
  const handleSave = async (updatedData) => {
    // Update API
    await ZOHO.CRM.API.updateRecord({ ... });
    
    // Update global store (optimistic update)
    const updatedEvent = { id: eventId, ...updatedData };
    updateEvent(updatedEvent);
    updateCacheEntry(updatedEvent);
    
    // UI updates immediately, filters re-calculate automatically
  };
}
```

## Migration Notes

- All components maintain backward compatibility with prop-based `setEvents` and `updateEventState`
- The global store is the primary source of truth
- Prop-based updates are kept for components that haven't been fully migrated yet

## Testing Checklist

- [ ] Edit an event's date - verify it stays visible if it matches current filter
- [ ] Edit an event's date - verify it disappears if it no longer matches filter
- [ ] Create a new event - verify it appears in filtered list if it matches
- [ ] Clear/delete an event - verify it disappears from all views
- [ ] Switch between date filters - verify data loads correctly
- [ ] Apply multiple filters (type, priority, user) - verify filtering works correctly
- [ ] Clear all filters - verify default state is restored
