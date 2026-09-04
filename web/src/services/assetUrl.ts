/** Prefix a root-relative public asset path with the Vite base so it resolves under a subpath deployment. */
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}
