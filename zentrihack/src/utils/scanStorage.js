const STORAGE_KEY = "mediscan_scan_history";

function readScans() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getScans() {
  return readScans();
}

export function saveScan(scan) {
  const scans = readScans();

  // Reuse the ID when updating an existing scan to avoid duplicates.
  const existingIndex = scans.findIndex(
    (item) => item.id === scan.id
  );

  let updatedScans;

  if (existingIndex >= 0) {
    updatedScans = [...scans];
    updatedScans[existingIndex] = {
      ...updatedScans[existingIndex],
      ...scan,
      updatedAt: new Date().toISOString(),
    };
  } else {
    updatedScans = [
      {
        ...scan,
        createdAt: scan.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      ...scans,
    ];
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedScans));
    window.dispatchEvent(new Event("mediscan-history-updated"));
    return true;
  } catch (error) {
    console.error("Unable to save scan history:", error);
    return false;
  }
}

export function getScanById(id) {
  return readScans().find((scan) => scan.id === id) || null;
}

export function deleteScan(id) {
  const updatedScans = readScans().filter((scan) => scan.id !== id);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedScans));
    window.dispatchEvent(new Event("mediscan-history-updated"));
    return true;
  } catch (error) {
    console.error("Unable to delete scan:", error);
    return false;
  }
}

export function clearScanHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("mediscan-history-updated"));
    return true;
  } catch (error) {
    console.error("Unable to clear scan history:", error);
    return false;
  }
}
