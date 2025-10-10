import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Container,
  Divider,
  Grid,
  IconButton,
  Slider,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  Button,
  Paper,
  Stack,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  ContentCopy,
  RestartAlt,
  SwapHoriz,
  Scale,
  Height,
  Calculate,
  Download,
  InfoOutlined,
  TipsAndUpdates,
  HealthAndSafety,
  MonitorWeight,
  Straighten,
  Close,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
} from "@mui/icons-material";
import { jsPDF } from "jspdf";
import "./BMICalculator.css";

/* ---------------- Helpers ---------------- */

const clamp = (n, min, max) => Math.min(Math.max(Number(n), min), max);

const toNumber = (v, fallback = 0) => {
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};

const kgFromLb = (lb) => lb * 0.45359237;
const lbFromKg = (kg) => kg / 0.45359237;
const cmFromImperial = (ft, inch) => ((ft * 12) + inch) * 2.54;
const imperialFromCm = (cm) => {
  const totalIn = cm / 2.54;
  const ft = Math.floor(totalIn / 12);
  const inch = Math.round(totalIn - ft * 12);
  return { ft, inch: Math.min(inch, 11) };
};

const bmiFromMetric = ({ kg, cm }) => {
  const m = cm / 100;
  if (!kg || !m) return 0;
  return kg / (m * m);
};

const bmiFromImperial = ({ lb, ft, inch }) => {
  const kg = kgFromLb(lb);
  const m = cmFromImperial(ft, inch) / 100;
  if (!kg || !m) return 0;
  return kg / (m * m);
};

const categoryOf = (bmi) => {
  if (!bmi || !Number.isFinite(bmi)) return { label: "—", color: "default", severity: 0, description: "Enter your measurements to calculate BMI" };
  if (bmi < 16)   return { label: "Severe Thinness",  color: "error", severity: 4, description: "Consult healthcare provider for guidance" };
  if (bmi < 17)   return { label: "Moderate Thinness", color: "warning", severity: 3, description: "Consider nutritional assessment" };
  if (bmi < 18.5) return { label: "Mild Thinness",     color: "warning", severity: 2, description: "May need weight gain strategies" };
  if (bmi < 25)   return { label: "Healthy Weight",    color: "success", severity: 0, description: "Maintain your healthy lifestyle" };
  if (bmi < 30)   return { label: "Overweight",        color: "warning", severity: 1, description: "Consider lifestyle modifications" };
  if (bmi < 35)   return { label: "Obesity Class I",   color: "error", severity: 2, description: "Health risks may be increased" };
  if (bmi < 40)   return { label: "Obesity Class II",  color: "error", severity: 3, description: "Medical advice recommended" };
  return { label: "Obesity Class III", color: "error", severity: 4, description: "Immediate medical consultation advised" };
};

const healthyWeightRange = ({ unit, cm, ft, inch }) => {
  const m = unit === "METRIC" ? cm / 100 : cmFromImperial(ft, inch) / 100;
  if (!m) return { minKg: 0, maxKg: 0, minLb: 0, maxLb: 0 };
  const minKg = 18.5 * m * m;
  const maxKg = 24.9 * m * m;
  return {
    minKg,
    maxKg,
    minLb: lbFromKg(minKg),
    maxLb: lbFromKg(maxKg),
  };
};

const round = (n, d = 1) => {
  const p = 10 ** d;
  return Math.round(n * p) / p;
};

/* ---------------- Gauge ---------------- */

