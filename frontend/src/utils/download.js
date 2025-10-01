import axios from "axios";

export async function downloadFile(url, filename) {
  const res = await axios.get(url, { responseType: "blob" });
  const blob = new Blob([res.data], { type: "application/pdf" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename || "document.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
