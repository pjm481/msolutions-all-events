import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";

const DateRangeDialog = ({ open, onClose, onSave }) => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const handleSave = () => {
    if (startDate && endDate) {
      // Convert dayjs objects to YYYY-MM-DD format for API compatibility
      const startDateStr = startDate.format("YYYY-MM-DD");
      const endDateStr = endDate.format("YYYY-MM-DD");
      onSave({ startDate: startDateStr, endDate: endDateStr });
      onClose();
    }
  };

  const handleClose = () => {
    // Reset dates when closing
    setStartDate(null);
    setEndDate(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm" // Set dialog max width
      fullWidth // Make dialog width responsive
    >
      <DialogTitle>Select Date Range</DialogTitle>
      <DialogContent>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={(newValue) => setStartDate(newValue)}
            format="DD-MM-YYYY"
            slotProps={{
              textField: {
                fullWidth: true,
                sx: { mb: 3 },
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
                sx: { mb: 3 },
                InputLabelProps: {
                  shrink: true,
                },
              },
            }}
          />
        </LocalizationProvider>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="secondary" variant="outlined">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          color="primary"
          variant="contained"
          disabled={!startDate || !endDate}
        >
          Search
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DateRangeDialog;
