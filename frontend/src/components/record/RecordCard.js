import React from "react";
import {
  Card, CardContent, CardActions, Box, Stack, Typography, Chip,
  Button, IconButton, Tooltip, Divider
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";

export default function RecordCard({
  category = "Record",
  title = "Untitled record",
  meta = "",                 // e.g., "2025-08-22 • Dr. Perera"
  preview = "",              // short description
  onOpen, onEdit, onDelete, onDownload,
  rightSlot = null,          // optional extra content on the right of the header
}) {
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 2,
        border: (t) => `2px solid ${t.palette.divider}`, // highlighted border
        "&:hover": { borderColor: (t) => t.palette.primary.light, boxShadow: "0 6px 24px rgba(2,6,23,.06)" },
      }}
    >
      <CardContent sx={{ pb: 1.5 }}>
        <Stack direction="row" alignItems="flex-start" spacing={2}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Chip size="small" label={category} />
              <Typography variant="subtitle1" fontWeight={800} sx={{ minWidth: 0 }}>
                {title}
              </Typography>
            </Stack>

            {meta && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {meta}
              </Typography>
            )}

            {preview && (
              <Typography variant="body2" sx={{ mt: 1 }} noWrap>
                {preview}
              </Typography>
            )}
          </Box>

          {rightSlot}
        </Stack>
      </CardContent>

      <Divider />

      <CardActions sx={{ px: 2, py: 1.5, justifyContent: "space-between" }}>
        <Stack direction="row" spacing={1}>
          {onOpen && (
            <Button size="small" variant="outlined" startIcon={<OpenInNewIcon />} onClick={onOpen}>
              Open
            </Button>
          )}
          {onDownload && (
            <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={onDownload}>
              Download
            </Button>
          )}
        </Stack>

        <Stack direction="row" spacing={0.5}>
          {onEdit && (
            <Tooltip title="Edit">
              <IconButton size="small" onClick={onEdit}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {onDelete && (
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={onDelete}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </CardActions>
    </Card>
  );
}
