/** Use the exact filename the user uploaded. */
export function imageDownloadName(file: File): string {
  return file.name;
}
