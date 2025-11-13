import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { createToken } from "./lib"; // relative path to lib.ts
import prisma from "@/prismaClient";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, username, email, password } = body;

    if (!action || !email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (action === "signup") {
      if (!username) {
        return NextResponse.json({ error: "Username required for signup" }, { status: 400 });
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: "Email already registered" }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { username, email, password: hashedPassword },
      });
      const token = createToken(user.email);
      return NextResponse.json({
        message: "User created",
        user: { id: user.id, email: user.email },
      });
    }

    if (action === "login") {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  const match = await bcrypt.compare(password, user.password);
  if (!match)
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });

  // Create token
  const token = createToken(user.email); 
  // Set cookie in response
  const response = NextResponse.json({
    message: "Login successful",
    user: { id: user.id, email: user.email },
  });

  response.cookies.set({
    name: "auth_token",
    value: token,
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return response;
}


    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
