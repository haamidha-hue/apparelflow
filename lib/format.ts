const FACTORY_TZ = "Asia/Colombo";

const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: FACTORY_TZ,
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatFactoryTime(date: Date): string {
  return formatter.format(date);
}