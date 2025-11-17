import { z } from "zod";

// Password validation schema with strength requirements
export const passwordSchema = z
  .string()
  .min(8, "A senha deve ter no mínimo 8 caracteres")
  .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula")
  .regex(/[a-z]/, "A senha deve conter pelo menos uma letra minúscula")
  .regex(/[0-9]/, "A senha deve conter pelo menos um número");

// Email validation
export const emailSchema = z
  .string()
  .trim()
  .email("E-mail inválido")
  .max(255, "E-mail muito longo");

// Name validation - alphanumeric + common name characters
export const nameSchema = z
  .string()
  .trim()
  .min(3, "Nome deve ter no mínimo 3 caracteres")
  .max(100, "Nome muito longo")
  .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "Nome contém caracteres inválidos");

// Registration number validation - alphanumeric only
export const registrationNumberSchema = z
  .string()
  .trim()
  .min(4, "Matrícula deve ter no mínimo 4 caracteres")
  .max(20, "Matrícula muito longa")
  .regex(/^[a-zA-Z0-9]+$/, "Matrícula deve conter apenas letras e números");

// Face descriptor validation - must be array of 128 finite numbers
export const faceDescriptorSchema = z
  .array(z.number().finite())
  .length(128, "Descritor facial inválido");

// Sign up form validation
export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: nameSchema,
  registrationNumber: registrationNumberSchema,
  classId: z.string().optional(),
});

// Sign in form validation
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Senha obrigatória"),
});

// Admin user creation validation
export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: nameSchema,
  registrationNumber: registrationNumberSchema,
  role: z.enum(["teacher", "student", "admin"]),
  classId: z.string().optional(),
  teacherClasses: z.array(z.string()).optional(),
});

export type SignUpFormData = z.infer<typeof signUpSchema>;
export type SignInFormData = z.infer<typeof signInSchema>;
export type CreateUserFormData = z.infer<typeof createUserSchema>;
