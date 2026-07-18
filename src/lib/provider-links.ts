import { ProviderType } from "@/lib/providers/types";

interface ProviderDetailsUrlParams {
  provider: ProviderType | string;
  serverPublicUrl: string;
  machineId?: string | null;
  itemId: string;
}

export function getProviderDetailsUrl({ provider, serverPublicUrl, machineId, itemId }: ProviderDetailsUrlParams): string {
  const base = serverPublicUrl.replace(/\/$/, "");

  return `${base}/web/index.html#/details?id=${itemId}&context=home`;
}
