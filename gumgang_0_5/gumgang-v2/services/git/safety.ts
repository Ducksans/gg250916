export interface GitScanReport { dirty: boolean; untracked: string[]; largeFiles?: string[]; }
export type GitScanService = () => Promise<GitScanReport>;
