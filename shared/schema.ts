import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model from the original schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Document model for storing analyzed documents
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  filename: text("filename"),
  mimeType: text("mime_type"),
  userId: integer("user_id").references(() => users.id),
  createdAt: text("created_at").notNull(),
  aiProbability: integer("ai_probability"),
  isAi: boolean("is_ai"),
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  content: true,
  filename: true,
  mimeType: true,
  userId: true,
});

// Analysis model for storing document analysis results
export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  summary: text("summary").notNull(),
  overallScore: integer("overall_score").notNull(),
  overallAssessment: text("overall_assessment").notNull(),
  dimensions: jsonb("dimensions").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertAnalysisSchema = createInsertSchema(analyses).pick({
  documentId: true,
  summary: true,
  overallScore: true,
  overallAssessment: true,
  dimensions: true,
});

// Comparison model for storing comparison results between two documents
export const comparisons = pgTable("comparisons", {
  id: serial("id").primaryKey(),
  documentAId: integer("document_a_id").references(() => documents.id).notNull(),
  documentBId: integer("document_b_id").references(() => documents.id).notNull(),
  analysisAId: integer("analysis_a_id").references(() => analyses.id).notNull(),
  analysisBId: integer("analysis_b_id").references(() => analyses.id).notNull(),
  comparisonResults: jsonb("comparison_results").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertComparisonSchema = createInsertSchema(comparisons).pick({
  documentAId: true,
  documentBId: true,
  analysisAId: true,
  analysisBId: true,
  comparisonResults: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analyses.$inferSelect;

export type InsertComparison = z.infer<typeof insertComparisonSchema>;
export type Comparison = typeof comparisons.$inferSelect;
