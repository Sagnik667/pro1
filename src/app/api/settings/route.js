import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data", "settings.json");

export async function GET() {
  const data = fs.readFileSync(filePath, "utf-8");
  return Response.json(JSON.parse(data || "{}"));
}

export async function POST(req) {
  const { userId, email, phone } = await req.json();

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8") || "{}");

  data[userId] = { email, phone };

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  return Response.json({ success: true });
}
