import { NextResponse } from "next/server";

const TEMPLATE_CSV =
  [
    "Name,Description,Business Unit,Vendor Name,Classification,Deployment Status",
    "Claims Triage Assistant,Ambient scribe for claims review,Claims Ops,Acme AI Inc,CONFIDENTIAL,PILOT",
  ].join("\n") + "\n";

export function GET() {
  return new NextResponse(TEMPLATE_CSV, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="ai-system-import-template.csv"',
    },
  });
}
