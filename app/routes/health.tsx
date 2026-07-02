import type { LoaderFunctionArgs } from "react-router";

import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return Response.json({
      ok: true,
      service: "anteprima-di-stampa",
      database: "healthy",
      checkedAt: new Date().toISOString(),
      responseMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error("Health check failed", error);

    return Response.json(
      {
        ok: false,
        service: "anteprima-di-stampa",
        database: "unhealthy",
        checkedAt: new Date().toISOString(),
        responseMs: Date.now() - startedAt,
      },
      { status: 503 },
    );
  }
};
