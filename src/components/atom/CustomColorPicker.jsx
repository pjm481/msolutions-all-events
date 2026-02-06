import { Box, Button, Typography } from "@mui/material";
import React, { useState } from "react";

const colors = [
  "#ff0000",
  "#ff9900",
  "#ffff00",
  "#00ff00",
  "#00ffff",
  "#0000ff",
  "#9900ff",
  "#ff00ff",
  "#ff9999",
  "#ffcc99",
  "#ffff99",
  "#ccff99",
  "#99ffcc",
  "#99ccff",
  "#cc99ff",
  "#ff99ff",
  "#660000",
  "#996633",
  "#669933",
  "#336600",
  "#006666",
  "#003366",
  "#660066",
  "#660033",
  "#cc0000",
  "#cc6600",
  "#cccc00",
  "#66cc00",
  "#00cccc",
  "#0066cc",
  "#6600cc",
  "#cc00cc",
  "#999999",
  "#cccccc",
  "#333333",
  "#666666",
];

const CustomColorPicker = ({ recentColors, handleClose, handleColorChange }) => {
  const [selectedColor, setSelectedColor] = useState("#ffffff");
  const [customColor, setCustomColor] = useState("#ffffff");

  const handleColorClick = (color) => {
    setSelectedColor(color);
    handleColorChange(color);
  };

  const handleCustomColorChange = (e) => {
    const color = e.target.value;
    setCustomColor(color);
    setSelectedColor(color);
    handleColorChange(color);
  };

  return (
    <div
      style={{
        padding: "15px 25px",
        maxWidth: "320px",
        border: "1px solid #e0e0e0",
        borderRadius: "10px",
        backgroundColor: "#fdfdfd",
        zIndex: 1000,
        // position: "relative",
        boxShadow: "0 10px 20px rgba(0, 0, 0, 0.15)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 2,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: "bold" }}>
          Color Picker
        </Typography>
        <Button
          variant="contained"
          onClick={handleClose}
          size="small"
        >
          OK
        </Button>
      </Box>

      {/* Basic Colors Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(8, 30px)",
          gap: "6px",
          marginBottom: "15px",
        }}
      >
        {colors.map((color, index) => (
          <div
            key={index}
            onClick={() => handleColorClick(color)}
            style={{
              width: "20px",
              height: "20px",
              backgroundColor: color,
              border: selectedColor === color ? "1px solid #000" : "1px solid #ccc",
              cursor: "pointer",
              borderRadius: "4px",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              zIndex: 1000,
            }}
          ></div>
        ))}
      </div>

      {/* Recent Colors Section */}
      {recentColors.length > 0 && (
        <div style={{ marginBottom: "15px" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: "bold", marginBottom: "8px" }}>
            Recent Colors:
          </Typography>
          <div style={{ display: "flex", gap: "6px" }}>
            {recentColors.map((color, index) => (
              <div
                key={index}
                onClick={() => handleColorClick(color)}
                style={{
                  width: "20px",
                  height: "20px",
                  backgroundColor: color,
                  border: selectedColor === color ? "1px solid #000" : "1px solid #ccc",
                  cursor: "pointer",
                  borderRadius: "4px",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                  zIndex: 1000,
                }}
              ></div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Color Input */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
          Custom Color:
        </Typography>
        <input
          type="color"
          id="customColor"
          value={customColor}
          onChange={handleCustomColorChange}
          style={{
            width: "35px",
            height: "35px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          }}
        />
      </Box>
    </div>
  );
};

export default CustomColorPicker;
