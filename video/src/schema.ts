import { z } from 'zod';

export const ClientTutorialSchema = z.object({
  clientName: z.string().default('María García López'),
  clientPhone: z.string().default('55 1234 5678'),
  clientEmail: z.string().default('maria@correo.com'),
  clientAddress: z.string().default('Av. Reforma 234, Col. Centro'),
  clientCity: z.string().default('Ciudad de México'),
  clientNotes: z.string().default('Cliente VIP'),
});

export type ClientTutorialProps = z.infer<typeof ClientTutorialSchema>;

export const InventoryTutorialSchema = z.object({
  itemName: z.string().default('Hielo (Bolsa 5kg)'),
  itemCategory: z.string().default('Consumible'),
  itemStock: z.string().default('50'),
  itemMinStock: z.string().default('10'),
  itemUnit: z.string().default('Bolsas'),
  itemCost: z.string().default('35.00'),
});

export type InventoryTutorialProps = z.infer<typeof InventoryTutorialSchema>;
