import { db } from '../db';
import {
  canonicalModels,
  modelStatusAudit,
  extractions,
} from '../db/schema';
import { eq, and, ilike } from 'drizzle-orm';

/**
 * Type for extraction result from providers
 */
export interface ExtractionResult {
  modelName: string;
  inputPricePer1m?: number;
  outputPricePer1m?: number;
  contextWindow?: number;
  confidence: 'verified' | 'likely' | 'low_confidence';
  rawEvidence?: Record<string, unknown>;
}

/**
 * Score breakdown for duplicate detection
 */
export interface DuplicateDetectionScore {
  providerIdMatch?: number; // 0 or 100
  aliasMatch?: number; // 0 or 90
  normalizedNameMatch?: number; // 0 or 75
  familyAndContextMatch?: number; // 0 or 60
  pricingSimilarity?: number; // 0 to 40
}

/**
 * Canonical Registry for managing model identity and lifecycle
 */
export class CanonicalRegistry {
  /**
   * Register a new extraction or return existing canonical model ID
   *
   * Priority: provider model ID > alias > normalized name > family+context
   */
  async register(
    providerName: string,
    providerModelId: string,
    extraction: ExtractionResult,
    sourceTier: 'tier1' | 'tier2' | 'tier3',
  ): Promise<string> {
    // First, try to find existing model by provider model ID (highest priority per D-04)
    const existing = await this.resolveByProviderId(providerName, providerModelId);
    if (existing) {
      // Update last_seen and record audit event
      await db
        .update(canonicalModels)
        .set({
          lastSeen: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(canonicalModels.id, existing.id));

      await this.recordAuditEvent(existing.id, 'created', null, 'active', {
        reason: 'duplicate_registration_attempt',
        providerName,
        providerModelId,
      });

      return existing.id;
    }

    // Try to resolve by alias or normalized name
    const resolved = await this.resolve(providerName, extraction.modelName, providerModelId);
    if (resolved) {
      // Update last_seen and add provider model ID if not present
      const existing_model = await db.query.canonicalModels.findFirst({
        where: eq(canonicalModels.id, resolved.canonical_id),
      });

      if (existing_model?.apiModelIds && !existing_model.apiModelIds.includes(providerModelId)) {
        const updated_ids = [...existing_model.apiModelIds, providerModelId];
        await db
          .update(canonicalModels)
          .set({
            apiModelIds: updated_ids,
            lastSeen: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(canonicalModels.id, resolved.canonical_id));
      } else if (!existing_model?.apiModelIds) {
        await db
          .update(canonicalModels)
          .set({
            apiModelIds: [providerModelId],
            lastSeen: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(canonicalModels.id, resolved.canonical_id));
      }

      return resolved.canonical_id;
    }

    // Create new canonical model
    const newModel = await db
      .insert(canonicalModels)
      .values({
        canonicalName: extraction.modelName,
        provider: providerName,
        aliases: [extraction.modelName],
        apiModelIds: [providerModelId],
        status: 'active',
        firstSeen: new Date(),
        lastSeen: new Date(),
        lineage: {
          created: new Date().toISOString(),
          provider: providerName,
          providerModelId,
          sourceTier,
        },
      })
      .returning({ id: canonicalModels.id });

    if (!newModel[0]) {
      throw new Error('Failed to create canonical model');
    }

    // Record creation audit event
    await this.recordAuditEvent(newModel[0].id, 'created', null, 'active', {
      provider: providerName,
      providerModelId,
      sourceTier,
      extraction,
    });

    return newModel[0].id;
  }

  /**
   * Resolve model by provider ID first (highest priority), then alias, then normalized name
   */
  async resolve(
    providerName: string,
    extractedName: string,
    providerModelId?: string,
  ): Promise<{ canonical_id: string; canonical_name: string } | null> {
    // WR-08: Fetch models once and reuse for all lookups
    const models = await db.query.canonicalModels.findMany({
      where: eq(canonicalModels.provider, providerName),
    });

    // 1. Try provider model ID lookup (highest priority per D-04)
    if (providerModelId) {
      const match = models.find(m => m.apiModelIds?.includes(providerModelId));
      if (match) {
        return {
          canonical_id: match.id,
          canonical_name: match.canonicalName,
        };
      }
    }

    // 2. Try alias exact match
    for (const model of models) {
      if (model.aliases?.some((alias: string) => alias.toLowerCase() === extractedName.toLowerCase())) {
        return {
          canonical_id: model.id,
          canonical_name: model.canonicalName,
        };
      }
    }

    // 3. Try normalized name match
    const normalized = this.normalizeName(extractedName);
    for (const model of models) {
      if (this.normalizeName(model.canonicalName) === normalized) {
        return {
          canonical_id: model.id,
          canonical_name: model.canonicalName,
        };
      }
    }

    return null;
  }

  /**
   * Add alias to existing canonical model
   */
  async addAlias(canonical_id: string, alias: string): Promise<void> {
    const model = await db.query.canonicalModels.findFirst({
      where: eq(canonicalModels.id, canonical_id),
    });

    if (!model) {
      throw new Error(`Canonical model ${canonical_id} not found`);
    }

    const existing_aliases = model.aliases || [];
    if (!existing_aliases.includes(alias)) {
      const updated_aliases = [...existing_aliases, alias];
      await db
        .update(canonicalModels)
        .set({
          aliases: updated_aliases,
          updatedAt: new Date(),
        })
        .where(eq(canonicalModels.id, canonical_id));

      await this.recordAuditEvent(canonical_id, 'aliased', model.status || 'active', model.status || 'active', {
        alias,
        reason: 'manual_alias_addition',
      });
    }
  }

  /**
   * Record rename with lineage tracking
   */
  async recordRename(
    canonical_id: string,
    old_name: string,
    new_name: string,
    reason: string,
  ): Promise<void> {
    const model = await db.query.canonicalModels.findFirst({
      where: eq(canonicalModels.id, canonical_id),
    });

    if (!model) {
      throw new Error(`Canonical model ${canonical_id} not found`);
    }

    // Append old name to aliases if not already present
    const existing_aliases = model.aliases || [];
    const updated_aliases = existing_aliases.includes(old_name)
      ? existing_aliases
      : [...existing_aliases, old_name];

    // Update lineage with rename history
    const existing_lineage = (model.lineage as Record<string, unknown>) || {};
    const renames = (existing_lineage.renames as Array<Record<string, unknown>>) || [];
    renames.push({
      timestamp: new Date().toISOString(),
      from: old_name,
      to: new_name,
      reason,
    });

    await db
      .update(canonicalModels)
      .set({
        canonicalName: new_name,
        aliases: updated_aliases,
        lineage: {
          ...existing_lineage,
          renames,
        },
        updatedAt: new Date(),
      })
      .where(eq(canonicalModels.id, canonical_id));

    await this.recordAuditEvent(canonical_id, 'renamed', model.status || 'active', model.status || 'active', {
      old_name,
      new_name,
      reason,
    });
  }

  /**
   * Get full lineage for a canonical model
   */
  async getLineage(canonical_id: string): Promise<Array<Record<string, unknown>>> {
    const model = await db.query.canonicalModels.findFirst({
      where: eq(canonicalModels.id, canonical_id),
    });

    if (!model) {
      throw new Error(`Canonical model ${canonical_id} not found`);
    }

    const lineage = (model.lineage as Record<string, unknown>) || {};
    const events = await db.query.modelStatusAudit.findMany({
      where: eq(modelStatusAudit.canonicalModelId, canonical_id),
    });

    return [
      {
        type: 'model_created',
        timestamp: model.createdAt,
        canonicalName: model.canonicalName,
        provider: model.provider,
        initialLineage: lineage,
      },
      ...events.map((event) => ({
        type: event.eventType,
        timestamp: event.createdAt,
        previousStatus: event.previousStatus,
        newStatus: event.newStatus,
        details: event.details,
        triggeredBy: event.triggeredBy,
      })),
    ];
  }

  /**
   * Mark model as deprecated with optional replacement
   */
  async markDeprecated(canonical_id: string, replacedBy?: string): Promise<void> {
    const model = await db.query.canonicalModels.findFirst({
      where: eq(canonicalModels.id, canonical_id),
    });

    if (!model) {
      throw new Error(`Canonical model ${canonical_id} not found`);
    }

    const lineage = (model.lineage as Record<string, unknown>) || {};
    const status = replacedBy ? 'replaced' : 'deprecated';

    await db
      .update(canonicalModels)
      .set({
        status: status as any,
        lineage: {
          ...lineage,
          deprecatedAt: new Date().toISOString(),
          replacedBy,
        },
        updatedAt: new Date(),
      })
      .where(eq(canonicalModels.id, canonical_id));

    await this.recordAuditEvent(
      canonical_id,
      replacedBy ? 'replaced' : 'deprecated',
      'active',
      status,
      {
        replacedBy,
        reason: 'model_lifecycle_update',
      },
    );
  }

  /**
   * Record audit event (immutable log)
   */
  private async recordAuditEvent(
    canonical_model_id: string,
    event_type: 'created' | 'renamed' | 'aliased' | 'deprecated' | 'replaced' | 'quarantined',
    previous_status: string | null,
    new_status: string,
    details: Record<string, unknown>,
  ): Promise<void> {
    await db.insert(modelStatusAudit).values({
      canonicalModelId: canonical_model_id,
      eventType: event_type,
      previousStatus: previous_status,
      newStatus: new_status,
      details,
      triggeredBy: 'auto_detection',
    });
  }

  /**
   * Normalize model name for matching: lowercase, trim, remove punctuation
   */
  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove punctuation except dash
      .replace(/\s+/g, '-') // Replace spaces with dash
      .replace(/-+/g, '-'); // Collapse multiple dashes
  }
}

// Export singleton instance for convenience
export const registry = new CanonicalRegistry();
