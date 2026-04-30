export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const avatarId = searchParams.get("avatarId");

  if (!avatarId) {
    return Response.json({ error: "avatarId is required" }, { status: 400 });
  }

  const res = await fetch("https://trulience.com/auth/generate-token", {
    method: "POST",
    headers: {
      "x-api-key": process.env.TRULIENCE_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ avatar_id: avatarId, expire_at: 3600 }),
  });

  const data = await res.json();

  if (!res.ok) {
    return Response.json({ error: data }, { status: res.status });
  }

  return Response.json({ token: data.jwt });
}