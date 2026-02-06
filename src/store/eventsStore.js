import { create } from 'zustand';

/**
 * Smart merge function that preserves Owner and Created_By data
 * When the new record only has an ID, it preserves name and email from the old record
 * 
 * @param {Object} oldEvent - The existing event with full Owner/Created_By data
 * @param {Object} newEvent - The updated event that may only have IDs
 * @returns {Object} - Merged event with preserved data
 */
const smartMergeEvent = (oldEvent, newEvent) => {
  const merged = { ...oldEvent, ...newEvent };
  
  // Smart merge for Owner field
  if (newEvent.Owner && oldEvent.Owner) {
    // If new Owner only has id (or id + undefined name), preserve old name/email
    const newOwnerHasOnlyId = newEvent.Owner.id && 
      (!newEvent.Owner.name || newEvent.Owner.name === undefined) &&
      (!newEvent.Owner.email || newEvent.Owner.email === undefined);
    
    if (newOwnerHasOnlyId) {
      merged.Owner = {
        ...oldEvent.Owner,
        ...newEvent.Owner,
        // Preserve name and email from old record if new record doesn't have them
        name: newEvent.Owner.name || oldEvent.Owner.name,
        email: newEvent.Owner.email || oldEvent.Owner.email,
        full_name: newEvent.Owner.full_name || oldEvent.Owner.full_name,
      };
    } else {
      // New Owner has complete data, use it but merge with old to preserve any missing fields
      merged.Owner = {
        ...oldEvent.Owner,
        ...newEvent.Owner,
      };
    }
  } else if (newEvent.Owner && !oldEvent.Owner) {
    // New Owner exists but old doesn't, use new one
    merged.Owner = newEvent.Owner;
  } else if (!newEvent.Owner && oldEvent.Owner) {
    // Old Owner exists but new doesn't, preserve old one
    merged.Owner = oldEvent.Owner;
  }
  
  // Smart merge for Created_By field (same logic as Owner)
  if (newEvent.Created_By && oldEvent.Created_By) {
    const newCreatedByHasOnlyId = newEvent.Created_By.id && 
      (!newEvent.Created_By.name || newEvent.Created_By.name === undefined) &&
      (!newEvent.Created_By.email || newEvent.Created_By.email === undefined);
    
    if (newCreatedByHasOnlyId) {
      merged.Created_By = {
        ...oldEvent.Created_By,
        ...newEvent.Created_By,
        name: newEvent.Created_By.name || oldEvent.Created_By.name,
        email: newEvent.Created_By.email || oldEvent.Created_By.email,
        full_name: newEvent.Created_By.full_name || oldEvent.Created_By.full_name,
      };
    } else {
      merged.Created_By = {
        ...oldEvent.Created_By,
        ...newEvent.Created_By,
      };
    }
  } else if (newEvent.Created_By && !oldEvent.Created_By) {
    merged.Created_By = newEvent.Created_By;
  } else if (!newEvent.Created_By && oldEvent.Created_By) {
    merged.Created_By = oldEvent.Created_By;
  }
  
  return merged;
};

/**
 * Global Events Store using Zustand
 * 
 * This store manages the master list of all events/activities.
 * Components read from this store and filter reactively using useMemo.
 * Updates to events are immediately reflected across all components.
 */

const useEventsStore = create((set, get) => ({
  // Master list of all events (the single source of truth)
  events: [],
  
  // Loading state
  loading: false,
  
  // Cache for fetched date ranges (to avoid redundant API calls)
  cache: {},
  
  // Actions
  
  /**
   * Set events in the store (replaces existing events)
   * Used when fetching a new date range
   */
  setEvents: (events) => set({ events }),
  
  /**
   * Add events to the store (merges with existing, deduplicates by id)
   * Used when fetching additional data that might overlap
   */
  addEvents: (newEvents) => {
    const currentEvents = get().events;
    const eventsMap = new Map();
    
    // Add existing events to map
    currentEvents.forEach(event => {
      eventsMap.set(event.id, event);
    });
    
    // Add/update with new events
    newEvents.forEach(event => {
      eventsMap.set(event.id, event);
    });
    
    // Convert back to array and sort by Start_DateTime
    const mergedEvents = Array.from(eventsMap.values()).sort((a, b) => {
      return new Date(a.Start_DateTime) - new Date(b.Start_DateTime);
    });
    
    set({ events: mergedEvents });
  },
  
  /**
   * Update a single event in the store
   * This is called optimistically when an event is edited
   * Uses smart merge to preserve Owner and Created_By data
   * The event will be updated in the master list, and reactive filters will automatically re-calculate
   */
  updateEvent: (updatedEvent) => {
    const currentEvents = get().events;
    const updatedEvents = currentEvents.map(event => {
      if (event.id === updatedEvent.id) {
        // Use smart merge to preserve Owner and Created_By data
        return smartMergeEvent(event, updatedEvent);
      }
      return event;
    });
    set({ events: updatedEvents });
  },
  
  /**
   * Add a new event to the store
   * Called when a new event is created
   */
  addEvent: (newEvent) => {
    const currentEvents = get().events;
    // Check if event already exists (by id)
    const exists = currentEvents.some(event => event.id === newEvent.id);
    if (!exists) {
      const updatedEvents = [...currentEvents, newEvent].sort((a, b) => {
        return new Date(a.Start_DateTime) - new Date(b.Start_DateTime);
      });
      set({ events: updatedEvents });
    }
  },
  
  /**
   * Remove an event from the store
   * Called when an event is deleted
   */
  removeEvent: (eventId) => {
    const currentEvents = get().events;
    const filteredEvents = currentEvents.filter(event => event.id !== eventId);
    set({ events: filteredEvents });
  },
  
  /**
   * Set loading state
   */
  setLoading: (loading) => set({ loading }),
  
  /**
   * Cache management for date ranges
   * Stores fetched data with metadata about the date range
   */
  setCache: (key, data, range) => {
    const currentCache = get().cache;
    set({ 
      cache: { 
        ...currentCache, 
        [key]: { data, range } 
      } 
    });
  },
  
  /**
   * Get cached data for a specific key
   */
  getCache: (key) => {
    return get().cache[key] || null;
  },
  
  /**
   * Clear all cache
   */
  clearCache: () => set({ cache: {} }),
  
  /**
   * Update cache entry when an event is updated
   * Ensures cached data stays in sync with the master list
   * Uses smart merge to preserve Owner and Created_By data
   */
  updateCacheEntry: (updatedEvent) => {
    const currentCache = get().cache;
    const newCache = { ...currentCache };
    
    Object.keys(newCache).forEach(key => {
      if (newCache[key] && newCache[key].data) {
        newCache[key].data = newCache[key].data.map(event => {
          if (event.id === updatedEvent.id) {
            // Use smart merge to preserve Owner and Created_By data
            return smartMergeEvent(event, updatedEvent);
          }
          return event;
        });
      }
    });
    
    set({ cache: newCache });
  },
  
  /**
   * Remove an event from all cache entries
   * Called when an event is deleted/erased
   */
  removeEventFromCache: (eventId) => {
    const currentCache = get().cache;
    const newCache = { ...currentCache };
    
    Object.keys(newCache).forEach(key => {
      if (newCache[key] && newCache[key].data) {
        newCache[key].data = newCache[key].data.filter(
          event => event.id !== eventId
        );
      }
    });
    
    set({ cache: newCache });
  },
}));

// Export smart merge function for use in other components if needed
export { smartMergeEvent };

export default useEventsStore;