function BMIGauge({ value = 0, category }) {
  const min = 15;
  const max = 40;
  const normalizedValue = Math.min(Math.max(value || 0, min), max);
  const percentage = ((normalizedValue - min) / (max - min)) * 100;

  const segments = [
    { label: "Underweight", range: "< 18.5", color: "#4FC3F7", start: 0, end: 27.9 },
    { label: "Healthy", range: "18.5–24.9", color: "#2196F3", start: 28, end: 50 },
    { label: "Overweight", range: "25–29.9", color: "#1976D2", start: 50.1, end: 70 },
    { label: "Obese", range: "≥ 30", color: "#0D47A1", start: 70.1, end: 100 },
  ];

  const currentSegment = segments.find(seg => percentage >= seg.start && percentage <= seg.end);

  return (
    <Box className="bmi-gauge-container" role="region" aria-label="BMI analysis">
      <Box className="bmi-gauge-value">
        <Typography variant="h1" className="bmi-number" aria-live="polite">
          {value ? round(value, 1) : "—"}
        </Typography>
        <Chip
          label={category.label}
          color={category.color}
          className="bmi-category-chip"
          size="medium"
          icon={category.severity === 0 ? <CheckCircle /> : category.severity <= 2 ? <Warning /> : <ErrorIcon />}
        />
        <Typography variant="body2" className="category-description">
          {category.description}
        </Typography>
      </Box>

      <Box className="bmi-gauge-bar">
        <Box className="bmi-gauge-track" aria-hidden>
          <LinearProgress
            variant="determinate"
            value={percentage}
            className="bmi-progress"
            sx={{
              height: 12,
              borderRadius: 6,
              backgroundColor: '#E3F2FD',
              '& .MuiLinearProgress-bar': {
                background: `linear-gradient(90deg, #4FC3F7 0%, #2196F3 50%, #1976D2 100%)`,
                borderRadius: 6,
              }
            }}
          />
        </Box>
        <Box className="bmi-gauge-marker" style={{ left: `${percentage}%` }} aria-hidden>
          <Box className="marker-dot" />
          <Box className="marker-line" />
        </Box>

        <Box className="bmi-gauge-segments">
          {segments.map((segment) => (
            <Box
              key={segment.label}
              className="bmi-segment"
              style={{ left: `${segment.start}%`, width: `${segment.end - segment.start}%` }}
            >
              <Box className="segment-color" style={{ backgroundColor: segment.color }} />
              <Typography variant="caption" className="segment-label">{segment.label}</Typography>
              <Typography variant="caption" className="segment-range">{segment.range}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

/* ---------------- BMI Info Dialog ---------------- */

function BMIInfoDialog({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h5" component="div">
            Understanding Body Mass Index (BMI)
          </Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3}>
          <Paper elevation={0} className="info-paper">
            <Typography variant="h6" gutterBottom color="primary">
              What is BMI?
            </Typography>
            <Typography variant="body1">
              Body Mass Index (BMI) is a simple calculation using a person's height and weight. 
              The formula is BMI = kg/m² where kg is a person's weight in kilograms and m² is 
              their height in meters squared.
            </Typography>
          </Paper>

          <Paper elevation={0} className="info-paper">
            <Typography variant="h6" gutterBottom color="primary">
              How to Calculate BMI
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon><MonitorWeight color="primary" /></ListItemIcon>
                <ListItemText 
                  primary="Metric Formula" 
                  secondary="Weight (kg) ÷ [Height (m)]² = BMI"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><Scale color="primary" /></ListItemIcon>
                <ListItemText 
                  primary="Imperial Formula" 
                  secondary="[Weight (lbs) ÷ Height (inches)²] × 703 = BMI"
                />
              </ListItem>
            </List>
          </Paper>

          <Paper elevation={0} className="info-paper">
            <Typography variant="h6" gutterBottom color="primary">
              BMI Categories
            </Typography>
            <Box className="category-grid">
              <Chip label="Underweight: < 18.5" color="info" variant="outlined" />
              <Chip label="Healthy: 18.5–24.9" color="success" />
              <Chip label="Overweight: 25–29.9" color="warning" />
              <Chip label="Obese: ≥ 30" color="error" />
            </Box>
          </Paper>

          <Paper elevation={0} className="info-paper">
            <Typography variant="h6" gutterBottom color="primary">
              Important Notes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • BMI is a screening tool, not a diagnostic measure<br/>
              • It may not accurately reflect body composition for athletes<br/>
              • Muscle mass and bone density can affect results<br/>
              • Always consult healthcare professionals for personalized advice
            </Typography>
          </Paper>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained" color="primary">
          Got It!
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ---------------- Main ---------------- */

export default function BMICalculator() {
  const [unit, setUnit] = useState("METRIC");
  const [kg, setKg] = useState(70);
  const [cm, setCm] = useState(170);
  const [lb, setLb] = useState(154);
  const [ft, setFt] = useState(5);
  const [inch, setInch] = useState(8);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const u = q.get("u");
    if (u === "METRIC" || u === "IMPERIAL") setUnit(u);
    if (u === "METRIC") {
      setKg(toNumber(q.get("kg"), 70));
      setCm(toNumber(q.get("cm"), 170));
    } else if (u === "IMPERIAL") {
      setLb(toNumber(q.get("lb"), 154));
      setFt(toNumber(q.get("ft"), 5));
      setInch(toNumber(q.get("in"), 8));
    }
  }, []);

  useEffect(() => {
    const q = new URLSearchParams();
    q.set("u", unit);
    if (unit === "METRIC") {
      q.set("kg", String(kg));
      q.set("cm", String(cm));
    } else {
      q.set("lb", String(lb));
      q.set("ft", String(ft));
      q.set("in", String(inch));
    }
    const url = `${window.location.pathname}?${q.toString()}`;
    window.history.replaceState(null, "", url);
  }, [unit, kg, cm, lb, ft, inch]);

  const handleUnitChange = (_, v) => {
    if (!v || v === unit) return;
    if (v === "IMPERIAL") {
      setLb(Math.round(lbFromKg(kg)));
      const { ft: f, inch: i } = imperialFromCm(cm);
      setFt(f); setInch(i);
    } else {
      setKg(Math.round(kgFromLb(lb)));
      setCm(Math.round(cmFromImperial(ft, inch)));
    }
    setUnit(v);
  };

  const bmi = useMemo(() => {
    return unit === "METRIC"
      ? bmiFromMetric({ kg: toNumber(kg), cm: toNumber(cm) })
      : bmiFromImperial({ lb: toNumber(lb), ft: toNumber(ft), inch: toNumber(inch) });
  }, [unit, kg, cm, lb, ft, inch]);

  const category = useMemo(() => categoryOf(bmi), [bmi]);

  const range = useMemo(
    () => healthyWeightRange({ unit, cm: toNumber(cm), ft: toNumber(ft), inch: toNumber(inch) }),
    [unit, cm, ft, inch]
  );

  const copySummary = () => {
    const lines = [];
    lines.push(`BMI: ${bmi ? round(bmi, 1) : "-"}`);
    lines.push(`Category: ${category.label}`);
    lines.push(`Assessment: ${category.description}`);
    if (unit === "METRIC") {
      lines.push(`Inputs: ${kg} kg, ${cm} cm`);
      if (range.minKg) lines.push(`Healthy weight range: ${round(range.minKg,1)}–${round(range.maxKg,1)} kg`);
    } else {
      lines.push(`Inputs: ${lb} lb, ${ft} ft ${inch} in`);
      if (range.minLb) lines.push(`Healthy weight range: ${Math.round(range.minLb)}–${Math.round(range.maxLb)} lb`);
    }
    lines.push(`Generated by LifeNext Wellness BMI Calculator`);
    navigator.clipboard?.writeText(lines.join("\n")).catch(()=>{});
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();
    
    doc.setFillColor(33, 150, 243);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('BMI CALCULATION REPORT', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Generated on ${date}`, 105, 30, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text('YOUR RESULTS', 20, 60);
    
    doc.setFontSize(12);
    doc.text(`BMI Score: ${round(bmi, 1)}`, 20, 80);
    doc.text(`Category: ${category.label}`, 20, 90);
    doc.text(`Assessment: ${category.description}`, 20, 100);
    
    doc.text('MEASUREMENTS', 20, 120);
    if (unit === "METRIC") {
      doc.text(`Weight: ${kg} kg`, 20, 135);
      doc.text(`Height: ${cm} cm`, 20, 145);
    } else {
      doc.text(`Weight: ${lb} lb`, 20, 135);
      doc.text(`Height: ${ft} ft ${inch} in`, 20, 145);
    }
    
    doc.text('HEALTHY WEIGHT RANGE', 20, 165);
    if (unit === "METRIC") {
      doc.text(`${round(range.minKg, 1)} - ${round(range.maxKg, 1)} kg`, 20, 180);
    } else {
      doc.text(`${Math.round(range.minLb)} - ${Math.round(range.maxLb)} lb`, 20, 180);
    }
    
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    doc.text('This report is generated by LifeNext Wellness BMI Calculator. Consult healthcare professionals for medical advice.', 105, 270, { align: 'center' });
    
    doc.save(`bmi-report-${date}.pdf`);
  };

  const reset = () => {
    setUnit("METRIC");
    setKg(70); setCm(170);
    setLb(154); setFt(5); setInch(8);
  };

  const metricErrors = {
    kg: kg < 1 || kg > 400,
    cm: cm < 100 || cm > 250,
  };
  const imperialErrors = {
    lb: lb < 1 || lb > 900,
    ft: ft < 1 || ft > 8,
    inch: inch < 0 || inch > 11,
  };

  const presetHeights = [150, 160, 170, 180, 190, 200];

  return (
    <Container maxWidth="lg" className="bmi-container">
      <Box className="bmi-header">
        <Box className="header-content">
          <HealthAndSafety className="header-icon" />
          <Box>
            <Typography variant="h3" className="bmi-title">BMI Calculator</Typography>
            <Typography variant="subtitle1" className="bmi-subtitle">
              Understand your body mass index for better health decisions
            </Typography>
          </Box>
        </Box>
        <Chip label="LifeNext Wellness" variant="outlined" className="brand-chip" />
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={2} className="bmi-card input-card">
            <CardHeader
              title="Your Body Measurements"
              avatar={<Calculate color="primary" />}
              action={
                <ToggleButtonGroup
                  color="primary"
                  value={unit}
                  exclusive
                  onChange={handleUnitChange}
                  size="small"
                >
                  <ToggleButton value="METRIC">Metric</ToggleButton>
                  <ToggleButton value="IMPERIAL">Imperial</ToggleButton>
                </ToggleButtonGroup>
              }
              className="card-header"
            />
            <CardContent>
              {unit === "METRIC" ? (
                <Stack spacing={3}>
                  <Box>
                    <Typography variant="subtitle2" gutterBottom className="input-label">
                      <Scale className="input-icon" /> Weight (kilograms)
                    </Typography>
                    <TextField
                      fullWidth
                      type="number"
                      error={metricErrors.kg}
                      helperText={metricErrors.kg ? "Please enter weight between 1-400 kg" : "Enter your weight in kilograms"}
                      inputProps={{ inputMode: "decimal", step: "0.1", min: 1, max: 400 }}
                      value={kg}
                      onChange={(e) => setKg(clamp(toNumber(e.target.value, kg), 1, 400))}
                      placeholder="e.g., 70.5"
                      className="bmi-input"
                    />
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" gutterBottom className="input-label">
                      <Height className="input-icon" /> Height (centimeters)
                    </Typography>
                    <Box className="slider-container">
                      <Slider
                        value={cm}
                        min={120}
                        max={220}
                        onChange={(_, v) => setCm(clamp(v, 100, 250))}
                        className="bmi-slider"
                      />
                      <TextField
                        type="number"
                        error={metricErrors.cm}
                        helperText={metricErrors.cm ? "Please enter height between 100-250 cm" : " "}
                        inputProps={{ inputMode: "numeric", min: 100, max: 250 }}
                        value={cm}
                        onChange={(e) => setCm(clamp(toNumber(e.target.value, cm), 100, 250))}
                        className="slider-input"
                      />
                    </Box>
                    <Box sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
                      {presetHeights.map(h => (
                        <Chip key={h} label={`${h} cm`} size="small" onClick={() => setCm(h)} variant={cm === h ? "filled" : "outlined"} />
                      ))}
                    </Box>
                  </Box>
                </Stack>
              ) : (
                <Stack spacing={3}>
                  <Box>
                    <Typography variant="subtitle2" gutterBottom className="input-label">
                      <Scale className="input-icon" /> Weight (pounds)
                    </Typography>
                    <TextField
                      fullWidth
                      type="number"
                      error={imperialErrors.lb}
                      helperText={imperialErrors.lb ? "Please enter weight between 1-900 lb" : "Enter your weight in pounds"}
                      inputProps={{ inputMode: "decimal", step: "0.1", min: 1, max: 900 }}
                      value={lb}
                      onChange={(e) => setLb(clamp(toNumber(e.target.value, lb), 1, 900))}
                      placeholder="e.g., 154"
                      className="bmi-input"
                    />
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" gutterBottom className="input-label">
                      <Height className="input-icon" /> Height (feet & inches)
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <TextField
                          label="Feet"
                          type="number"
                          fullWidth
                          error={imperialErrors.ft}
                          helperText={imperialErrors.ft ? "1-8 feet" : " "}
                          inputProps={{ inputMode: "numeric", min: 1, max: 8 }}
                          value={ft}
                          onChange={(e) => setFt(clamp(toNumber(e.target.value, ft), 1, 8))}
                          className="bmi-input"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          label="Inches"
                          type="number"
                          fullWidth
                          error={imperialErrors.inch}
                          helperText={imperialErrors.inch ? "0-11 inches" : " "}
                          inputProps={{ inputMode: "numeric", min: 0, max: 11 }}
                          value={inch}
                          onChange={(e) => setInch(clamp(toNumber(e.target.value, inch), 0, 11))}
                          className="bmi-input"
                        />
                      </Grid>
                    </Grid>
                  </Box>
                </Stack>
              )}

              <Box className="action-buttons">
                <Button startIcon={<ContentCopy />} onClick={copySummary} variant="outlined" size="small">
                  Copy Results
                </Button>
                <Button startIcon={<RestartAlt />} onClick={reset} variant="outlined" size="small">
                  Reset Values
                </Button>
                <Tooltip title="Switch measurement system">
                  <Button
                    startIcon={<SwapHoriz />}
                    onClick={() => handleUnitChange(null, unit === "METRIC" ? "IMPERIAL" : "METRIC")}
                    variant="text"
                    size="small"
                  >
                    Convert Units
                  </Button>
                </Tooltip>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={2} className="bmi-card results-card">
            <CardHeader 
              title="Your BMI Analysis" 
              className="card-header"
              action={
                <IconButton onClick={() => setInfoOpen(true)}>
                  <InfoOutlined />
                </IconButton>
              }
            />
            <CardContent>
              <BMIGauge value={round(bmi || 0, 1)} category={category} />

              <Paper elevation={0} className="range-card">
                <Typography variant="subtitle2" gutterBottom className="range-title">
                  Healthy Weight Range (BMI 18.5–24.9)
                </Typography>
                <Typography variant="h6" className="range-value">
                  {unit === "METRIC" ? (
                    range.minKg ? (
                      <>
                        <strong>{round(range.minKg, 1)}</strong> – <strong>{round(range.maxKg, 1)}</strong> kg
                      </>
                    ) : "—"
                  ) : (
                    range.minLb ? (
                      <>
                        <strong>{Math.round(range.minLb)}</strong> – <strong>{Math.round(range.maxLb)}</strong> lb
                      </>
                    ) : "—"
                  )}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  This range indicates a healthy weight for your height
                </Typography>
              </Paper>

              <Box sx={{ mt: 3, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>BMI Classification Guide</Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Chip icon={<TipsAndUpdates />} label="Underweight < 18.5" size="small" variant="outlined" color="info" />
                  <Chip icon={<TipsAndUpdates />} label="Healthy 18.5–24.9" size="small" color="success" />
                  <Chip icon={<TipsAndUpdates />} label="Overweight 25–29.9" size="small" color="warning" />
                  <Chip icon={<TipsAndUpdates />} label="Obesity ≥ 30" size="small" color="error" />
                </Stack>
              </Box>

              <Box className="results-actions">
                <Button startIcon={<Download />} onClick={downloadPDF} variant="contained" color="primary">
                  Download PDF Report
                </Button>
                <Button startIcon={<InfoOutlined />} variant="outlined" onClick={() => setInfoOpen(true)}>
                  Learn About BMI
                </Button>
              </Box>

              <Typography variant="caption" color="text.secondary" className="disclaimer">
                * BMI provides a general indicator of body fatness. It may not be accurate for athletes, 
                pregnant women, or the elderly. Always consult healthcare professionals for comprehensive health assessment.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <BMIInfoDialog open={infoOpen} onClose={() => setInfoOpen(false)} />
    </Container>
  );
}