import { Session } from "@shopify/shopify-app-react-router/server";

import prisma from "../db.server";

const buildOnlineAccessInfo = (record: {
  userId: bigint | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  accountOwner: boolean;
  locale: string | null;
  collaborator: boolean | null;
  emailVerified: boolean | null;
  scope: string | null;
  expires: Date | null;
}) => {
  if (!record.userId) return undefined;

  const expiresInSeconds = record.expires
    ? Math.max(0, Math.floor((record.expires.getTime() - Date.now()) / 1000))
    : 0;

  return {
    associated_user: {
      id: Number(record.userId),
      first_name: record.firstName ?? "",
      last_name: record.lastName ?? "",
      email: record.email ?? "",
      account_owner: record.accountOwner,
      locale: record.locale ?? "en",
      collaborator: record.collaborator ?? false,
      email_verified: record.emailVerified ?? false,
    },
    associated_user_scope: record.scope ?? "",
    expires_in: expiresInSeconds,
  };
};

export class PrismaSessionStorage {
  async storeSession(session: Session): Promise<boolean> {
    const user = session.onlineAccessInfo?.associated_user;

    await prisma.session.upsert({
      where: { id: session.id },
      update: {
        shop: session.shop,
        state: session.state,
        isOnline: session.isOnline,
        scope: session.scope ?? null,
        expires: session.expires ?? null,
        accessToken: session.accessToken ?? "",
        userId: user ? BigInt(user.id) : null,
        firstName: user?.first_name ?? null,
        lastName: user?.last_name ?? null,
        email: user?.email ?? null,
        accountOwner: user?.account_owner ?? false,
        locale: user?.locale ?? null,
        collaborator: user?.collaborator ?? false,
        emailVerified: user?.email_verified ?? false,
        refreshToken: session.refreshToken ?? null,
        refreshTokenExpires: session.refreshTokenExpires ?? null,
      },
      create: {
        id: session.id,
        shop: session.shop,
        state: session.state,
        isOnline: session.isOnline,
        scope: session.scope ?? null,
        expires: session.expires ?? null,
        accessToken: session.accessToken ?? "",
        userId: user ? BigInt(user.id) : null,
        firstName: user?.first_name ?? null,
        lastName: user?.last_name ?? null,
        email: user?.email ?? null,
        accountOwner: user?.account_owner ?? false,
        locale: user?.locale ?? null,
        collaborator: user?.collaborator ?? false,
        emailVerified: user?.email_verified ?? false,
        refreshToken: session.refreshToken ?? null,
        refreshTokenExpires: session.refreshTokenExpires ?? null,
      },
    });

    return true;
  }

  async loadSession(id: string): Promise<Session | undefined> {
    const record = await prisma.session.findUnique({ where: { id } });

    if (!record) {
      return undefined;
    }

    return new Session({
      id: record.id,
      shop: record.shop,
      state: record.state,
      isOnline: record.isOnline,
      scope: record.scope ?? undefined,
      expires: record.expires ?? undefined,
      accessToken: record.accessToken,
      refreshToken: record.refreshToken ?? undefined,
      refreshTokenExpires: record.refreshTokenExpires ?? undefined,
      onlineAccessInfo: record.isOnline
        ? buildOnlineAccessInfo(record)
        : undefined,
    });
  }

  async deleteSession(id: string): Promise<boolean> {
    await prisma.session.deleteMany({ where: { id } });

    return true;
  }

  async deleteSessions(ids: string[]): Promise<boolean> {
    await prisma.session.deleteMany({ where: { id: { in: ids } } });

    return true;
  }

  async findSessionsByShop(shop: string): Promise<Session[]> {
    const records = await prisma.session.findMany({ where: { shop } });

    return records.map(
      (record) =>
        new Session({
          id: record.id,
          shop: record.shop,
          state: record.state,
          isOnline: record.isOnline,
          scope: record.scope ?? undefined,
          expires: record.expires ?? undefined,
          accessToken: record.accessToken,
          refreshToken: record.refreshToken ?? undefined,
          refreshTokenExpires: record.refreshTokenExpires ?? undefined,
          onlineAccessInfo: record.isOnline
            ? buildOnlineAccessInfo(record)
            : undefined,
        }),
    );
  }
}
