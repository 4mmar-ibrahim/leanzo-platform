import path from 'node:path';

export const uploadsDirectory = path.resolve(process.env.CLEANZO_UPLOADS_DIR || 'uploads');
export const backupsDirectory = path.resolve(process.env.CLEANZO_BACKUPS_DIR || 'storage/backups');
