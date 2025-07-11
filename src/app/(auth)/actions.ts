"use server";

import db from "@/db/db";
import { sendRegisterEmail } from "@/email/register-auto-reply";
import { sendResetPasswordEmail } from "@/email/reset-password";
import { hashPassword, signToken, verifyPassword } from "@/lib/auth";
import { generateColor } from "@/lib/utils";
import { cookies } from "next/headers";
import { z } from "zod";
// import { OAuth2Client } from "google-auth-library";

const TEN_MINUTES_IN_MS = 10 * 60 * 1000;

// ============================
// Login
// ============================

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters",
  }),
});

type LoginResult =
  | {
      success?: false;
      email?: string[];
      password?: string[];
    }
  | {
      success?: true;
      redirectTo: string;
    };

export async function handleLogin(data: FormData): Promise<LoginResult> {
  const result = LoginSchema.safeParse(Object.fromEntries(data.entries()));
  if (!result.success) return result.error.formErrors.fieldErrors;

  const user = await db.user.findUnique({
    where: { email: result.data.email },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      color: true,
      password: true,
      admin: { select: { userId: true } },
    },
  });
  if (!user) return { email: ["Invalid email or password"] };

  if (!(await verifyPassword(result.data.password, user.password)))
    return { email: ["Invalid email or password"] };

  const token = await signToken({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    color: user.color,
    isAdmin: user.admin?.userId ? true : false,
  });

  (await cookies()).set({
    name: process.env.JWT_KEY!,
    value: token,
    httpOnly: true,
    secure: true,
    path: "/",
  });

  return { success: true, redirectTo: "/" };
}

// ============================
// Register
// ============================

const RegisterSchema = z.object({
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
});

type RegisterResult =
  | {
      success?: false;
      email?: string[];
      firstName?: string[];
      lastName?: string[];
      password?: string[];
      confirmPassword?: string[];
    }
  | {
      success?: true;
      redirectTo: string;
    };

export async function handleRegister(data: FormData): Promise<RegisterResult> {
  const result = RegisterSchema.safeParse(Object.fromEntries(data.entries()));
  if (!result.success) return result.error.formErrors.fieldErrors;

  if (result.data.password !== result.data.confirmPassword)
    return { confirmPassword: ["Passwords do not match"] };

  const user = await db.user.findUnique({
    where: { email: result.data.email },
  });
  if (user) return { email: ["User already exists"] };

  const hashedPassword = await hashPassword(result.data.password);
  const color = generateColor();
  const newUser = await db.user.create({
    data: {
      email: result.data.email,
      firstName: result.data.firstName,
      lastName: result.data.lastName,
      color,
      password: hashedPassword,
    },
  });

  const token = await signToken({
    id: newUser.id,
    email: newUser.email,
    firstName: newUser.firstName,
    lastName: newUser.lastName,
    color: newUser.color,
    isAdmin: false,
  });

  (await cookies()).set({
    name: process.env.JWT_KEY!,
    value: token,
    httpOnly: true,
    secure: true,
    path: "/",
  });
  sendRegisterEmail(result.data.email);

  return { success: true, redirectTo: "/" };
}

// ============================
// Reset Password
// ============================

const ResetPasswordSchemaEmail = z.object({
  email: z.string().email(),
});

export type HandleEmailSendingResult =
  | {
      success?: false;
      email?: string | string[];
    }
  | {
      success?: true;
      redirectTo: string;
    };

export async function handleEmailSending(
  data: FormData
): Promise<HandleEmailSendingResult> {
  const result = ResetPasswordSchemaEmail.safeParse(
    Object.fromEntries(data.entries())
  );
  if (!result.success) return result.error.formErrors.fieldErrors;

  const user = await db.user.findUnique({
    where: { email: result.data.email },
  });
  if (!user) return { email: "User does not exist" };

  const code = generateResetCode();
  await sendResetPasswordEmail(result.data.email, code);

  await db.resetPassword.upsert({
    where: { userId: user.id },
    update: {
      code: String(code),
      validUntil: new Date(Date.now() + TEN_MINUTES_IN_MS),
    },
    create: {
      code: String(code),
      validUntil: new Date(Date.now() + TEN_MINUTES_IN_MS),
      userId: user.id,
    },
  });

  return { success: true, redirectTo: "/" };
}

const ResetPasswordSchemaVerification = z.object({
  code: z.string(),
});

type HandleVerificationProps =
  | {
      success?: false;
      code?: string[] | string;
    }
  | {
      success?: true;
      redirectTo: string;
    };

export async function handleVerification(
  data: FormData
): Promise<HandleVerificationProps> {
  const result = ResetPasswordSchemaVerification.safeParse(
    Object.fromEntries(data.entries())
  );
  if (!result.success) return result.error.formErrors.fieldErrors;

  const resetPassword = await db.resetPassword.findUnique({
    where: { code: result.data.code },
  });

  if (!resetPassword) return { code: "Invalid code" };

  if (resetPassword.validUntil < new Date())
    return { code: "Code has expired" };

  return { redirectTo: `/reset-code/${resetPassword.id}` };
}

const HandlPasswordSchema = z.object({
  password: z.string().min(8, {
    message: "Password must be at least 8 characters",
  }),
  confirmPassword: z.string().min(8, {
    message: "Password must be at least 8 characters",
  }),
});

type handlePasswordResetProps = {
  success?: boolean;
  password?: string[] | string;
  confirmPassword?: string[] | string;
};

export async function handlePasswordReset(
  resetPassId: string,
  _: unknown,
  data: FormData
): Promise<handlePasswordResetProps> {
  const result = HandlPasswordSchema.safeParse(
    Object.fromEntries(data.entries())
  );
  if (!result.success) return result.error.formErrors.fieldErrors;

  if (result.data.password !== result.data.confirmPassword)
    return { confirmPassword: "Passwords do not match" };

  const resetPassword = await db.resetPassword.findUnique({
    where: { id: resetPassId },
  });
  const user = await db.user.findUnique({
    where: { id: resetPassword?.userId },
  });

  const hashedPassword = await hashPassword(result.data.password);
  await db.user.update({
    where: { id: user?.id },
    data: { password: hashedPassword },
  });

  return { success: true };
}

function generateResetCode(): string {
  const min = 10000;
  const max = 99999;
  const code = Math.floor(Math.random() * (max - min + 1)) + min;
  return String(code);
}

// ============================
// Google Auth
// ============================

// const client = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

// export async function handleGoogleLogin(
//   response: google.accounts.id.CredentialResponse
// ) {
//   const token = response.credential;
//   const ticket = await client.verifyIdToken({
//     idToken: token,
//     audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
//   });

//   const payload = ticket.getPayload();
//   if (!payload) throw new Error("Invalid Google token");

//   let user = await db.user.findUnique({
//     where: { email: payload.email },
//   });

//   if (!user) {
//     user = await db.user.create({
//       data: {
//         email: payload.email!,
//         password: "", // No password needed for OAuth users
//       },
//     });
//   }

//   const jwt = await signToken({
//     id: user.id,
//     email: user.email,
//     isAdmin: user.isAdmin,
//   });

//   (await cookies()).set({
//     name: process.env.JWT_KEY!,
//     value: jwt,
//     httpOnly: true,
//     secure: true,
//     path: "/",
//   });

//   redirect("/");
// }
