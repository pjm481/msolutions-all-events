import React from 'react';
import { TextField } from '@mui/material';

const CustomTextField = ({ onChange, value, ...props }) => {
  return (
    <TextField
      variant="outlined"
      size="small"
      fullWidth
      autoComplete="off"
      value={value}
      onChange={onChange}
      {...props}
      sx={{
        height: "32px", // Set a smaller height for the field
        "& .MuiOutlinedInput-root": {
          height: "100%", // Ensure the input root matches the defined height
          padding: "0px 8px", // Adjust the padding for a compact look
          fontSize: "9pt", // Adjust the font size of the text inside
        },
        "& .MuiInputLabel-root": {
          fontSize: "9pt", // Adjust the label font size
        },
        "& .MuiOutlinedInput-input": {
          padding: "6px 8px", // Further control padding inside the input
        },
      }}
    />
  );
};

export default CustomTextField;
