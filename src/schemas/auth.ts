import { z } from "@hono/zod-openapi";

export const LoginRequestSchema = z
  .object({
    host: z
      .string()
      .url()
      .openapi({ example: "http://192.168.1.100", description: "Dahua device URL" }),
    username: z.string().min(1).openapi({ example: "admin", description: "Username" }),
    password: z.string().min(1).openapi({ example: "password123", description: "Password" }),
  })
  .openapi("LoginRequest");

export const LoginResponseSchema = z
  .object({
    success: z.boolean().openapi({ example: true }),
    session: z.string().openapi({ example: "abc123def456" }),
    keepAliveInterval: z.number().openapi({ example: 60 }),
    message: z.string().openapi({ example: "Login successful" }),
  })
  .openapi("LoginResponse");

export const LogoutResponseSchema = z
  .object({
    success: z.boolean().openapi({ example: true }),
    message: z.string().openapi({ example: "Logged out successfully" }),
  })
  .openapi("LogoutResponse");

export const KeepAliveResponseSchema = z
  .object({
    success: z.boolean().openapi({ example: true }),
    message: z.string().openapi({ example: "Session kept alive" }),
  })
  .openapi("KeepAliveResponse");
