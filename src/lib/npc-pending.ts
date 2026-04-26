import { setSetting, getSetting } from "./settings";

const KEY = "npc_edits_pending" as const;

export async function markNpcEditsPending(): Promise<void> {
  await setSetting(KEY as unknown as Parameters<typeof setSetting>[0], true);
}

export async function clearNpcEditsPending(): Promise<void> {
  await setSetting(KEY as unknown as Parameters<typeof setSetting>[0], false);
}

export async function isNpcEditsPending(): Promise<boolean> {
  const v = await getSetting<boolean>(
    KEY as unknown as Parameters<typeof getSetting>[0],
    false,
  );
  return v === true;
}
