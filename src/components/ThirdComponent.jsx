import {
  Box,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid2 as Grid,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material";
import React, { useEffect } from "react";
import { DesktopDateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const ThirdComponent = ({ formData, handleInputChange, selectedRowData }) => {

  useEffect(() => {
    const rrule = selectedRowData?.Recurring_Activity?.RRULE;

    if (rrule) {
      const rruleParts = rrule.split(";");
      const rruleMap = {};
      rruleParts.forEach((part) => {
        const [key, value] = part.split("=");
        rruleMap[key] = value;
      });

      const freq = rruleMap["FREQ"]?.toLowerCase();
      const dtStartDate = rruleMap["DTSTART"];
      const untilDate = rruleMap["UNTIL"];

      const startTime = selectedRowData?.Start_DateTime
        ? dayjs(selectedRowData.Start_DateTime)
        : dayjs().hour(9).minute(0).second(0);

      const endTime = selectedRowData?.End_DateTime
        ? dayjs(selectedRowData.End_DateTime)
        : dayjs().hour(17).minute(0).second(0);

      if (freq) handleInputChange("occurrence", freq);

      if (dtStartDate) {
        const datePart = dayjs(dtStartDate);
        const mergedStart = datePart
          .hour(startTime.hour())
          .minute(startTime.minute())
          .second(0);
        handleInputChange("startTime", mergedStart.toISOString());
      }

      if (untilDate) {
        const datePart = dayjs(untilDate);
        const mergedEnd = datePart
          .hour(endTime.hour())
          .minute(endTime.minute())
          .second(0);
        handleInputChange("endTime", mergedEnd.toISOString());
      }

      handleInputChange("noEndDate", false); // Ensure checkbox logic is skipped
    } else {
      const timeStart = dayjs(formData.start);
      const timeEnd = dayjs(formData.end);
      handleInputChange("startTime",timeStart);
      handleInputChange("endTime",timeEnd);

      console.log({ startTime:timeStart, endTIME:  timeEnd.toISOString()});

      if (!formData.startTime) {
        const currentTime = dayjs().toISOString();
        handleInputChange("startTime", currentTime);
        handleInputChange(
          "endTime",
          dayjs(currentTime).add(1, "hour").toISOString()
        );
      }

      if (!formData.occurrence) {
        handleInputChange("occurrence", "once");
      }
    }
  }, [formData.start, formData.end]);

  const isRecurring = !!selectedRowData?.Recurring_Activity?.RRULE;
  const startTimeValue = formData?.startTime && dayjs(formData.startTime).isValid()
    ? dayjs(formData.startTime)
    : null;
  const endTimeValue = formData?.endTime && dayjs(formData.endTime).isValid()
    ? dayjs(formData.endTime)
    : null;
  const minEndDate = formData?.startTime && dayjs(formData.startTime).isValid()
    ? dayjs(formData.startTime)
    : null;
  const maxEndDate = minEndDate ? minEndDate.add(1, "year") : null;

  return (
    <Box>
      <FormControl>
        <FormLabel id="demo-radio-buttons-group-label" sx={{ fontSize: "9pt" }}>
          Frequency
        </FormLabel>
        <RadioGroup
          aria-labelledby="demo-radio-buttons-group-label"
          name="radio-buttons-group"
          value={formData.occurrence || "once"}
          onChange={(e) => handleInputChange("occurrence", e.target.value)}
        >
          {["once", "daily", "weekly", "monthly", "yearly"].map((option) => (
            <FormControlLabel
              key={option}
              value={option}
              control={<Radio size="small" />}
              label={`${
                option.charAt(0).toUpperCase() + option.slice(1)
              } (This activity occurs ${option})`}
              sx={{ "& .MuiTypography-root": { fontSize: "9pt" } }}
            />
          ))}
        </RadioGroup>
      </FormControl>

      <Grid container spacing={2} sx={{ mt: 1, py: 1 }}>
        <Grid size={6}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography
              variant="body1"
              sx={{ fontSize: "9pt", minWidth: "80px" }}
            >
              Starts:
            </Typography>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DesktopDateTimePicker
                value={startTimeValue}
                disabled={isRecurring}
                onChange={(value) =>
                  handleInputChange("startTime", value ? value.toISOString() : null)
                }
                slotProps={{ textField: { size: "small" } }}
                format="DD/MM/YYYY hh:mm A"
                sx={{ minWidth: 180 }}
              />
            </LocalizationProvider>
          </Box>
        </Grid>
        <Grid size={6}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography
              variant="body1"
              sx={{ fontSize: "9pt", minWidth: "80px" }}
            >
              Ends:
            </Typography>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DesktopDateTimePicker
                value={endTimeValue}
                disabled={isRecurring}
                minDateTime={minEndDate}
                maxDateTime={maxEndDate}
                onChange={(value) => {
                  if (!value) {
                    handleInputChange("endTime", null);
                    return;
                  }
                  const currentEnd = dayjs(formData?.endTime);
                  const merged = currentEnd.isValid()
                    ? value
                        .hour(currentEnd.hour())
                        .minute(currentEnd.minute())
                        .second(currentEnd.second())
                    : value;
                  handleInputChange("endTime", merged.toISOString());
                }}
                slotProps={{ textField: { size: "small" } }}
                format="DD/MM/YYYY hh:mm A"
                sx={{ minWidth: 180 }}
              />
            </LocalizationProvider>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ThirdComponent;
