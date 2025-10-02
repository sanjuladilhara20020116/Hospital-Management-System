import React, { useMemo, useState } from "react";
import {
  Box, Paper, Stack, Typography, Chip, Button, Divider, Avatar
} from "@mui/material";
import FavoriteBorder from "@mui/icons-material/FavoriteBorder";
import OpacityOutlined from "@mui/icons-material/OpacityOutlined";
import InsertDriveFileOutlined from "@mui/icons-material/InsertDriveFileOutlined";
import CalendarMonthOutlined from "@mui/icons-material/CalendarMonthOutlined";
import BarChartOutlined from "@mui/icons-material/BarChartOutlined";
import ArrowForwardIos from "@mui/icons-material/ArrowForwardIos";
import TrendingUp from "@mui/icons-material/TrendingUp";
import NotificationsActiveOutlined from "@mui/icons-material/NotificationsActiveOutlined";
import PageviewOutlined from "@mui/icons-material/PageviewOutlined";
import { useNavigate } from "react-router-dom";

/** props:
 *  reports?: [{ _id, reportType|testType, uploadDate, completedAt, isAnalyzed, hasReport, fileName, referenceNo }]
 *  patientId: string
 *  apiBase?: string (defaults to '/api')
 */
export default function LabAnalysisTab({
  reports = [],
  patientId,
  apiBase = "/api",
}) {
  const [selectedType, setSelectedType] = useState("Cholesterol");
  const [analyzingId, setAnalyzingId] = useState(null);
  const navigate = useNavigate();

  // Fallback when nothing is passed (keeps the UI pretty in empty states)
  const mock = {
    Cholesterol: { hasNewReport: false, newReport: null, lastAnalysis: null },
    Diabetic: { hasNewReport: false, newReport: null, lastAnalysis: null },
  };

  // Normalize incoming reports into Cholesterol / Diabetic buckets
  const data = useMemo(() => {
    if (!reports?.length) return mock;

    const typ = (r) => r.testType ?? r.reportType ?? "";
    const isChol = (r) => String(typ(r)).toLowerCase().includes("chol");
    const isDiab = (r) => String(typ(r)).toLowerCase().includes("diab");

    const pick = (arr) => {
      const sorted = [...arr].sort(
        (a, b) =>
          new Date(b.completedAt || b.uploadDate || 0) -
          new Date(a.completedAt || a.uploadDate || 0)
      );

      // first not analyzed (most recent)
      const newOne = sorted.find((r) => (r.hasReport !== false) && !r.isAnalyzed);
      // most recent analyzed
      const lastDone = sorted.find((r) => r.isAnalyzed);

      const toCard = (r) => ({
        id: r._id || r.reportId || r.referenceNo || r.id,
        _id: r._id, // keep raw when available
        uploadDate: r.completedAt || r.uploadDate,
        fileName:
          r.fileName ||
          r.originalName ||
          `${(r.testType || r.reportType || "Report")}_${r.referenceNo || r._id || ""}.pdf`,
        status: r.isAnalyzed ? "analyzed" : "unanalyzed",
        referenceNo: r.referenceNo,
        viewUrl: r.viewUrl, // optional if BE provides it directly
      });

      return {
        hasNewReport: !!newOne,
        newReport: newOne ? toCard(newOne) : null,
        lastAnalysis: lastDone
          ? {
              reportId:
                lastDone._id ||
                lastDone.reportId ||
                lastDone.referenceNo ||
                lastDone.id,
              analyzedDate: lastDone.completedAt || lastDone.uploadDate,
              summary: "Previous analysis available.",
              trend: "stable",
              keyFindings: ["—", "—", "—"],
            }
          : null,
      };
    };

    return {
      Cholesterol: pick(reports.filter(isChol)),
      Diabetic: pick(reports.filter(isDiab)),
    };
  }, [reports]);

  const current = data[selectedType];

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—";

  // Helpers
  const getReportIdFrom = (j, fallback) =>
    j?.reportId || j?.report?._id || j?._id || j?.id || fallback || null;

  const openInlineView = (idOrUrl) => {
    if (!idOrUrl) return;
    if (/^https?:\/\//i.test(idOrUrl)) {
      window.open(idOrUrl, "_blank", "noopener,noreferrer");
      return;
    }
    const url = `${apiBase}/reports/${encodeURIComponent(idOrUrl)}/view`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Analyze handler calls unified /api/analyze with { key }
  const handleAnalyze = async (idOrRef) => {
    if (!idOrRef) return;
    try {
      setAnalyzingId(idOrRef);

      const r = await fetch(`${apiBase}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: idOrRef }),
      });

      // Backend may enforce order with 412
      if (r.status === 412) {
        const j = await r.json().catch(() => ({}));
        if (j?.code === "OLDER_UNANALYZED_EXISTS" && j?.nextId) {
          const go = window.confirm(
            "An older report hasn’t been analyzed yet. Analyze the older one first?"
          );
          if (go) {
            // recursively analyze the older one
            return handleAnalyze(j.nextId);
          }
        }
        throw new Error(j?.message || "Analysis blocked.");
      }

      // treat 409 (already analyzed) as success
      if (r.status === 409) {
        const j = await r.json().catch(() => ({}));
        const repId = getReportIdFrom(j, idOrRef);
        if (!repId) throw new Error("Analyze OK but no report id returned (409).");
        return navigate(`/reports/${encodeURIComponent(repId)}/analysis`);
      }

      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.message || "Analyze failed");

      const repId = getReportIdFrom(j, idOrRef);
      if (!repId) throw new Error("Analyze OK but no report id returned.");
      navigate(`/reports/${encodeURIComponent(repId)}/analysis`);
    } catch (e) {
      console.error(e);
      alert(e.message);
    } finally {
      setAnalyzingId(null);
    }
  };

  const TypeCard = ({ active, icon, title, hasNew }) => (
    <Paper
      onClick={() => setSelectedType(title)}
      elevation={active ? 6 : 1}
      sx={{
        p: 2.5,
        width: 220,
        borderRadius: 3,
        cursor: "pointer",
        userSelect: "none",
        transition: "all .2s",
        bgcolor: active ? "rgba(118,75,162,.08)" : "#fff",
        border: active ? "2px solid rgba(102,126,234,.6)" : "1px solid rgba(0,0,0,.06)",
        "&:hover": { transform: "translateY(-2px)" },
      }}
    >
      <Stack spacing={1.5} alignItems="center">
        <Avatar
          sx={{
            bgcolor: active ? "primary.main" : "rgba(118,75,162,.12)",
            color: active ? "#fff" : "primary.main",
            width: 48, height: 48,
          }}
        >
          {icon}
        </Avatar>
        <Typography fontWeight={800}>{title}</Typography>
        <Chip
          size="small"
          label={hasNew ? "New report" : "Previous analysis"}
          color={hasNew ? "success" : "default"}
          variant={hasNew ? "filled" : "outlined"}
        />
      </Stack>
    </Paper>
  );

  const bannerHasNew = current?.hasNewReport;
  const bannerText = bannerHasNew
    ? `New ${selectedType} report received`
    : `Latest ${selectedType} analysis`;

  return (
    <Box>
      {/* Top heading */}
      <Stack spacing={1} sx={{ mb: 3 }} alignItems="center">
        <Typography variant="h5" fontWeight={900}>
          Lab Report Analysis
        </Typography>
        <Typography color="text.secondary">
          Select a report type to analyze your results
        </Typography>
      </Stack>

      {/* Selector */}
      <Stack direction="row" spacing={2.5} justifyContent="center" sx={{ mb: 3 }}>
        <TypeCard
          active={selectedType === "Cholesterol"}
          title="Cholesterol"
          hasNew={data.Cholesterol?.hasNewReport}
          icon={<FavoriteBorder />}
        />
        <TypeCard
          active={selectedType === "Diabetic"}
          title="Diabetic"
          hasNew={data.Diabetic?.hasNewReport}
          icon={<OpacityOutlined />}
        />
      </Stack>

      {/* Content */}
      <Paper
        sx={{
          borderRadius: 3,
          overflow: "hidden",
          bgcolor: "rgba(255,255,255,.96)",
          border: "1px solid rgba(255,255,255,.25)",
          boxShadow: "0 20px 40px rgba(0,0,0,.08)",
        }}
      >
        {/* header strip with banner */}
        <Box
          sx={{
            px: 3, py: 2,
            background: "linear-gradient(90deg, rgba(102,126,234,.08), rgba(118,75,162,.08))",
            borderBottom: "1px solid #EEF2F7",
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ bgcolor: "primary.main", width: 28, height: 28, fontSize: 16 }}>
                {selectedType === "Cholesterol"
                  ? <FavoriteBorder fontSize="inherit" />
                  : <OpacityOutlined fontSize="inherit" />
                }
              </Avatar>
              <Typography fontWeight={800}>{selectedType} Reports</Typography>
            </Stack>

            <Chip
              icon={<NotificationsActiveOutlined />}
              color={bannerHasNew ? "warning" : "default"}
              variant={bannerHasNew ? "filled" : "outlined"}
              label={bannerText}
              sx={{ fontWeight: 700 }}
            />
          </Stack>
        </Box>

        <Box sx={{ p: 3 }}>
          {/* A) New unanalyzed report */}
          {current?.hasNewReport ? (
            <Stack spacing={2.5}>
              <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                <Box>
                  <Typography variant="subtitle1" fontWeight={800}>New Report Available</Typography>
                  <Typography color="text.secondary">
                    This report hasn’t been analyzed yet. View the PDF or click analyze to extract values and get insights.
                  </Typography>
                </Box>
                <Chip color="success" label="Unanalyzed" />
              </Stack>

              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: "#F8FAFF" }}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  justifyContent="space-between"
                  spacing={2}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar variant="rounded" sx={{ bgcolor: "rgba(59,130,246,.15)", color: "#2563EB", width: 48, height: 48 }}>
                      <InsertDriveFileOutlined />
                    </Avatar>
                    <Box>
                      <Typography fontWeight={700}>
                        {current.newReport?.fileName || `${selectedType}_Report.pdf`}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CalendarMonthOutlined sx={{ fontSize: 18, color: "text.secondary" }} />
                        <Typography variant="body2" color="text.secondary">
                          Uploaded: {fmtDate(current.newReport?.uploadDate)}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" color="text.disabled">
                        Report ID: {current.newReport?.id}
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={1.25}>
                    {/* 👁 View first (inline, no download) */}
                    <Button
                      onClick={() =>
                        openInlineView(
                          current.newReport?.viewUrl || current.newReport?.id
                        )
                      }
                      startIcon={<PageviewOutlined />}
                      sx={{
                        px: 2, py: 1.1, borderRadius: 2, fontWeight: 800,
                        textTransform: "none",
                        bgcolor: "rgba(102,126,234,.12)",
                        color: "#667eea",
                        "&:hover": { bgcolor: "rgba(102,126,234,.2)", transform: "translateY(-1px)" }
                      }}
                    >
                      View report
                    </Button>

                    {/* Analyze */}
                    <Button
                      onClick={() =>
                        handleAnalyze(
                          current?.newReport?.id ||
                          current?.newReport?._id ||
                          current?.newReport?.referenceNo
                        )
                      }
                      startIcon={<BarChartOutlined />}
                      disabled={!!analyzingId}
                      sx={{
                        px: 2.5, py: 1.1, borderRadius: 2, fontWeight: 800, color: "#fff",
                        textTransform: "none",
                        background: "linear-gradient(135deg,#667eea,#764ba2)",
                        "&:hover": { boxShadow: "0 10px 24px rgba(102,126,234,.35)", transform: "translateY(-1px)" }
                      }}
                    >
                      {analyzingId ? "Analyzing…" : "Analyze report"}
                    </Button>
                  </Stack>
                </Stack>
              </Paper>

              {current.lastAnalysis && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    justifyContent="space-between"
                    spacing={2}
                    sx={{ background: "rgba(99,102,241,.06)", p: 2, borderRadius: 2 }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <TrendingUp color="primary" fontSize="small" />
                      <Box>
                        <Typography variant="body2" fontWeight={700}>Previous analysis available</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Last analyzed: {fmtDate(current.lastAnalysis?.analyzedDate)}
                        </Typography>
                      </Box>
                    </Stack>
                    <Button
                      size="small"
                      onClick={() => navigate(`/reports/${current.lastAnalysis?.reportId}/analysis`)}
                      endIcon={<ArrowForwardIos sx={{ fontSize: 14 }} />}
                      sx={{ textTransform: "none", fontWeight: 800 }}
                    >
                      View full analysis
                    </Button>
                  </Stack>
                </>
              )}
            </Stack>
          ) : (
            // B) No new report -> show previous
            <Stack spacing={2.5}>
              <Stack alignItems="center" sx={{ py: 4 }}>
                <Avatar sx={{ bgcolor: "rgba(148,163,184,.2)", color: "text.disabled", width: 64, height: 64 }}>
                  <InsertDriveFileOutlined />
                </Avatar>
                <Typography fontWeight={800} sx={{ mt: 1 }}>
                  No new {selectedType} reports
                </Typography>
                <Typography color="text.secondary">
                  No new reports to analyze. View your previous analysis below.
                </Typography>
              </Stack>

              {current?.lastAnalysis && (
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography fontWeight={800}>Previous analysis summary</Typography>
                    <Chip label={current.lastAnalysis.trend} size="small" />
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <CalendarMonthOutlined sx={{ fontSize: 18, color: "text.secondary" }} />
                    <Typography variant="body2" color="text.secondary">
                      Analyzed on: {fmtDate(current.lastAnalysis.analyzedDate)}
                    </Typography>
                  </Stack>

                  <Paper sx={{ p: 2, bgcolor: "#FAFBFF", borderRadius: 2 }}>
                    <Typography color="text.secondary">
                      {current.lastAnalysis.summary}
                    </Typography>
                  </Paper>

                  <Stack alignItems="center" sx={{ mt: 2 }}>
                    <Button
                      onClick={() => navigate(`/reports/${current.lastAnalysis.reportId}/analysis`)}
                      endIcon={<ArrowForwardIos />}
                      sx={{
                        px: 2.5, py: 1.25, borderRadius: 2, fontWeight: 800, color: "#fff",
                        textTransform: "none",
                        background: "linear-gradient(135deg,#667eea,#764ba2)",
                        "&:hover": {
                          boxShadow: "0 10px 24px rgba(102,126,234,.35)",
                          transform: "translateY(-1px)",
                          background: "linear-gradient(135deg,#5e74e9,#6c43b6)",
                        },
                      }}
                    >
                      View full analysis
                    </Button>
                  </Stack>
                </Paper>
              )}
            </Stack>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
