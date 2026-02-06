import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Button,
  ListItemText,
  Modal,
  Box,
  TextField,
  FormControlLabel,
  Typography,
} from "@mui/material";
import TableSortLabel from "@mui/material/TableSortLabel";
import { visuallyHidden } from "@mui/utils";
import ClearActivityModal from "./ClearActivityModal";
import EditActivityModal from "./EditActivityModal";
import CreateActivityModal from "./CreateActivityModal";
import { isDateInRange } from "./helperFunc";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import useEventsStore from "../store/eventsStore";

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

const headCells = [
  {
    id: "select",
    label: "",
  },
  {
    id: "title",
    label: "Title",
  },
  {
    id: "type",
    label: "Type",
  },
  {
    id: "date",
    label: "Date",
  },
  {
    id: "time",
    label: "Time",
  },
  {
    id: "priority",
    label: "Priority",
  },
  {
    id: "scheduledFor",
    label: "Scheduled For",
  },
  {
    id: "participants",
    label: "Scheduled With",
  },
  {
    id: "regarding",
    label: "Regarding",
  },
  {
    id: "duration",
    label: "Duration",
  },

  {
    id: "associateWith",
    label: "Associate With",
  },
];

const noSort = ["duration", "time"];

const convertDate = (date)=>{
  const [day, month, year] = date.split("/");
  return `${year}-${month}-${day}`;
}

