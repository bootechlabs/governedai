import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const r2Configured =
  !!process.env.R2_ACCOUNT_ID &&
  !!process.env.R2_ACCESS_KEY_ID &&
  !!process.env.R2_SECRET_ACCESS_KEY &&
  !!process.env.R2_BUCKET_NAME;

function safeFileName(originalName: string) {
  const ext = path.extname(originalName).slice(0, 10);
  return `${randomUUID()}${ext}`;
}

// Shared upload path for both evidence files and profile pictures — R2
// keys are flat/randomized either way, so the only thing that varies is
// which folder the local dev fallback (no R2 credentials) writes under.
async function uploadFile(file: File, devSubdir: string): Promise<string> {
  const fileName = safeFileName(file.name);
  const bytes = Buffer.from(await file.arrayBuffer());

  if (r2Configured) {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: bytes,
        ContentType: file.type || "application/octet-stream",
      }),
    );
    // Requires the bucket's public dev URL or a custom domain set up in R2 —
    // see docs/mvp-scope.md open questions.
    const publicBase = process.env.R2_PUBLIC_URL_BASE;
    if (!publicBase) {
      throw new Error(
        "R2 is configured but R2_PUBLIC_URL_BASE is not set — cannot build a file URL",
      );
    }
    return `${publicBase.replace(/\/$/, "")}/${fileName}`;
  }

  // Local dev fallback — no R2 credentials. Lives under public/ so Next
  // serves it directly with no extra route — gitignored, not meant to
  // survive past a local session.
  const devDir = path.join(process.cwd(), "public", devSubdir);
  await mkdir(devDir, { recursive: true });
  await writeFile(path.join(devDir, fileName), bytes);
  return `/${devSubdir}/${fileName}`;
}

export function uploadEvidenceFile(file: File): Promise<string> {
  return uploadFile(file, "evidence-uploads");
}

export function uploadAvatarFile(file: File): Promise<string> {
  return uploadFile(file, "avatar-uploads");
}
