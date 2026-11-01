export interface BackupPoint {
  key: string;
  createdAt: string;
  complete: boolean;
}

// A reviewable retention plan. No deletion occurs as part of backup creation.
export function planBackupRetention(points: BackupPoint[]) {
  const valid = points
    .filter(
      (point) => point.complete && Number.isFinite(Date.parse(point.createdAt)),
    )
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const days = new Set<string>();
  const months = new Set<string>();
  const keep = new Set<string>();
  for (const point of valid) {
    const date = point.createdAt.slice(0, 10);
    const month = date.slice(0, 7);
    if (!days.has(date) && days.size < 35) {
      days.add(date);
      keep.add(point.key);
    }
    if (!months.has(month) && months.size < 12) {
      months.add(month);
      keep.add(point.key);
    }
  }
  return {
    keep: [...keep],
    reviewForRemoval: valid
      .filter((point) => !keep.has(point.key))
      .map((point) => point.key),
  };
}
