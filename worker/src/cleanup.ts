import { prisma } from "./lib/db.js";
import {
  deleteObject,
  purgeFilesOlderThan,
} from "@pdf-saas/storage";

function ttlCutoff(): Date {
  const hours = Number(process.env.FILE_TTL_HOURS ?? "2");
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function collectJobKeys(job: {
  inputKeys: string[];
  outputKey: string | null;
  outputKeys: string[];
}): string[] {
  return [
    ...job.inputKeys,
    ...(job.outputKey ? [job.outputKey] : []),
    ...job.outputKeys,
  ];
}

async function purgeOldJobs(cutoff: Date): Promise<number> {
  const jobs = await prisma.job.findMany({
    where: {
      OR: [
        { completedAt: { lt: cutoff } },
        {
          status: { in: ["completed", "failed"] },
          updatedAt: { lt: cutoff },
        },
      ],
    },
    take: 50,
  });

  let deleted = 0;
  for (const job of jobs) {
    for (const key of collectJobKeys(job)) {
      try {
        await deleteObject(key);
        deleted++;
      } catch {
        /* ignore */
      }
    }
    await prisma.job.delete({ where: { id: job.id } });
  }
  return deleted;
}

export async function cleanupExpiredFiles(): Promise<number> {
  const cutoff = ttlCutoff();
  const fromJobs = await purgeOldJobs(cutoff);
  const fromDisk = await purgeFilesOlderThan(cutoff);
  return fromJobs + fromDisk;
}
