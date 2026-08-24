export const defaultProfileTimeZone = "GMT+5 Pakistan Standard Time";

export function profileLabelToTimeZone(value?: string) {
  switch (String(value ?? "").trim()) {
    case "GMT+1 IST (Ireland)":
      return "Europe/Dublin";
    case "GMT London":
      return "Europe/London";
    case "GMT+1 Central European Time":
      return "Europe/Berlin";
    case "GMT+4 Gulf Standard Time":
      return "Asia/Dubai";
    case "GMT+5 Pakistan Standard Time":
      return "Asia/Karachi";
    default:
      return "Asia/Karachi";
  }
}
