import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "../auth/lib"; // helper to get user from token

export async function GET(req: NextRequest) {
  const token = req.cookies.get("auth_token")?.value;
  console.log("Token from cookie:", token);

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // getCurrentUser now returns the full user object (queried by email)
  const user = await getCurrentUser(token);

  if (!user) {
    return NextResponse.json({ error: "Invalid token or user not found" }, { status: 401 });
  }

  console.log("Logged-in user:", user);

  return NextResponse.json({ user });
}
