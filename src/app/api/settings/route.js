import fs from "fs";
import path from "path";
import { requireAuth } from "../../../lib/supabase";

const filePath = path.join(process.cwd(), "data", "settings.json");

export async function GET(req) {
  try {
    const user = await requireAuth(req);
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8") || "{}");
    return Response.json(data[user.id] || {});
  } catch (err) {
    return Response.json(
      { error: err.message },
      { status: 401 }
    );
  }
}

export async function POST(req) {
  try {
    const user = await requireAuth(req);
    const { email, phone } = await req.json();

    const data = JSON.parse(fs.readFileSync(filePath, "utf-8") || "{}");

    data[user.id] = { email, phone };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    return Response.json({ success: true });
  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 401 }
    );
  }
}
