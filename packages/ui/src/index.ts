export const controlPlaneTheme = {
  palette: {
    canvas: "#f3ede3",
    paper: "#fbf7ef",
    ink: "#171714",
    charcoal: "#293231",
    steel: "#566160",
    copper: "#ae5c33",
    moss: "#4d5d43",
    signal: "#c47a2c",
    border: "rgba(23, 23, 20, 0.12)",
    haze: "rgba(251, 247, 239, 0.78)"
  },
  gradients: {
    halo:
      "radial-gradient(circle at top right, rgba(196, 122, 44, 0.18), transparent 46%), radial-gradient(circle at left center, rgba(77, 93, 67, 0.14), transparent 34%)",
    panel:
      "linear-gradient(180deg, rgba(251, 247, 239, 0.92), rgba(243, 237, 227, 0.84))"
  },
  shadows: {
    soft: "0 16px 40px rgba(41, 50, 49, 0.08)",
    line: "inset 0 1px 0 rgba(255, 255, 255, 0.45)"
  }
} as const;

export const statusToneMap = {
  active: { background: "rgba(77, 93, 67, 0.12)", foreground: "#38502f" },
  waiting_approval: { background: "rgba(196, 122, 44, 0.16)", foreground: "#8a4d15" },
  completed: { background: "rgba(77, 93, 67, 0.14)", foreground: "#2f4731" },
  failed: { background: "rgba(174, 92, 51, 0.16)", foreground: "#8a3f1a" },
  running: { background: "rgba(41, 50, 49, 0.12)", foreground: "#293231" },
  queued: { background: "rgba(86, 97, 96, 0.14)", foreground: "#46514f" }
} as const;

