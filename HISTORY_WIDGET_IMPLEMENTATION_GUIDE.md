# History Widget Implementation Guide

## Overview

This guide provides **complete code examples** for implementing the same filtering and fetching pattern used in the Events/Activities widget for a History Widget. The pattern includes:

- ✅ Global state management with Zustand
- ✅ Intelligent caching with date range metadata
- ✅ Reactive client-side filtering
- ✅ Smart cache restoration
- ✅ Optimistic updates

---

## Step 1: Create History Store

**File**: `src/store/historyStore.js`

```javascript
import { create } from 'zustand';

/**
 * Global History Store using Zustand
 * 
 * This store manages the master list of all history records.
 * Components read from this store and filter reactively using useMemo.
 * Updates to history records are immediately reflected across all components.
 */

const useHistoryStore = create((set, get) => ({
  // Master list of all history records (the single source of truth)
  history: [],
  
  // Loading state
  loading: false,
  
  // Cache for fetched date ranges (to avoid redundant API calls)
  cache: {},
  
  // Actions
  
  /**
   * Set history records in the store (replaces existing records)
   * Used when fetching a new date range
   */
  setHistory: (history) => set({ history }),
  
  /**
   * Add history records to the store (merges with existing, deduplicates by id)
   * Used when fetching additional data that might overlap
   */
  addHistory: (newHistory) => {
    const currentHistory = get().history;
    const historyMap = new Map();
    
    // Add existing records to map
    currentHistory.forEach(record => {
      historyMap.set(record.id, record);
    });
    
    // Add/update with new records
    newHistory.forEach(record => {
      historyMap.set(record.id, record);
    });
    
    // Convert back to array and sort by Created_Time (or your date field)
    const mergedHistory = Array.from(historyMap.values()).sort((a, b) => {
      return new Date(a.Created_Time || a.created_time) - new Date(b.Created_Time || b.created_time);
    });
    
    set({ history: mergedHistory });
  },
  
  /**
   * Update a single history record in the store
   * This is called optimistically when a record is edited
   */
  updateHistory: (updatedRecord) => {
    const currentHistory = get().history;
    const updatedHistory = currentHistory.map(record => 
      record.id === updatedRecord.id ? updatedRecord : record
    );
    set({ history: updatedHistory });
  },
  
  /**
   * Add a new history record to the store
   * Called when a new record is created
   */
  addHistoryRecord: (newRecord) => {
    const currentHistory = get().history;
    // Check if record already exists (by id)
    const exists = currentHistory.some(record => record.id === newRecord.id);
    if (!exists) {
      const updatedHistory = [...currentHistory, newRecord].sort((a, b) => {
        return new Date(a.Created_Time || a.created_time) - new Date(b.Created_Time || b.created_time);
      });
      set({ history: updatedHistory });
    }
  },
  
  /**
   * Remove a history record from the store
   * Called when a record is deleted
   */
  removeHistory: (recordId) => {
    const currentHistory = get().history;
    const filteredHistory = currentHistory.filter(record => record.id !== recordId);
    set({ history: filteredHistory });
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
   * Update cache entry when a record is updated
   * Ensures cached data stays in sync with the master list
   */
  updateCacheEntry: (updatedRecord) => {
    const currentCache = get().cache;
    const newCache = { ...currentCache };
    
    Object.keys(newCache).forEach(key => {
      if (newCache[key] && newCache[key].data) {
        newCache[key].data = newCache[key].data.map(record => 
          record.id === updatedRecord.id ? updatedRecord : record
        );
      }
    });
    
    set({ cache: newCache });
  },
  
  /**
   * Remove a record from all cache entries
   * Called when a record is deleted
   */
  removeHistoryFromCache: (recordId) => {
    const currentCache = get().cache;
    const newCache = { ...currentCache };
    
    Object.keys(newCache).forEach(key => {
      if (newCache[key] && newCache[key].data) {
        newCache[key].data = newCache[key].data.filter(
          record => record.id !== recordId
        );
      }
    });
    
    set({ cache: newCache });
  },
}));

export default useHistoryStore;
```

---

## Step 2: Create History Component with Fetching Logic

**File**: `src/components/HistoryWidget.jsx`

