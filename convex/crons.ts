import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

// Sync calls from Telnyx every 2 minutes
crons.interval(
  "sync-telnyx-calls",
  { minutes: 2 },
  api.syncCalls.syncRecentCalls,
  { pageSize: 20 },
);

export default crons;
