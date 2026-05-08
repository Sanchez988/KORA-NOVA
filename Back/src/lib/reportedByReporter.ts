import type { PrismaClient } from '@prisma/client';

/** IDs de usuarios que el denunciante reportó (perfil oculto para quien reporta). */
export async function getReportedUserIdsForReporter(
  prisma: PrismaClient,
  reporterId: string
): Promise<string[]> {
  const rows = await prisma.report.groupBy({
    by: ['reportedUserId'],
    where: { reporterId },
  });
  return rows.map((r) => r.reportedUserId);
}