function descendingComparator(a, b, orderBy) {
  // console.log(orderBy, b, a);
  if (noSort.includes(orderBy)) {
    return;
  }
  if (orderBy === "date") {
    const newB = new Date(convertDate(b[orderBy]));
    const newA = new Date(convertDate(a[orderBy]));
    
    if (newB < newA) {
      return -1;
    }
    if (newB > newA) {
      return 1;
    }
  }

  if (orderBy === "participants") {
    if (b[orderBy]?.[0]?.name < a[orderBy]?.[0]?.name) {
      return -1;
    }
    if (b[orderBy]?.[0]?.name > a[orderBy]?.[0]?.name) {
      return 1;
    }
    return;
  }

  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

function getComparator(order, orderBy) {
  return order === "desc"
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}
// Function to format dates
function formatDate(dateString) {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return "Invalid Date";
  }
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Custom TableCell component for conditional styling
const CustomTableCell = ({
  children,
  selectedRowIndex,
  index,
  row,
  highlightedRow,
  ...props
}) => {
  return (
    <TableCell
      sx={{
        color:
          highlightedRow === row.id
            ? "#FFFFFF"
            : selectedRowIndex === row.id
            ? "#FFFFFF"
            : row?.color || "black",
        fontSize: "9pt",
        p: ".2rem",
      }}
      {...props}
    >
      {children}
    </TableCell>
  );
};

function createData(event, type) {
  const rawStart = event.Start_DateTime;
  const rawEnd = event.End_DateTime;

  // Defensive: ensure these are strings
  const parsedStart =
    rawStart && typeof rawStart === "string" ? dayjs(rawStart) : null;
  const parsedEnd = rawEnd && typeof rawEnd === "string" ? dayjs(rawEnd) : null;

  const formattedDate = parsedStart?.isValid()
    ? parsedStart.format("DD/MM/YYYY")
    : "Invalid Date";

  const formattedTime = parsedStart?.isValid()
    ? parsedStart.format("HH:mm")
    : "--:--";

  const duration = event.Duration_Min
    ? `${event.Duration_Min} minutes`
    : parsedStart?.isValid() && parsedEnd?.isValid()
    ? `${parsedEnd.diff(parsedStart, "minute")} minutes`
    : "-";

  const scheduledFor =
    event.Owner?.name || event.scheduleFor?.full_name || "Unknown";

  const associateWith =
    event.What_Id?.name || event.associateWith?.Account_Name || "None";

  const participants = event.Participants || event.scheduledWith || [];

  const title = event.Event_Title || "Untitled Event";
  const color = event.Colour || "black";
  const Event_Status = event.Event_Status || "";

  return {
    title,
    type,
    date: formattedDate,
    time: formattedTime,
    priority: event.priority || event.Event_Priority || "",
    scheduledFor,
    participants,
    regarding: event.Regarding || "No Data",
    duration,
    associateWith,
    id: event.id || "No ID",
    color,
    Event_Status,
  };
}

// Custom Range Modal Component
const CustomRangeModal = ({ open, handleClose, setCustomDateRange }) => {
  const [startDate, setStartDate] = React.useState(null);
  const [endDate, setEndDate] = React.useState(null);

  const handleSearch = () => {
    if (startDate && endDate) {
      // Convert dayjs objects to YYYY-MM-DD format for API compatibility
      const startDateStr = startDate.format("YYYY-MM-DD");
      const endDateStr = endDate.format("YYYY-MM-DD");
      setCustomDateRange({ startDate: startDateStr, endDate: endDateStr });
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
        <h2>Select Date Range</h2>
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
                InputLabelProps: {
                  shrink: true,
                },
              },
            }}
          />
          <DatePicker
            label="End Date"
            value={endDate}
            onChange={(newValue) => setEndDate(newValue)}
            format="DD-MM-YYYY"
            minDate={startDate || undefined} // Prevent selecting end date before start date
            slotProps={{
              textField: {
                fullWidth: true,
                sx: { marginBottom: 2 },
                InputLabelProps: {
                  shrink: true,
                },
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
            <Button variant="contained" fullWidth onClick={handleSearch} disabled={!startDate || !endDate}>
              Search
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Modal>
  );
};

// Main ScheduleTable component
export default function ScheduleTable({
  events: eventsProp, // Keep for backward compatibility, but will use store
  ZOHO,
  users = [],
  filterDate,
  setFilterDate,
  loggedInUser,
  setEvents, // Keep for backward compatibility
  customDateRange,
  setCustomDateRange,
  updateEventState, // Keep for backward compatibility, but will use store
}) {
  // --- Global State Management (Zustand) ---
  // Read events from global store - this is the single source of truth
  const events = useEventsStore((state) => state.events);
  const loading = useEventsStore((state) => state.loading);
  const cache = useEventsStore((state) => state.cache);
  const { updateEvent, addEvent, removeEvent } = useEventsStore();
  
  // Wrapper for updateEventState that uses the store
  const handleUpdateEventState = React.useCallback((updatedEvent) => {
    // Update global store
    updateEvent(updatedEvent);
    // Also call the prop function if provided (for backward compatibility)
    if (updateEventState) {
      updateEventState(updatedEvent);
    }
  }, [updateEvent, updateEventState]);
  const [selectedRowIndex, setSelectedRowIndex] = React.useState(null);
  const [highlightedRow, setHighlightedRow] = React.useState(null);
  const [openClearModal, setOpenClearModal] = React.useState(false);
  const [openEditModal, setOpenEditModal] = React.useState(false);
  const [selectedRowData, setSelectedRowData] = React.useState(null);
  const [openCreateModal, setOpenCreateModal] = React.useState(false);
  const [openCustomRangeModal, setOpenCustomRangeModal] = React.useState(false);

  const [filterType, setFilterType] = React.useState([]);
  const [filterPriority, setFilterPriority] = React.useState([]);
  const [filterUser, setFilterUser] = React.useState(
    loggedInUser?.full_name ? [loggedInUser.full_name] : []
  );

  const [showCleared, setShowCleared] = React.useState(false); // State for "Cleared" checkbox

  const [order, setOrder] = React.useState("asc");
  const [orderBy, setOrderBy] = React.useState("");

  const filterDateOptions = [
    { label: "Default", value: "Default" },
    { label: "Last 7 Days", value: "Last 7 Days" },
    { label: "Last 30 Days", value: "Last 30 Days" },
    { label: "Last 90 Days", value: "Last 90 Days" },
    { label: "Last Month", value: "Last Month" },
    { label: "Current Week", value: "Current Week" },
    { label: "Current Month", value: "Current Month" },
    { label: "Next Week", value: "Next Week" },
    { label: "Custom Range", value: "Custom Range" }, // New custom range option
  ];

  const typeOptions = [
    "Meeting",
    "To-Do",
    "Call",
    "Appointment",
    "Boardroom",
    "Call Billing",
    "Email Billing",
    "Initial Consultation",
    "Mail",
    "Meeting Billing",
    "Personal Activity",
    "Room 1",
    "Room 2",
    "Room 3",
    "Todo Billing",
    "Vacation",
    "Other",
  ];

  const priorityOptions = ["Low", "Medium", "High"];

  // React.useEffect(() => {
  //   console.log({ events });
  //   events.forEach((event) => console.log(event.Owner));
  // }, []);

  const handleTypeChange = (event) => {
    const value = event.target.value;
    setFilterType(typeof value === "string" ? value.split(",") : value);
  };

  const handlePriorityChange = (event) => {
    const value = event.target.value;
    setFilterPriority(typeof value === "string" ? value.split(",") : value);
  };
  const handleUserChange = (event) => {
    const value = event.target.value;

    if (value.includes("select_all")) {
      const allUserNames = users.map((u) => u.full_name);
      setFilterUser(allUserNames);
      return;
    }

    if (value.includes("deselect_all")) {
      const fallback = loggedInUser?.full_name ? [loggedInUser.full_name] : [];
      setFilterUser(fallback);
      return;
    }

    // Regular selection: strip out command values
    const cleaned = value.filter(
      (v) => v !== "select_all" && v !== "deselect_all"
    );
    setFilterUser(cleaned);
  };

  const handleClearFilters = () => {
    // Step 1: Reset all filter states
    setFilterType([]);
    setFilterPriority([]);
    // Reset user filter to logged-in user only (default state)
    setFilterUser(loggedInUser?.full_name ? [loggedInUser.full_name] : []);
    setCustomDateRange(null);
    setShowCleared(false); // Reset "Show Cleared" checkbox
    
    // Step 2: Check cache for "Default" key and restore data immediately
    const store = useEventsStore.getState();
    const defaultCache = store.getCache("Default");
    
    if (defaultCache && defaultCache.data && defaultCache.data.length > 0) {
      // Cache exists - immediately restore events from cache
      console.log('✅ Restoring events from cache["Default"]:', defaultCache.data.length, 'events');
      store.setEvents(defaultCache.data);
    } else {
      // Cache is empty - will trigger network fetch via useEffect when filterDate changes
      console.log('⚠️ No cache found for "Default", will trigger network fetch');
    }
    
    // Step 3: Reset filterDate to "Default" (this triggers useEffect in App.jsx if cache was empty)
    setFilterDate("Default");
  };

  // Transform events to rows format
  // This is reactive - when events in the store change, rows will update
  const rows = React.useMemo(() => {
    return Array.isArray(events)
      ? events.map((event) =>
          createData(event, event.Type_of_Activity || "Other")
        )
      : [];
  }, [events]);

  // Reactive filtering - automatically re-calculates when:
  // - events in store change (via rows dependency)
  // - filter criteria change (filterType, filterPriority, etc.)
  // - This ensures that when an event's date is updated, the filtered list immediately reflects the change
  const filteredRows = React.useMemo(() => {
    // Debug: Log custom date range if it exists
    if (customDateRange) {
      console.log("🔍 Custom date range filter active:", customDateRange);
      console.log("📊 Total rows to filter:", rows.length);
    }
    
    const filtered = rows.filter((row) => {
      // Type filter
      const typeMatch =
        filterType.length === 0 || filterType.includes(row.type);

      // Priority filter
      const priorityMatch =
        filterPriority.length === 0 || filterPriority.includes(row.priority);

      // Enhanced user filter with debugging
      const userMatch =
        filterUser.length === 0 ||
        filterUser.some((user) => {
          const a = (row.scheduledFor || "").trim().toLowerCase();
          const b = (user || "").trim().toLowerCase();

          // console.log(`Comparing user: "${a}" vs "${b}"`);

          // Try both exact and flexible matching
          const exactMatch = a === b;
          const flexibleMatch = a.includes(b) || b.includes(a);

          // console.log(`Exact: ${exactMatch}, Flexible: ${flexibleMatch}`);
          return exactMatch || flexibleMatch;
        });

      // Enhanced date filter using Day.js
      let dateMatch = true;
      if (customDateRange) {
        // Parse row date explicitly as DD/MM/YYYY format (display format used in table)
        // e.g., "06/01/2026" = January 6, 2026 (not June 1st)
        // Use startOf("day") to normalize to midnight for accurate date-only comparison
        let rowDate = dayjs(row.date, "DD/MM/YYYY").startOf("day");
        
        // Fallback: if DD/MM/YYYY parsing fails, try other formats
        if (!rowDate.isValid()) {
          // Try ISO format as fallback
          rowDate = dayjs(row.date, "YYYY-MM-DD").startOf("day");
        }
        
        // HTML5 date input (type="date") always returns ISO format (YYYY-MM-DD)
        // Parse explicitly to avoid any locale-dependent parsing issues
        // Use startOf("day") to normalize to midnight for accurate date-only comparison
        const startDate = dayjs(customDateRange.startDate, "YYYY-MM-DD").startOf("day");
        const endDate = dayjs(customDateRange.endDate, "YYYY-MM-DD").endOf("day");

        // Validate parsed dates
        if (!rowDate.isValid()) {
          console.warn(`⚠️ Invalid row date: "${row.date}" - cannot parse as DD/MM/YYYY or YYYY-MM-DD`);
          dateMatch = false;
        } else if (!startDate.isValid() || !endDate.isValid()) {
          console.warn(`⚠️ Invalid date range: "${customDateRange.startDate}" - "${customDateRange.endDate}"`);
          console.warn(`   Start date valid: ${startDate.isValid()}, End date valid: ${endDate.isValid()}`);
          dateMatch = false;
        } else {
          // Use isBetween with inclusive boundaries ("[]") to include start and end dates
          dateMatch = rowDate.isBetween(startDate, endDate, null, "[]");
          // Debug logging - can be removed in production
          if (!dateMatch) {
            console.log(`❌ Date excluded: "${row.date}" (parsed as ${rowDate.format("YYYY-MM-DD")}) not between ${startDate.format("YYYY-MM-DD")} and ${endDate.format("YYYY-MM-DD")}`);
          } else {
            console.log(`✅ Date included: "${row.date}" (parsed as ${rowDate.format("YYYY-MM-DD")}) between ${startDate.format("YYYY-MM-DD")} and ${endDate.format("YYYY-MM-DD")}`);
          }
        }
      } else if (filterDate && filterDate !== "Default") {
        // Use your existing isDateInRange but with Day.js parsing
        const date = dayjs(row.date, "DD/MM/YYYY").utc();
        const today = dayjs().utc().startOf("day");

        // Add your existing date range logic here with Day.js
        dateMatch = isDateInRange(row.date, filterDate);
      } else {
        // Always use isDateInRange as a fallback (includes "Default")
        dateMatch = isDateInRange(row.date, filterDate || "Default");
      }

      const clearedMatch = showCleared ? true : row.Event_Status !== "Closed";

      const result =
        typeMatch && priorityMatch && clearedMatch && userMatch && dateMatch;
      // console.log(`Row "${row.title}": type=${typeMatch}, priority=${priorityMatch}, user=${userMatch}, date=${dateMatch}, cleared=${clearedMatch} -> ${result}`);

      return result;
    });
    
    // Debug: Log filtering results
    if (customDateRange) {
      console.log(`📈 Filter results: ${filtered.length} rows passed filter out of ${rows.length} total rows`);
    }
    
    return filtered;
  }, [
    rows,
    filterType,
    filterPriority,
    filterUser,
    customDateRange,
    filterDate,
    showCleared,
    order,
    orderBy,
  ]);
  console.log({date:rows?.map(el=>el?.date),date2:filteredRows?.map(el=>el?.date)})

  // Generate active filter names for summary display
  const getActiveFilterNames = () => {
    const activeFilters = [];
    
    // Date filter - show if Custom Range is set or if filterDate is not Default
    if (customDateRange) {
      activeFilters.push("Date");
    } else if (filterDate && filterDate !== "Default") {
      activeFilters.push("Date");
    }
    
    // Type filter - show if any types are selected
    if (filterType.length > 0) {
      activeFilters.push("Type");
    }
    
    // Priority filter - show if any priorities are selected
    if (filterPriority.length > 0) {
      activeFilters.push("Priority");
    }
    
    // User filter - show if filtering to a subset of users (not all users)
    // This means if filterUser.length < users.length, it's an active filter
    if (filterUser.length > 0 && filterUser.length < users.length) {
      activeFilters.push("User");
    }
    
    // Cleared filter - show if "Show Cleared" checkbox is checked
    if (showCleared) {
      activeFilters.push("Cleared");
    }
    
    return activeFilters;
  };

  const activeFilterNames = getActiveFilterNames();
  const hasActiveFilters = activeFilterNames.length > 0;

  // Checkbox handler
  const handleClearedCheckboxChange = (event) => {
    setShowCleared(event.target.checked);
  };

  const handleDateFilterChange = (e) => {
    const value = e.target.value;
    setFilterDate(value);
    if (value === "Custom Range") {
      setOpenCustomRangeModal(true);
    } else {
      // Clear custom date range when switching to any other filter
      setCustomDateRange(null);
    }
  };

  const handleClose = () => {
    setOpenClearModal(false);
    setOpenEditModal(false);
    setOpenCreateModal(false);
    setOpenCustomRangeModal(false);
  };

  const handleRowClick = (row) => {
    if (highlightedRow === row.id) {
      setHighlightedRow(null); // Unhighlight if clicked again
      setSelectedRowIndex(null);
    } else {
      setHighlightedRow(row.id); // Highlight the new row and reset any previously highlighted rows
      setSelectedRowIndex(row.id);
    }
    setSelectedRowData(row);
  };

  const handleRowDoubleClick = async (row) => {
    setHighlightedRow(row.id); // Highlight the new row and reset any previously highlighted rows
    setSelectedRowIndex(row.id);
    if (row?.id) {
      try {
        const response = await ZOHO.CRM.API.getRecord({
          Entity: "Events",
          approved: "both",
          RecordID: row.id,
        });

        if (response && response.data) {
          setSelectedRowData(response.data[0]);
        }
        setOpenEditModal(true);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }
  };

  const handleCheckboxChange = (index, row) => {
    setHighlightedRow(row.id); // Highlight the new row and reset any previously highlighted rows
    setSelectedRowIndex(row.id);
    if (row?.id) {
      async function getData() {
        try {
          const response = await ZOHO.CRM.API.getRecord({
            Entity: "Events",
            approved: "both",
            RecordID: row.id,
          });

          if (response && response.data) {
            setSelectedRowData(response.data[0]);
          }
          setOpenClearModal(true);
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      }
      getData();
      return;
    }
    setSelectedRowData(row);
    setOpenClearModal(true);
  };


  console.log({ events, filteredRows });

  return (
    <>
      {/* Filters */}
      <Box
        sx={{ display: "flex", gap: "1rem", my: "1rem", alignItems: "center" }}
      >
        <FormControl fullWidth size="small">
          <InputLabel sx={{ fontSize: "9pt" }}>Date</InputLabel>
          <Select
            value={filterDate}
            onChange={handleDateFilterChange}
            label="Date"
            size="small"
            renderValue={(selected) => (
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 0.5,
                  fontSize: "9pt", // Set font size for selected text
                }}
              >
                <Box>{selected}</Box>
              </Box>
            )}
            sx={{
              height: "30px", // Adjust height
              "& .MuiSelect-select": {
                fontSize: "9pt", // Ensure selected font size
              },
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  "& .MuiMenuItem-root": {
                    fontSize: "9pt", // Adjust font size for dropdown options
                  },
                },
              },
            }}
          >
            {filterDateOptions.map((option, index) => (
              <MenuItem key={index} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel sx={{ fontSize: "9pt" }}>Type</InputLabel>
          <Select
            multiple
            value={filterType}
            onChange={handleTypeChange}
            label="Type"
            size="small"
            renderValue={(selected) => {
              if (selected.length === 0) return "Select Type";
              const displayedValues = selected.slice(0, 4).join(", "); // Show up to 2 items
              return selected.length > 4
                ? `${displayedValues}, ...`
                : displayedValues;
            }}
            sx={{
              height: "30px",
              "& .MuiSelect-select": {
                fontSize: "9pt",
              },
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  "& .MuiMenuItem-root": {
                    fontSize: "9pt",
                  },
                },
              },
            }}
          >
            {typeOptions.map((type) => (
              <MenuItem key={type} value={type}>
                <Checkbox
                  checked={filterType.indexOf(type) > -1}
                  sx={{ height: "20px" }}
                />
                {type}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel sx={{ fontSize: "9pt" }}>Priority</InputLabel>
          <Select
            multiple
            value={filterPriority}
            onChange={handlePriorityChange}
            label="Priority"
            size="small"
            renderValue={(selected) => (
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 0.5,
                  fontSize: "9pt", // Set font size for selected text
                }}
              >
                {selected.map((value) => (
                  <Box key={value}>{value}</Box>
                ))}
              </Box>
            )}
            sx={{
              height: "30px", // Adjust height
              "& .MuiSelect-select": {
                fontSize: "9pt", // Ensure selected font size
              },
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  "& .MuiMenuItem-root": {
                    fontSize: "9pt", // Adjust font size for dropdown options
                  },
                },
              },
            }}
          >
            {priorityOptions.map((priority) => (
              <MenuItem key={priority} value={priority}>
                <Checkbox
                  checked={filterPriority.indexOf(priority) > -1}
                  sx={{ height: "20px" }} // Adjust checkbox height
                />
                {priority}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel sx={{ fontSize: "9pt" }}>User</InputLabel>
          <Select
            multiple
            value={filterUser}
            onChange={handleUserChange}
            // label="User"
            size="small"
            renderValue={(selected) => {
              if (selected.length === 0) return "Select User";
              const displayedValues = selected.slice(0, 3).join(", ");
              return selected.length > 3
                ? `${displayedValues}, ...`
                : displayedValues;
            }}
            sx={{
              height: "30px",
              "& .MuiSelect-select": {
                fontSize: "9pt",
              },
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  "& .MuiMenuItem-root": {
                    fontSize: "9pt",
                  },
                },
              },
            }}
          >
            <MenuItem value="select_all">
              <Checkbox
                checked={filterUser.length === users.length && users.length > 0} // ✅ only true when all users are selected
                indeterminate={
                  filterUser.length > 0 && filterUser.length < users.length
                }
                size="small"
              />
              <ListItemText primary="Select All" />
            </MenuItem>

            <MenuItem value="deselect_all">
              <Checkbox
                checked={
                  filterUser.length === 1 &&
                  filterUser[0] === loggedInUser?.full_name
                } // ✅ only true when only logged-in user is selected
                size="small"
              />
              <ListItemText primary="Deselect All" />
            </MenuItem>

            {/* Users */}
            {users.map((user) => (
              <MenuItem key={user.id} value={user.full_name}>
                <Checkbox
                  checked={filterUser.includes(user.full_name)}
                  size="small"
                />
                <ListItemText primary={user.full_name} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="outlined"
          fullWidth
          onClick={handleClearFilters}
          color="secondary"
          size="small" // Reduced button size
          sx={{ height: "30px" }} // Adjust height
        >
          Clear filter
        </Button>

        <FormControlLabel
          control={
            <Checkbox
              checked={showCleared} // Bind to state
              onChange={handleClearedCheckboxChange} // Checkbox change handler
              size="small" // Reduced checkbox size
            />
          }
          label="Show Cleared"
          sx={{
            display: "flex", // Ensure label and checkbox are aligned in a row
            alignItems: "center", // Vertically align the label and checkbox
            whiteSpace: "nowrap", // Prevent text wrapping
            "& .MuiFormControlLabel-label": {
              fontSize: "9pt", // Change label text size
            },
          }}
        />

        <Button
          variant="contained"
          fullWidth
          onClick={() => setOpenCreateModal(true)}
          size="small" // Reduced button size
          sx={{ height: "30px" }} // Adjust height
        >
          Create New Activity
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
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: "#666",
            fontSize: "0.875rem",
          }}
        >
          Total Records {filteredRows.length}
        </Typography>
        {hasActiveFilters && (
          <>
            <Typography
              variant="body2"
              sx={{
                color: "#666",
                fontSize: "0.875rem",
              }}
            >
              •
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "#666",
                fontSize: "0.875rem",
              }}
            >
              Filter By {activeFilterNames.join(", ")}
            </Typography>
          </>
        )}
      </Box>

      {/* Table */}
      <TableContainer
        component={Paper}
        sx={{ maxHeight: "100vh", overflowY: "auto" }}
      >
        <Table stickyHeader sx={{ minWidth: 650 }} aria-label="schedule table">
          <TableHead>
            <TableRow>
              {headCells.map((el) => {
                return (
                  <TableCell
                    key={el.id}
                    onClick={(e) => {
                      // console.log(el.id);
                      const isAsc = orderBy === el.id && order === "asc";
                      setOrder(isAsc ? "desc" : "asc");
                      setOrderBy(el.id);
                    }}
                    padding="checkbox"
                    sx={{
                      bgcolor: "#efefef",
                      fontWeight: "bold",
                      fontSize: "9pt",
                      // p: el.id === "select" ? "" : ".6rem",
                      cursor: "pointer",
                      p: ".2rem",
                    }}
                  >
                    {noSort.includes(el.id) ? (
                      el.label
                    ) : (
                      <TableSortLabel
                        active={orderBy === el.id}
                        direction={orderBy === el.id ? order : "asc"}
                        // onClick={createSortHandler(headCell.id)}
                      >
                        {el.label}
                        {orderBy === el.id ? (
                          <Box component="span" sx={visuallyHidden}>
                            {order === "desc"
                              ? "sorted descending"
                              : "sorted ascending"}
                          </Box>
                        ) : null}
                      </TableSortLabel>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} align="center">
                  No events found
                </TableCell>
              </TableRow>
            ) : (
              filteredRows?.sort(getComparator(order, orderBy))
                .map((row, index) => (
                  <TableRow
                    key={index}
                    sx={{
                      backgroundColor:
                        highlightedRow === row.id ||
                        (selectedRowIndex === row.id && openClearModal)
                          ? "#0072DC"
                          : index % 2 === 0
                          ? "white"
                          : "#efefef",
                      color:
                        highlightedRow === row.id ||
                        (selectedRowIndex === row.id && openClearModal)
                          ? "#FFFFFF"
                          : "black",
                      position: "relative",
                      textDecoration:
                        row.Event_Status === "Closed" ? "line-through" : "none",
                      cursor: "pointer",
                      py: 0,
                    }}
                    onClick={() => handleRowClick(row)}
                    onDoubleClick={() => handleRowDoubleClick(row)}
                  >
                    <TableCell
                      padding="checkbox"
                      onClick={(e) => e.stopPropagation()}
                      sx={{ paddingY: 0 }}
                    >
                      <Checkbox
                        checked={selectedRowIndex === index && openClearModal}
                        onChange={() => handleCheckboxChange(index, row)}
                        sx={{
                          color:
                            selectedRowIndex === index ? "#fff" : "inherit",
                          transform: "scale(0.9)", // Scale down the checkbox size
                          "& .MuiSvgIcon-root": {
                            fontSize: "1.2rem", // Adjust the icon size inside the checkbox
                          },
                        }}
                      />
                    </TableCell>
                    <CustomTableCell
                      selectedRowIndex={selectedRowIndex}
                      index={index}
                      row={row}
                      highlightedRow={highlightedRow}
                    >
                      {row.title}
                    </CustomTableCell>
                    <CustomTableCell
                      selectedRowIndex={selectedRowIndex}
                      index={index}
                      row={row}
                      highlightedRow={highlightedRow}
                    >
                      {row.type}
                    </CustomTableCell>
                    {/* {console.log({redwan: row.date})} */}
                    <CustomTableCell
                      selectedRowIndex={selectedRowIndex}
                      index={index}
                      row={row}
                      highlightedRow={highlightedRow}
                    >
                      
                      {row.date}
                    </CustomTableCell>
                    <CustomTableCell
                      selectedRowIndex={selectedRowIndex}
                      index={index}
                      row={row}
                      highlightedRow={highlightedRow}
                    >
                      {row.time}
                    </CustomTableCell>
                    <CustomTableCell
                      selectedRowIndex={selectedRowIndex}
                      index={index}
                      row={row}
                      highlightedRow={highlightedRow}
                    >
                      {row.priority}
                    </CustomTableCell>
                    <CustomTableCell
                      selectedRowIndex={selectedRowIndex}
                      index={index}
                      row={row}
                      highlightedRow={highlightedRow}
                    >
                      {row.scheduledFor}
                    </CustomTableCell>
                    <TableCell sx={{ fontSize: "9pt", py: 0 }}>
                      {row.participants.length > 0
                        ? row.participants.map((participant, i) => (
                            <React.Fragment key={i}>
                              <a
                                href={`https://crm.zoho.com.au/crm/org7004396182/tab/Contacts/${participant.participant}/canvas/76775000000287551`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color:
                                    selectedRowIndex === row.id
                                      ? "#fff"
                                      : "#0072DC",
                                  textDecoration: "underline",
                                  fontSize: "9pt",
                                }}
                              >
                                {participant.name || participant.Full_Name}
                              </a>
                              {i < row.participants.length - 1 && ", "}
                            </React.Fragment>
                          ))
                        : "No Participants"}
                    </TableCell>
                    <CustomTableCell
                      selectedRowIndex={selectedRowIndex}
                      index={index}
                      row={row}
                      highlightedRow={highlightedRow}
                    >
                      {row.regarding}
                    </CustomTableCell>
                    <CustomTableCell
                      selectedRowIndex={selectedRowIndex}
                      index={index}
                      row={row}
                      highlightedRow={highlightedRow}
                    >
                      {row.duration}
                    </CustomTableCell>
                    <CustomTableCell
                      selectedRowIndex={selectedRowIndex}
                      index={index}
                      row={row}
                      highlightedRow={highlightedRow}
                    >
                      {row.associateWith}
                    </CustomTableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modals */}
      {openClearModal && (
        <ClearActivityModal
          open={openClearModal}
          handleClose={handleClose}
          selectedRowData={selectedRowData}
          ZOHO={ZOHO}
          users={users}
          setEvents={setEvents}
          filterDate={filterDate}
        />
      )}

      {openEditModal && (
        <EditActivityModal
          open={openEditModal}
          handleClose={handleClose}
          selectedRowData={selectedRowData}
          ZOHO={ZOHO}
          users={users}
          updateEventState={handleUpdateEventState}
        />
      )}

      {openCreateModal && (
        <CreateActivityModal
          open={openCreateModal}
          handleClose={handleClose}
          ZOHO={ZOHO}
          users={users}
          loggedInUser={loggedInUser}
          setEvents={setEvents}
          setSelectedRowIndex={setSelectedRowIndex}
          setHighlightedRow={setHighlightedRow}
        />
      )}

      <CustomRangeModal
        open={openCustomRangeModal}
        handleClose={handleClose}
        setCustomDateRange={setCustomDateRange}
      />
    </>
  );
}
