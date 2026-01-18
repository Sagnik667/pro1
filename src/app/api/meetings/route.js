import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data", "meetings.json");

export async function POST(req) {
  const meeting = await req.json();

  let meetings = [];
  try {
    meetings = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    meetings = [];
  }

  // Remove existing meeting with same id (edit-safe)
  meetings = meetings.filter(m => m.id !== meeting.id);

  meetings.push(meeting);

  fs.writeFileSync(filePath, JSON.stringify(meetings, null, 2));

  return Response.json({ success: true });
}

export async function GET() {
  let meetings = [];
  try {
    meetings = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    meetings = [];
  }
  return Response.json(meetings);
}

export async function DELETE(req) {
  const { id } = await req.json();

  let meetings = [];
  try {
    meetings = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return Response.json({ success: false });
  }

  meetings = meetings.filter(m => m.id !== id);

  fs.writeFileSync(filePath, JSON.stringify(meetings, null, 2));

  return Response.json({ success: true });
}
