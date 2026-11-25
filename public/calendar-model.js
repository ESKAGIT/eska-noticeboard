(function (root) {
  const DAY = 86400000;
  const types = { competition: "#e61f2a", course: "#d5a73a", grading: "#171717" };
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function date(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split("-").map(Number);
    if (year < 1900 || year > 9999) return null;
    const result = Date.UTC(year, month - 1, day);
    return new Date(result).toISOString().slice(0, 10) === value ? result : null;
  }
  function parse(value = "") {
    const events = [], errors = [];
    String(value).split(/\r?\n/).forEach((line, index) => {
      if (!line.trim()) return;
      const parts = line.split("|").map((part) => part.trim());
      const range = /^(\d{4}-\d{2}-\d{2})(?:\s*[-\u2013\u2014]\s*(\d{4}-\d{2}-\d{2}))?$/.exec(parts[0]);
      const start = range ? date(range[1]) : null;
      const end = range ? date(range[2] || range[1]) : null;
      const type = (parts[1] || "").toLowerCase();
      if (start === null || end === null || end < start || !Object.hasOwn(types, type) || !parts[2]) {
        errors.push(`Line ${index + 1}: use a real date or ascending date range, competition/course/grading, and a title.`);
        return;
      }
      events.push({ start, end, type, title: parts[2], details: parts.slice(3).join(" | "), line: index + 1 });
    });
    events.sort((a, b) => a.start - b.start || a.line - b.line);
    return { events, errors };
  }
  function validMonth(value) { return /^\d{4}-(0[1-9]|1[0-2])$/.test(value || "") && Number(value.slice(0, 4)) >= 1900 && Number(value.slice(0, 4)) <= 9998; }
  function months(startMonth, count, events = []) {
    if (!validMonth(startMonth)) throw new Error("Choose a start month between 1900 and 9998.");
    const [year, month] = startMonth.split("-").map(Number);
    count = Math.min(3, Math.max(1, Math.round(Number(count) || 3)));
    return Array.from({ length: count }, (_, index) => {
      const start = Date.UTC(year, month - 1 + index, 1);
      const d = new Date(start), y = d.getUTCFullYear(), m = d.getUTCMonth();
      const end = Date.UTC(y, m + 1, 1) - DAY;
      const offset = (d.getUTCDay() + 6) % 7;
      const days = new Date(end).getUTCDate();
      const relevant = events.filter((event) => event.start <= end && event.end >= start);
      const cells = Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, cellIndex) => {
        const number = cellIndex - offset + 1;
        if (number < 1 || number > days) return null;
        const time = start + (number - 1) * DAY;
        const matches = relevant.filter((event) => event.start <= time && event.end >= time);
        return { number, iso: new Date(time).toISOString().slice(0, 10), events: matches, types: [...new Set(matches.map((event) => event.type))] };
      });
      return { year: y, month: m, name: monthNames[m], start, end, cells, events: relevant };
    });
  }
  function eventDate(event, month) {
    const short = (time) => new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(time);
    const start = Math.max(event.start, month.start), end = Math.min(event.end, month.end);
    return short(start) + (end !== start ? ` \u2013 ${short(end)}` : "");
  }
  const api = { date, parse, months, validMonth, eventDate, types };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.EskaCalendar = api;
})(globalThis);
