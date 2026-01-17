import fs from "fs";
import path from "path";

const settingsPath = path.join(process.cwd(), "data", "settings.json");

export async function GET() {
  const data = fs.readFileSync(settingsPath, "utf-8");
  return Response.json(JSON.parse(data));
}

export async function POST(req) {
  const body = await req.json();

  fs.writeFileSync(
    settingsPath,
    JSON.stringify(
      {
        defaultEmail: body.defaultEmail || "",
        defaultPhone: body.defaultPhone || ""
      },
      null,
      2
    )
  );

  return Response.json({ success: true });
}
