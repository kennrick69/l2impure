import { NextResponse } from "next/server";
import { requireAdmin, AdminError } from "@/lib/admin";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";
import { bridge, BridgeError } from "@/lib/bridge";

async function ensureAdmin(req: Request) {
  try {
    return { admin: await requireAdmin() };
  } catch (e) {
    if (e instanceof AdminError) {
      return {
        response: NextResponse.json(
          { error: e.message },
          { status: e.status },
        ),
      };
    }
    throw e;
  }
}

function bridgeFail(e: unknown) {
  if (e instanceof BridgeError) {
    if (e.status === 404) {
      return NextResponse.json(
        { error: "Personagem ou conta não encontrada" },
        { status: 404 },
      );
    }
    if (e.status === 409) {
      return NextResponse.json(
        {
          error:
            "Personagem online. Aguarde o jogador deslogar.",
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: `Bridge falhou (${e.status})` },
      { status: 502 },
    );
  }
  console.error("[/api/admin/gm]", e);
  return NextResponse.json(
    { error: "Erro de rede com a bridge" },
    { status: 502 },
  );
}

export async function GET(req: Request) {
  const guard = await ensureAdmin(req);
  if (guard.response) return guard.response;

  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  if (action !== "search") {
    return NextResponse.json({ error: "ação inválida" }, { status: 400 });
  }
  const name = url.searchParams.get("name") ?? "";
  if (name.trim().length === 0) {
    return NextResponse.json({ error: "name obrigatório" }, { status: 400 });
  }
  try {
    const data = await bridge.gm.searchCharacters(name.trim());
    return NextResponse.json(data);
  } catch (e) {
    return bridgeFail(e);
  }
}

export async function POST(req: Request) {
  const guard = await ensureAdmin(req);
  if (guard.response) return guard.response;
  const admin = guard.admin;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = body.action;
  const ip = clientIp(req);

  function ok() {
    return NextResponse.json({ ok: true });
  }

  try {
    switch (action) {
      case "set-level": {
        const charName = String(body.charName ?? "");
        const level = Number(body.level);
        if (!charName || !Number.isFinite(level)) {
          return NextResponse.json({ error: "params inválidos" }, { status: 400 });
        }
        await bridge.gm.setLevel(charName, level);
        await audit({
          userId: admin.userId,
          action: "admin_gm_set_level",
          ipAddress: ip,
          details: { charName, level },
        });
        return ok();
      }
      case "set-class": {
        const charName = String(body.charName ?? "");
        const classId = Number(body.classId);
        if (!charName || !Number.isFinite(classId)) {
          return NextResponse.json({ error: "params inválidos" }, { status: 400 });
        }
        await bridge.gm.setClass(charName, classId);
        await audit({
          userId: admin.userId,
          action: "admin_gm_set_class",
          ipAddress: ip,
          details: { charName, classId },
        });
        return ok();
      }
      case "add-item": {
        const charName = String(body.charName ?? "");
        const itemId = Number(body.itemId);
        const count = Number(body.count);
        if (!charName || !Number.isFinite(itemId) || !Number.isFinite(count)) {
          return NextResponse.json({ error: "params inválidos" }, { status: 400 });
        }
        await bridge.gm.addItem(charName, itemId, count);
        await audit({
          userId: admin.userId,
          action: "admin_gm_add_item",
          ipAddress: ip,
          details: { charName, itemId, count },
        });
        return ok();
      }
      case "set-name": {
        const charId = Number(body.charId);
        const newName = String(body.newName ?? "");
        if (!Number.isFinite(charId) || !newName) {
          return NextResponse.json({ error: "params inválidos" }, { status: 400 });
        }
        await bridge.gm.setName(charId, newName);
        await audit({
          userId: admin.userId,
          action: "admin_gm_set_name",
          ipAddress: ip,
          details: { charId, newName },
        });
        return ok();
      }
      case "add-adena": {
        const charName = String(body.charName ?? "");
        const amount = Number(body.amount);
        if (!charName || !Number.isFinite(amount)) {
          return NextResponse.json({ error: "params inválidos" }, { status: 400 });
        }
        await bridge.gm.addAdena(charName, amount);
        await audit({
          userId: admin.userId,
          action: "admin_gm_add_adena",
          ipAddress: ip,
          details: { charName, amount },
        });
        return ok();
      }
      case "set-access-level": {
        const login = String(body.login ?? "");
        const level = Number(body.level);
        if (!login || !Number.isFinite(level)) {
          return NextResponse.json({ error: "params inválidos" }, { status: 400 });
        }
        await bridge.gm.setAccessLevel(login, level);
        await audit({
          userId: admin.userId,
          action: "admin_gm_set_access_level",
          ipAddress: ip,
          details: { login, level },
        });
        return ok();
      }
      case "teleport": {
        const charName = String(body.charName ?? "");
        const x = Number(body.x);
        const y = Number(body.y);
        const z = Number(body.z);
        if (
          !charName ||
          !Number.isFinite(x) ||
          !Number.isFinite(y) ||
          !Number.isFinite(z)
        ) {
          return NextResponse.json({ error: "params inválidos" }, { status: 400 });
        }
        await bridge.gm.teleport(charName, x, y, z);
        await audit({
          userId: admin.userId,
          action: "admin_gm_teleport",
          ipAddress: ip,
          details: { charName, x, y, z },
        });
        return ok();
      }
      default:
        return NextResponse.json(
          { error: "ação inválida" },
          { status: 400 },
        );
    }
  } catch (e) {
    return bridgeFail(e);
  }
}