```javascript
import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import { CircularProgress } from "@mui/material";
import useHistoryStore from "../store/historyStore";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const ZOHO = window.ZOHO;

/**
 * Date Utility Helper - Calculate date ranges for filters
 * Returns standard JS Date objects
 */
const calculateDateRange = (filterType, customRange) => {
  const currentDate = new Date();
  currentDate.setHours(23, 59, 59, 999);

  let beginDate, closeDate;

  switch (filterType) {
    case "Default":
      // Last month start to today
      beginDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      closeDate = new Date();
      break;
    case "Last 7 Days":
      closeDate = new Date();
      beginDate = new Date();
      beginDate.setDate(closeDate.getDate() - 6);
      beginDate.setHours(0, 0, 0, 0);
      break;
    case "Last 30 Days":
      closeDate = new Date();
      beginDate = new Date();
      beginDate.setDate(closeDate.getDate() - 29);
      beginDate.setHours(0, 0, 0, 0);
      break;
    case "Last 90 Days":
      closeDate = new Date();
      beginDate = new Date();
      beginDate.setDate(closeDate.getDate() - 89);
      beginDate.setHours(0, 0, 0, 0);
      break;
    case "Last Month":
      beginDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      closeDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
      closeDate.setHours(23, 59, 59, 999);
      break;
    case "Current Month":
      beginDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      closeDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      closeDate.setHours(23, 59, 59, 999);
      break;
    case "Custom Range":
      if (customRange) {
        beginDate = new Date(customRange.startDate + "T00:00:00");
        closeDate = new Date(customRange.endDate + "T23:59:59");
      }
      break;
    default:
      return null;
  }
  return { beginDate, closeDate };
};

/**
 * Format date for Zoho API
 * Returns format: YYYY-MM-DDTHH:MM:SS±HH:MM
 */
const formatDateForZoho = (date, hours = 0, minutes = 0, seconds = 0) => {
  if (!date || isNaN(date.getTime())) return null;
  const pad = (num) => String(num).padStart(2, "0");
  
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const formattedTime = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  
  const timezoneOffset = -date.getTimezoneOffset();
  const offsetSign = timezoneOffset >= 0 ? "+" : "-";
  const offsetHours = pad(Math.floor(Math.abs(timezoneOffset) / 60));
  const offsetMinutes = pad(Math.abs(timezoneOffset) % 60);
  
  return `${year}-${month}-${day}T${formattedTime}${offsetSign}${offsetHours}:${offsetMinutes}`;
};

/**
 * Check if we have cached data that covers the needed range
 */
const findCachedSubset = (neededStart, neededEnd, cache) => {
  const cacheKeys = Object.keys(cache);
  
  for (const key of cacheKeys) {
    const cachedItem = cache[key];
    if (!cachedItem || !cachedItem.range) continue;
    
    const cachedStart = cachedItem.range.start;
    const cachedEnd = cachedItem.range.end;

    // Check if the needed range is INSIDE the cached range
    if (cachedStart <= neededStart && cachedEnd >= neededEnd) {
      console.log(`Optimization: Found data in cache [${key}] for requested range.`);
      
      // Filter the cached data to return ONLY what fits the needed range
      return cachedItem.data.filter(record => {
        // Adjust this field name to match your History entity's date field
        const recordDate = new Date(record.Created_Time || record.created_time);
        return recordDate >= neededStart && recordDate <= neededEnd;
      });
    }
  }
  return null;
};

/**
 * Process raw history data from API
 * Deduplicates and sorts by date
 */
const processHistory = (rawHistory) => {
  const uniqueMap = new Map();
  rawHistory.forEach((record) => {
    if (!uniqueMap.has(record.id)) {
      uniqueMap.set(record.id, record);
    }
  });
  return Array.from(uniqueMap.values()).sort((a, b) => {
    // Adjust field name to match your History entity
    return new Date(a.Created_Time || a.created_time) - new Date(b.Created_Time || b.created_time);
  });
};

export default function HistoryWidget() {
  // --- Global State Management (Zustand) ---
  const history = useHistoryStore((state) => state.history);
  const loading = useHistoryStore((state) => state.loading);
  const cache = useHistoryStore((state) => state.cache);
  const { 
    setHistory, 
    addHistory, 
    setLoading, 
    setCache, 
    getCache 
  } = useHistoryStore();

  // --- Local Filter States ---
  const [zohoLoaded, setZohoLoaded] = useState(false);
  const [filterDate, setFilterDate] = useState("Default");
  const [customDateRange, setCustomDateRange] = useState(null);
  
  // ADD YOUR CUSTOM FILTERS HERE
  // Example: Status, Category, Action Type, etc.
  const [filterStatus, setFilterStatus] = useState([]);
  const [filterCategory, setFilterCategory] = useState([]);
  const [filterActionType, setFilterActionType] = useState([]);
  
  // Example filter options - ADJUST TO YOUR HISTORY ENTITY
  const statusOptions = ["Active", "Inactive", "Pending", "Completed"];
  const categoryOptions = ["Login", "Update", "Delete", "Create"];
  const actionTypeOptions = ["View", "Edit", "Delete", "Create"];

  const filterDateOptions = [
    { label: "Default", value: "Default" },
    { label: "Last 7 Days", value: "Last 7 Days" },
    { label: "Last 30 Days", value: "Last 30 Days" },
    { label: "Last 90 Days", value: "Last 90 Days" },
    { label: "Last Month", value: "Last Month" },
    { label: "Current Month", value: "Current Month" },
    { label: "Custom Range", value: "Custom Range" },
  ];

  // --- 1. Initialize Zoho SDK ---
  useEffect(() => {
    ZOHO.embeddedApp.init().then(() => {
      setZohoLoaded(true);
    });
  }, []);

  // --- 2. Core API Fetch Logic ---
  const fetchHistoryFromZoho = async (beginDate, closeDate) => {
    const formattedBegin = formatDateForZoho(beginDate, 0, 0, 0);
    const formattedClose = formatDateForZoho(closeDate, 23, 59, 59);

    let allHistoryData = [];
    let currentPage = 1;
    let hasMoreRecords = true;
    const recordsPerPage = 100;

    while (hasMoreRecords && currentPage < 11) {
      // ADJUST THIS QUERY TO MATCH YOUR HISTORY ENTITY
      // Example: If your History entity uses Created_Time field
      const searchUrl = `((Created_Time:greater_equal:${encodeURIComponent(formattedBegin)})and(Created_Time:less_equal:${encodeURIComponent(formattedClose)}))`;
      
      const req_data = {
        // ADJUST URL TO YOUR HISTORY ENTITY NAME
        url: `https://www.zohoapis.com.au/crm/v3/History/search?criteria=${searchUrl}&per_page=${recordsPerPage}&page=${currentPage}`,
        method: "GET",
        param_type: 1,
      };

      try {
        const data = await ZOHO.CRM.CONNECTION.invoke("zoho_crm_conn", req_data);
        const pageHistory = data?.details?.statusMessage?.data || [];
        const moreRecords = data?.details?.statusMessage?.info?.more_records || false;

        allHistoryData = [...allHistoryData, ...pageHistory];
        hasMoreRecords = moreRecords;
        currentPage++;
      } catch (error) {
        console.error("Pagination error:", error);
        hasMoreRecords = false;
      }
    }
    return allHistoryData;
  };

  // --- 3. Handle Standard Filter (Predefined Date Ranges) ---
  const handleStandardFilter = async (filterType) => {
    // 1. Calculate needed dates
    const dates = calculateDateRange(filterType);
    if (!dates) return;

    // 2. Check Cache (Exact Match)
    const cachedData = getCache(filterType);
    if (cachedData) {
      // Add cached history to global store
      addHistory(cachedData.data);
      setLoading(false);
      return;
    }

    // 3. Check Cache (Superset Match - The Optimization)
    const subsetData = findCachedSubset(dates.beginDate, dates.closeDate, cache);
    if (subsetData) {
      // Add subset to global store
      addHistory(subsetData);
      setLoading(false);
      return;
    }

    // 4. Fetch from API (If we really need it)
    setLoading(true);
    try {
      const rawData = await fetchHistoryFromZoho(dates.beginDate, dates.closeDate);
      const processedData = processHistory(rawData);

      // Add to global store (merges with existing, deduplicates)
      addHistory(processedData);
      
      // Save to cache with metadata about the Date Range
      setCache(filterType, processedData, { start: dates.beginDate, end: dates.closeDate });
    } catch (error) {
      console.error(`Error loading ${filterType}:`, error);
    } finally {
      setLoading(false);
    }
  };

  // --- 4. Handle Custom Date Range ---
  const handleCustomRange = async (range) => {
    if (!range) return;
    setLoading(true);
    try {
      const dates = calculateDateRange("Custom Range", range);
      const rawData = await fetchHistoryFromZoho(dates.beginDate, dates.closeDate);
      const processedData = processHistory(rawData);
      // Add to global store (merges with existing records)
      addHistory(processedData);
      // We do NOT cache custom ranges as they are too specific
    } catch (error) {
      console.error("Error loading custom range:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- 5. Main Effect - Fetch Data When Filter Changes ---
  useEffect(() => {
    if (!zohoLoaded) return;

    if (filterDate === "Custom Range") {
      if (customDateRange) handleCustomRange(customDateRange);
    } else {
      handleStandardFilter(filterDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zohoLoaded, filterDate, customDateRange]);

  // --- 6. Handle Clear Filters ---
  const handleClearFilters = () => {
    // Step 1: Reset all filter states
    setFilterStatus([]);
    setFilterCategory([]);
    setFilterActionType([]);
    setCustomDateRange(null);
    
    // Step 2: Check cache for "Default" key and restore data immediately
    const store = useHistoryStore.getState();
    const defaultCache = store.getCache("Default");
    
    if (defaultCache && defaultCache.data && defaultCache.data.length > 0) {
      // Cache exists - immediately restore history from cache
      console.log('✅ Restoring history from cache["Default"]:', defaultCache.data.length, 'records');
      store.setHistory(defaultCache.data);
    } else {
      // Cache is empty - will trigger network fetch via useEffect when filterDate changes
      console.log('⚠️ No cache found for "Default", will trigger network fetch');
    }
    
    // Step 3: Reset filterDate to "Default" (this triggers useEffect if cache was empty)
    setFilterDate("Default");
  };

  // --- 7. Transform History to Rows Format ---
  const rows = useMemo(() => {
    return Array.isArray(history)
      ? history.map((record) => ({
          // ADJUST FIELD MAPPING TO YOUR HISTORY ENTITY
          id: record.id,
          title: record.History_Title || record.title || "Untitled",
          status: record.Status || record.status || "",
          category: record.Category || record.category || "",
          actionType: record.Action_Type || record.action_type || "",
          date: record.Created_Time 
            ? dayjs(record.Created_Time).format("DD/MM/YYYY")
            : "Invalid Date",
          time: record.Created_Time
            ? dayjs(record.Created_Time).format("HH:mm")
            : "--:--",
          description: record.Description || record.description || "",
          // Add other fields as needed
        }))
      : [];
  }, [history]);

  // --- 8. Reactive Filtering Logic ---
  const filteredRows = useMemo(() => {
    const filtered = rows.filter((row) => {
      // Status filter
      const statusMatch = filterStatus.length === 0 || filterStatus.includes(row.status);

      // Category filter
      const categoryMatch = filterCategory.length === 0 || filterCategory.includes(row.category);

      // Action Type filter
      const actionTypeMatch = filterActionType.length === 0 || filterActionType.includes(row.actionType);

      // Date filter using Day.js
      let dateMatch = true;
      if (customDateRange) {
        // Parse row date explicitly as DD/MM/YYYY format
        let rowDate = dayjs(row.date, "DD/MM/YYYY").startOf("day");
        
        // Fallback: if DD/MM/YYYY parsing fails, try ISO format
        if (!rowDate.isValid()) {
          rowDate = dayjs(row.date, "YYYY-MM-DD").startOf("day");
        }
        
        const startDate = dayjs(customDateRange.startDate, "YYYY-MM-DD").startOf("day");
        const endDate = dayjs(customDateRange.endDate, "YYYY-MM-DD").endOf("day");

        // Validate parsed dates
        if (!rowDate.isValid()) {
          console.warn(`⚠️ Invalid row date: "${row.date}"`);
          dateMatch = false;
        } else if (!startDate.isValid() || !endDate.isValid()) {
          console.warn(`⚠️ Invalid date range`);
          dateMatch = false;
        } else {
          // Use isBetween with inclusive boundaries ("[]")
          dateMatch = rowDate.isBetween(startDate, endDate, null, "[]");
        }
      } else if (filterDate && filterDate !== "Default") {
        // Use helper function for predefined ranges
        // You'll need to create a similar helper for History
        dateMatch = isHistoryDateInRange(row.date, filterDate);
      } else {
        // Default filter - show all
        dateMatch = true;
      }

      // Combine all filters with AND logic
      const result = statusMatch && categoryMatch && actionTypeMatch && dateMatch;
      return result;
    });
    
    return filtered;
  }, [
    rows,
    filterStatus,
    filterCategory,
    filterActionType,
    customDateRange,
    filterDate,
  ]);

  // --- 9. Generate Active Filter Names for Summary ---
  const getActiveFilterNames = () => {
    const activeFilters = [];
    
    // Date filter
    if (customDateRange) {
      activeFilters.push("Date");
    } else if (filterDate && filterDate !== "Default") {
      activeFilters.push("Date");
    }
    
    // Status filter
    if (filterStatus.length > 0) {
      activeFilters.push("Status");
    }
    
    // Category filter
    if (filterCategory.length > 0) {
      activeFilters.push("Category");
    }
    
    // Action Type filter
    if (filterActionType.length > 0) {
      activeFilters.push("Action Type");
    }
    
    return activeFilters;
  };

  const activeFilterNames = getActiveFilterNames();
  const hasActiveFilters = activeFilterNames.length > 0;

  // --- 10. Handle Date Filter Change ---
  const handleDateFilterChange = (e) => {
    const value = e.target.value;
    setFilterDate(value);
    if (value === "Custom Range") {
      // Open custom range modal (implement your modal component)
      // setOpenCustomRangeModal(true);
    } else {
      // Clear custom date range when switching to any other filter
      setCustomDateRange(null);
    }
  };

  // --- 11. Custom Range Modal Handler ---
  const handleCustomRangeSave = (range) => {
    setCustomDateRange(range);
    setFilterDate("Custom Range");
  };

  // --- 12. Render Component ---
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* Filter Controls */}
      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        {/* Date Filter */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Date</InputLabel>
          <Select
            value={filterDate}
            onChange={handleDateFilterChange}
            label="Date"
          >
            {filterDateOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Status Filter - ADJUST TO YOUR FILTERS */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            multiple
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            label="Status"
            renderValue={(selected) => selected.join(", ")}
          >
            {statusOptions.map((status) => (
              <MenuItem key={status} value={status}>
                <Checkbox checked={filterStatus.indexOf(status) > -1} />
                {status}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Category Filter - ADJUST TO YOUR FILTERS */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Category</InputLabel>
          <Select
            multiple
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            label="Category"
            renderValue={(selected) => selected.join(", ")}
          >
            {categoryOptions.map((category) => (
              <MenuItem key={category} value={category}>
                <Checkbox checked={filterCategory.indexOf(category) > -1} />
                {category}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Action Type Filter - ADJUST TO YOUR FILTERS */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Action Type</InputLabel>
          <Select
            multiple
            value={filterActionType}
            onChange={(e) => setFilterActionType(e.target.value)}
            label="Action Type"
            renderValue={(selected) => selected.join(", ")}
          >
            {actionTypeOptions.map((actionType) => (
              <MenuItem key={actionType} value={actionType}>
                <Checkbox checked={filterActionType.indexOf(actionType) > -1} />
                {actionType}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Clear Filters Button */}
        <Button
          variant="outlined"
          onClick={handleClearFilters}
          color="secondary"
          size="small"
        >
          Clear Filters
        </Button>
      </Box>

      {/* Summary Header */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 1,
          px: 2,
          py: 1,
          borderBottom: "1px solid #e0e0e0",
          backgroundColor: "#fafafa",
          mb: 2,
        }}
      >
        <Typography variant="body2" sx={{ color: "#666", fontSize: "0.875rem" }}>
          Total Records {filteredRows.length}
        </Typography>
        {hasActiveFilters && (
          <>
            <Typography variant="body2" sx={{ color: "#666", fontSize: "0.875rem" }}>
              •
            </Typography>
            <Typography variant="body2" sx={{ color: "#666", fontSize: "0.875rem" }}>
              Filter By {activeFilterNames.join(", ")}
            </Typography>
          </>
        )}
      </Box>

      {/* History Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {/* ADJUST COLUMNS TO YOUR HISTORY ENTITY */}
              <TableCell>Title</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Action Type</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No history records found
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.title}</TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell>{row.category}</TableCell>
                  <TableCell>{row.actionType}</TableCell>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>{row.time}</TableCell>
                  <TableCell>{row.description}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Custom Range Modal - Implement your modal component here */}
      {/* <CustomRangeModal
        open={openCustomRangeModal}
        onClose={() => setOpenCustomRangeModal(false)}
        onSave={handleCustomRangeSave}
      /> */}
    </Box>
  );
}
```

---

## Step 3: Create Helper Function for Date Range Checking

**File**: `src/components/historyHelperFunc.js`

```javascript
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

/**
 * Helper: Parse date from known formats
 */
const safeParseDateString = (dateString) => {
  if (!dateString || dateString === "NaN/NaN/NaN" || dateString === "") {
    return null;
  }

  // Try DD/MM/YYYY format explicitly
  const dmyPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const isoPattern = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

  if (dmyPattern.test(dateString)) {
    const [, day, month, year] = dateString.match(dmyPattern);
    const parsed = dayjs.utc(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`);
    if (parsed.isValid()) return parsed.startOf("day");
  }

  if (isoPattern.test(dateString)) {
    const parsed = dayjs.utc(dateString);
    if (parsed.isValid()) return parsed.startOf("day");
  }

  // Fallback to default Day.js parsing
  const fallback = dayjs.utc(dateString);
  if (fallback.isValid()) return fallback.startOf("day");

  console.warn(`❌ Failed to parse date: "${dateString}"`);
  return null;
};

/**
 * Check if a history date falls within a predefined range
 * ADJUST RANGE TYPES TO MATCH YOUR NEEDS
 */
export const isHistoryDateInRange = (date, rangeType) => {
  const parsedDate = safeParseDateString(date);
  if (!parsedDate) {
    console.warn(`⚠️ Invalid date for filtering: "${date}"`);
    return false;
  }

  const targetDate = parsedDate.valueOf();
  const today = dayjs.utc().startOf("day");

  let startDate, endDate;

  switch (rangeType) {
    case "Current Week":
      startDate = today.startOf("week").valueOf();
      endDate = today.startOf("week").add(6, "day").endOf("day").valueOf();
      break;
    case "Current Month":
      startDate = today.startOf("month").valueOf();
      endDate = today.endOf("month").valueOf();
      break;
    case "Last 7 Days":
      startDate = today.subtract(6, "day").valueOf();
      endDate = today.valueOf();
      break;
    case "Last 30 Days":
      startDate = today.subtract(29, "day").valueOf();
      endDate = today.valueOf();
      break;
    case "Last 90 Days":
      startDate = today.subtract(89, "day").valueOf();
      endDate = today.valueOf();
      break;
    case "Last Month":
      startDate = today.subtract(1, "month").startOf("month").valueOf();
      endDate = today.subtract(1, "month").endOf("month").valueOf();
      break;
    case "Next Week":
      startDate = today.add(7 - today.day(), "day").startOf("day").valueOf();
      endDate = dayjs.utc(startDate).add(6, "day").endOf("day").valueOf();
      break;
    case "Default":
    default:
      // Start from the beginning of the previous month
      startDate = today.subtract(1, "month").startOf("month").valueOf();
      endDate = null;
      break;
  }

  return endDate
    ? targetDate >= startDate && targetDate <= endDate
    : targetDate >= startDate;
};
```

---

## Step 4: Create Custom Range Modal Component

**File**: `src/components/atom/HistoryDateRangeModal.jsx`

```javascript
import React, { useState } from "react";
import {
  Modal,
  Box,
  Button,
  Typography,
  Grid,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";

const HistoryDateRangeModal = ({ open, handleClose, onSave }) => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const handleSearch = () => {
    if (startDate && endDate) {
      // Convert dayjs objects to YYYY-MM-DD format for API compatibility
      const startDateStr = startDate.format("YYYY-MM-DD");
      const endDateStr = endDate.format("YYYY-MM-DD");
      onSave({ startDate: startDateStr, endDate: endDateStr });
      handleClose();
    }
  };

  const handleModalClose = () => {
    // Reset dates when closing
    setStartDate(null);
    setEndDate(null);
    handleClose();
  };

  return (
    <Modal open={open} onClose={handleModalClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 400,
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 24,
          p: 4,
        }}
      >
        <Typography variant="h6" sx={{ mb: 3 }}>
          Select Date Range
        </Typography>
        
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={(newValue) => setStartDate(newValue)}
            format="DD-MM-YYYY"
            slotProps={{
              textField: {
                fullWidth: true,
                sx: { marginBottom: 2 },
              },
            }}
          />
          
          <DatePicker
            label="End Date"
            value={endDate}
            onChange={(newValue) => setEndDate(newValue)}
            format="DD-MM-YYYY"
            minDate={startDate || undefined}
            slotProps={{
              textField: {
                fullWidth: true,
                sx: { marginBottom: 2 },
              },
            }}
          />
        </LocalizationProvider>

        <Grid container spacing={2} sx={{ marginTop: 2 }}>
          <Grid item xs={6}>
            <Button variant="outlined" fullWidth onClick={handleModalClose}>
              Cancel
            </Button>
          </Grid>
          <Grid item xs={6}>
            <Button 
              variant="contained" 
              fullWidth 
              onClick={handleSearch} 
              disabled={!startDate || !endDate}
            >
              Search
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Modal>
  );
};

export default HistoryDateRangeModal;
```

---

## Step 5: Update History Widget to Use Custom Range Modal

Add this to your `HistoryWidget.jsx`:

```javascript
import HistoryDateRangeModal from "./atom/HistoryDateRangeModal";

// Add state for modal
const [openCustomRangeModal, setOpenCustomRangeModal] = useState(false);

// Update handleDateFilterChange
const handleDateFilterChange = (e) => {
  const value = e.target.value;
  setFilterDate(value);
  if (value === "Custom Range") {
    setOpenCustomRangeModal(true);
  } else {
    setCustomDateRange(null);
  }
};

// Add modal to render
{openCustomRangeModal && (
  <HistoryDateRangeModal
    open={openCustomRangeModal}
    handleClose={() => setOpenCustomRangeModal(false)}
    onSave={handleCustomRangeSave}
  />
)}
```

---

## Step 6: Update History Record (Optional)

If you need to update history records, add this function:

```javascript
/**
 * Update a history record with smart merge
 * Similar to updateEventState in App.jsx
 */
const updateHistoryState = (updatedRecord) => {
  const store = useHistoryStore.getState();
  
  // Step 1: Update global store master list
  store.updateHistory(updatedRecord);
  
  // Step 2: Update all cache entries
  store.updateCacheEntry(updatedRecord);
  
  // Step 3: Re-validate if record still matches current filter
  // (Similar logic to updateEventState)
  // ... add your re-validation logic here
};
```

---

## Step 7: Key Customization Points

### 1. Entity Name & Fields

**Find and Replace**:
- `Events` → `History` (or your entity name)
- `Start_DateTime` → `Created_Time` (or your date field)
- `Event_Title` → `History_Title` (or your title field)
- `Event_Status` → `Status` (or your status field)

### 2. Filter Options

**Customize**:
- `statusOptions` - Your status values
- `categoryOptions` - Your category values
- `actionTypeOptions` - Your action type values
- Add more filters as needed

### 3. API Query Fields

**Adjust**:
- Search criteria field names
- Entity name in URL
- Field names in response mapping

### 4. Table Columns

**Customize**:
- Column headers
- Field mappings in `rows` useMemo
- Display format

---

## Step 8: Complete Example Integration

Here's how to integrate everything:

```javascript
// In your main App or History page component
import HistoryWidget from "./components/HistoryWidget";

function HistoryPage() {
  return (
    <Box>
      <HistoryWidget />
    </Box>
  );
}
```

---

## Summary

This implementation provides:

✅ **Same Store Pattern**: Zustand store with caching  
✅ **Same Fetching Logic**: Intelligent cache checking before API calls  
✅ **Same Filtering Pattern**: Reactive useMemo filtering  
✅ **Same Clear Filters**: Cache restoration on reset  
✅ **Same Date Handling**: Explicit format parsing  
✅ **Customizable**: Easy to adapt to your History entity  

**Key Differences from Events Widget**:
- Different entity name (History vs Events)
- Different filter options (Status, Category, Action Type vs Type, Priority, User)
- Different date field (Created_Time vs Start_DateTime)
- Different field mappings

**Same Core Logic**:
- Store structure
- Caching mechanism
- Filtering pattern
- Clear filters restoration
- Date range calculations

Follow this pattern and customize the entity-specific parts to match your History widget requirements!
