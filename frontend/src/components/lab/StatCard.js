import { Box, Typography } from "@mui/material";

export default function StatCard({ tone = "pending", icon, label, value }) {
  const tones = {
    pending: { dot: "#fbbf24", bgDot: "#fbbf241A" },
    completed: { dot: "#34d399", bgDot: "#34d3991A" },
    total: { dot: "#60a5fa", bgDot: "#60a5fa1A" },
  };
  const t = tones[tone] ?? tones.pending;

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 2,
        bgcolor: "white",
        display: "flex",
        alignItems: "center",
        gap: 2,
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,.08)",
        "&::after": {
          content: '""',
          position: "absolute",
          right: 8,
          top: 8,
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: t.dot,
          opacity: 0.1,
        },
      }}
    >
      <Box sx={{ color: t.dot, svg: { width: 28, height: 28 } }}>{icon}</Box>
      <Box>
        <Typography sx={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>
          {value}
        </Typography>
        <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
          {label}
        </Typography>
      </Box>
    </Box>
  );
}
