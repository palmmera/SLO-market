export async function register() {
  if (!process.env.UPLOAD_DIR || process.env.UPLOAD_DIR.startsWith("/data")) {
    process.env.UPLOAD_DIR = "uploads";
  }
}
