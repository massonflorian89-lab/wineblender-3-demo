-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║  ⚠  BASELINE OBSOLÈTE — DÉSYNCHRONISÉ DE LA PROD RICHEMER           ║
-- ║                                                                     ║
-- ║  Ce baseline reflète UNIQUEMENT l'état 001 → 046.                   ║
-- ║                                                                     ║
-- ║  Migrations appliquées en prod APRÈS la génération de ce fichier    ║
-- ║  (= manquantes ici) :                                               ║
-- ║    • 047_assemblage_cepages_inheritance.sql (héritage cépages)      ║
-- ║    • 048_v_cuverie_etat.sql (vue d'état cuverie)                    ║
-- ║    • 049_analyses_temperature.sql (colonne analyses.temperature)    ║
-- ║                                                                     ║
-- ║  USAGE AUTORISÉ :                                                   ║
-- ║    • Lecture / référence historique pour comprendre l'état du       ║
-- ║      schéma à la date de génération.                                ║
-- ║                                                                     ║
-- ║  USAGE INTERDIT (tant que régénération non effectuée) :             ║
-- ║    • ❌ Onboarding d'un nouveau client / nouveau projet Supabase.   ║
-- ║      → utiliser temporairement la séquence 001→049 en attendant.    ║
-- ║                                                                     ║
-- ║  PROCÉDURE DE RÉGÉNÉRATION : sql/tests/DIFF_baseline.md (chantier   ║
-- ║  Phase 7 D, différé volontairement — à reprendre avant la 1ʳᵉ mise  ║
-- ║  en service commerciale d'un client). Validation DIFF obligatoire.  ║
-- ║                                                                     ║
-- ║  PROD RICHEMER : NON AFFECTÉE — applique la séquence migrations     ║
-- ║  individuelles, ce baseline ne lui sert pas. Voir mémoire           ║
-- ║  project_wb3_baseline_dette.md pour le suivi.                       ║
-- ║                                                                     ║
-- ║  Bandeau ajouté Sprint 1 stabilisation (2026-05-22) — sera          ║
-- ║  supprimé automatiquement par la prochaine régénération pg_dump.    ║
-- ╚═══════════════════════════════════════════════════════════════════╝

-- ============================================================
-- 000_consolidated_baseline.sql — WB3 schéma complet (état 001→046)
-- ------------------------------------------------------------
-- Généré par : pg_dump --schema-only --clean --if-exists de la base
-- Richemer (= résultat prouvé de 001→046 : pgTAP 14/14, integrity OK).
-- Retouches manuelles ciblées (têtes/queues uniquement, corps intact) :
--   • lignes psql \restrict / \unrestrict retirées (SQL Editor ≠ psql)
--   • DROP SCHEMA public retiré (dangereux sur projet Supabase)
--   • CREATE SCHEMA public → IF NOT EXISTS
--   • bloc realtime supabase_realtime ajouté en fin (non dumpé par
--     pg_dump car objet global hors schéma public)
--
-- USAGE : projet Supabase NEUF uniquement. Idempotent (--clean
-- --if-exists). NE PAS exécuter sur une base contenant des données
-- (les DROP ... IF EXISTS détruiraient les objets existants).
-- Les 47 migrations 001→046 restent la source de vérité pour la prod.
-- À valider obligatoirement via sql/tests/DIFF_baseline.md.
-- ============================================================

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

DROP POLICY IF EXISTS user_prefs_update ON public.user_preferences;
DROP POLICY IF EXISTS user_prefs_select ON public.user_preferences;
DROP POLICY IF EXISTS user_prefs_insert ON public.user_preferences;
DROP POLICY IF EXISTS user_prefs_delete ON public.user_preferences;
DROP POLICY IF EXISTS travees_update ON public.travees;
DROP POLICY IF EXISTS travees_select ON public.travees;
DROP POLICY IF EXISTS travees_insert ON public.travees;
DROP POLICY IF EXISTS travees_delete ON public.travees;
DROP POLICY IF EXISTS tenants_select ON public.tenants;
DROP POLICY IF EXISTS produits_lots_update ON public.produits_lots;
DROP POLICY IF EXISTS produits_lots_select ON public.produits_lots;
DROP POLICY IF EXISTS produits_lots_insert ON public.produits_lots;
DROP POLICY IF EXISTS produits_lots_delete ON public.produits_lots;
DROP POLICY IF EXISTS produits_cat_update ON public.produits_catalogue;
DROP POLICY IF EXISTS produits_cat_select ON public.produits_catalogue;
DROP POLICY IF EXISTS produits_cat_insert ON public.produits_catalogue;
DROP POLICY IF EXISTS produits_cat_delete ON public.produits_catalogue;
DROP POLICY IF EXISTS operations_update ON public.operations;
DROP POLICY IF EXISTS operations_select ON public.operations;
DROP POLICY IF EXISTS operations_insert ON public.operations;
DROP POLICY IF EXISTS operations_delete ON public.operations;
DROP POLICY IF EXISTS op_produits_update ON public.operation_produits;
DROP POLICY IF EXISTS op_produits_select ON public.operation_produits;
DROP POLICY IF EXISTS op_produits_insert ON public.operation_produits;
DROP POLICY IF EXISTS op_produits_delete ON public.operation_produits;
DROP POLICY IF EXISTS op_lots_update ON public.operation_lots;
DROP POLICY IF EXISTS op_lots_select ON public.operation_lots;
DROP POLICY IF EXISTS op_lots_insert ON public.operation_lots;
DROP POLICY IF EXISTS op_lots_delete ON public.operation_lots;
DROP POLICY IF EXISTS op_cont_update ON public.operation_contenants;
DROP POLICY IF EXISTS op_cont_select ON public.operation_contenants;
DROP POLICY IF EXISTS op_cont_insert ON public.operation_contenants;
DROP POLICY IF EXISTS op_cont_delete ON public.operation_contenants;
DROP POLICY IF EXISTS memberships_update_admin ON public.memberships;
DROP POLICY IF EXISTS memberships_select_own ON public.memberships;
DROP POLICY IF EXISTS memberships_select_admin ON public.memberships;
DROP POLICY IF EXISTS memberships_insert_admin ON public.memberships;
DROP POLICY IF EXISTS memberships_delete_admin ON public.memberships;
DROP POLICY IF EXISTS lots_update ON public.lots;
DROP POLICY IF EXISTS lots_select ON public.lots;
DROP POLICY IF EXISTS lots_insert ON public.lots;
DROP POLICY IF EXISTS lots_delete ON public.lots;
DROP POLICY IF EXISTS lot_filiation_update ON public.lot_filiation;
DROP POLICY IF EXISTS lot_filiation_select ON public.lot_filiation;
DROP POLICY IF EXISTS lot_filiation_insert ON public.lot_filiation;
DROP POLICY IF EXISTS lot_filiation_delete ON public.lot_filiation;
DROP POLICY IF EXISTS lot_contenants_update ON public.lot_contenants;
DROP POLICY IF EXISTS lot_contenants_select ON public.lot_contenants;
DROP POLICY IF EXISTS lot_contenants_insert ON public.lot_contenants;
DROP POLICY IF EXISTS lot_contenants_delete ON public.lot_contenants;
DROP POLICY IF EXISTS lot_cepages_update ON public.lot_cepages;
DROP POLICY IF EXISTS lot_cepages_select ON public.lot_cepages;
DROP POLICY IF EXISTS lot_cepages_insert ON public.lot_cepages;
DROP POLICY IF EXISTS lot_cepages_delete ON public.lot_cepages;
DROP POLICY IF EXISTS lm_select ON public.lot_mouvements;
DROP POLICY IF EXISTS lm_insert ON public.lot_mouvements;
DROP POLICY IF EXISTS lm_delete ON public.lot_mouvements;
DROP POLICY IF EXISTS lch_update ON public.lot_contenants_history;
DROP POLICY IF EXISTS lch_select ON public.lot_contenants_history;
DROP POLICY IF EXISTS lch_insert ON public.lot_contenants_history;
DROP POLICY IF EXISTS lch_delete ON public.lot_contenants_history;
DROP POLICY IF EXISTS fiches_update ON public.fiches_travail;
DROP POLICY IF EXISTS fiches_select ON public.fiches_travail;
DROP POLICY IF EXISTS fiches_insert ON public.fiches_travail;
DROP POLICY IF EXISTS fiches_delete ON public.fiches_travail;
DROP POLICY IF EXISTS contenants_update ON public.contenants;
DROP POLICY IF EXISTS contenants_select ON public.contenants;
DROP POLICY IF EXISTS contenants_insert ON public.contenants;
DROP POLICY IF EXISTS contenants_delete ON public.contenants;
DROP POLICY IF EXISTS cepages_update ON public.cepages;
DROP POLICY IF EXISTS cepages_select ON public.cepages;
DROP POLICY IF EXISTS cepages_insert ON public.cepages;
DROP POLICY IF EXISTS cepages_delete ON public.cepages;
DROP POLICY IF EXISTS audit_select_admin ON public.audit_log;
DROP POLICY IF EXISTS apports_update ON public.apports;
DROP POLICY IF EXISTS apports_select ON public.apports;
DROP POLICY IF EXISTS apports_insert ON public.apports;
DROP POLICY IF EXISTS apports_delete ON public.apports;
DROP POLICY IF EXISTS analyses_update ON public.analyses;
DROP POLICY IF EXISTS analyses_select ON public.analyses;
DROP POLICY IF EXISTS analyses_insert ON public.analyses;
DROP POLICY IF EXISTS analyses_delete ON public.analyses;
DROP POLICY IF EXISTS ajust_tenant_isolation ON public.ajustements_volume;
ALTER TABLE IF EXISTS ONLY public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.travees DROP CONSTRAINT IF EXISTS travees_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.produits_lots DROP CONSTRAINT IF EXISTS produits_lots_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.produits_lots DROP CONSTRAINT IF EXISTS produits_lots_produit_id_fkey;
ALTER TABLE IF EXISTS ONLY public.produits_catalogue DROP CONSTRAINT IF EXISTS produits_catalogue_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.operations DROP CONSTRAINT IF EXISTS operations_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.operation_produits DROP CONSTRAINT IF EXISTS operation_produits_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.operation_produits DROP CONSTRAINT IF EXISTS operation_produits_produit_lot_id_fkey;
ALTER TABLE IF EXISTS ONLY public.operation_produits DROP CONSTRAINT IF EXISTS operation_produits_operation_id_fkey;
ALTER TABLE IF EXISTS ONLY public.operation_lots DROP CONSTRAINT IF EXISTS operation_lots_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.operation_lots DROP CONSTRAINT IF EXISTS operation_lots_operation_id_fkey;
ALTER TABLE IF EXISTS ONLY public.operation_lots DROP CONSTRAINT IF EXISTS operation_lots_lot_id_fkey;
ALTER TABLE IF EXISTS ONLY public.operation_contenants DROP CONSTRAINT IF EXISTS operation_contenants_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.operation_contenants DROP CONSTRAINT IF EXISTS operation_contenants_operation_id_fkey;
ALTER TABLE IF EXISTS ONLY public.operation_contenants DROP CONSTRAINT IF EXISTS operation_contenants_contenant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.memberships DROP CONSTRAINT IF EXISTS memberships_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.memberships DROP CONSTRAINT IF EXISTS memberships_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lots DROP CONSTRAINT IF EXISTS lots_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lot_mouvements DROP CONSTRAINT IF EXISTS lot_mouvements_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lot_mouvements DROP CONSTRAINT IF EXISTS lot_mouvements_operation_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lot_mouvements DROP CONSTRAINT IF EXISTS lot_mouvements_lot_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lot_mouvements DROP CONSTRAINT IF EXISTS lot_mouvements_contenant_source_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lot_mouvements DROP CONSTRAINT IF EXISTS lot_mouvements_contenant_dest_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lot_filiation DROP CONSTRAINT IF EXISTS lot_filiation_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lot_filiation DROP CONSTRAINT IF EXISTS lot_filiation_parent_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lot_filiation DROP CONSTRAINT IF EXISTS lot_filiation_operation_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lot_filiation DROP CONSTRAINT IF EXISTS lot_filiation_lot_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lot_contenants DROP CONSTRAINT IF EXISTS lot_contenants_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lot_contenants DROP CONSTRAINT IF EXISTS lot_contenants_lot_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lot_contenants_history DROP CONSTRAINT IF EXISTS lot_contenants_history_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lot_contenants_history DROP CONSTRAINT IF EXISTS lot_contenants_history_lot_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lot_contenants_history DROP CONSTRAINT IF EXISTS lot_contenants_history_contenant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lot_contenants DROP CONSTRAINT IF EXISTS lot_contenants_contenant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lot_cepages DROP CONSTRAINT IF EXISTS lot_cepages_lot_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lot_cepages DROP CONSTRAINT IF EXISTS lot_cepages_cepage_id_fkey;
ALTER TABLE IF EXISTS ONLY public.fiches_travail DROP CONSTRAINT IF EXISTS fiches_travail_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.fiches_travail DROP CONSTRAINT IF EXISTS fiches_travail_signature_oenologue_fkey;
ALTER TABLE IF EXISTS ONLY public.fiches_travail DROP CONSTRAINT IF EXISTS fiches_travail_caviste_id_fkey;
ALTER TABLE IF EXISTS ONLY public.contenants DROP CONSTRAINT IF EXISTS contenants_travee_id_fkey;
ALTER TABLE IF EXISTS ONLY public.contenants DROP CONSTRAINT IF EXISTS contenants_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.cepages DROP CONSTRAINT IF EXISTS cepages_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.apports DROP CONSTRAINT IF EXISTS apports_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.apports DROP CONSTRAINT IF EXISTS apports_lot_id_fkey;
ALTER TABLE IF EXISTS ONLY public.apports DROP CONSTRAINT IF EXISTS apports_contenant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.analyses DROP CONSTRAINT IF EXISTS analyses_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.analyses DROP CONSTRAINT IF EXISTS analyses_lot_id_fkey;
ALTER TABLE IF EXISTS ONLY public.analyses DROP CONSTRAINT IF EXISTS analyses_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.analyses DROP CONSTRAINT IF EXISTS analyses_contenant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.ajustements_volume DROP CONSTRAINT IF EXISTS ajustements_volume_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.ajustements_volume DROP CONSTRAINT IF EXISTS ajustements_volume_operation_id_fkey;
ALTER TABLE IF EXISTS ONLY public.ajustements_volume DROP CONSTRAINT IF EXISTS ajustements_volume_lot_id_fkey;
ALTER TABLE IF EXISTS ONLY public.ajustements_volume DROP CONSTRAINT IF EXISTS ajustements_volume_contenant_id_fkey;
DROP TRIGGER IF EXISTS trg_op_produits_lock ON public.operation_produits;
DROP TRIGGER IF EXISTS trg_op_lots_lock ON public.operation_lots;
DROP TRIGGER IF EXISTS trg_op_lock_check ON public.operations;
DROP TRIGGER IF EXISTS trg_op_contenants_lock ON public.operation_contenants;
DROP TRIGGER IF EXISTS trg_lot_contenants_history ON public.lot_contenants;
DROP TRIGGER IF EXISTS trg_lm_delete_check ON public.lot_mouvements;
DROP TRIGGER IF EXISTS trg_audit ON public.produits_lots;
DROP TRIGGER IF EXISTS trg_audit ON public.produits_catalogue;
DROP TRIGGER IF EXISTS trg_audit ON public.operations;
DROP TRIGGER IF EXISTS trg_audit ON public.lots;
DROP TRIGGER IF EXISTS trg_audit ON public.lot_mouvements;
DROP TRIGGER IF EXISTS trg_audit ON public.contenants;
DROP TRIGGER IF EXISTS trg_audit ON public.apports;
DROP TRIGGER IF EXISTS trg_audit ON public.analyses;
DROP TRIGGER IF EXISTS trg_audit ON public.ajustements_volume;
DROP TRIGGER IF EXISTS produits_lots_updated_at ON public.produits_lots;
DROP TRIGGER IF EXISTS produits_catalogue_updated_at ON public.produits_catalogue;
DROP TRIGGER IF EXISTS operations_updated_at ON public.operations;
DROP TRIGGER IF EXISTS lots_updated_at ON public.lots;
DROP TRIGGER IF EXISTS lot_contenants_sync_volume ON public.lot_contenants;
DROP TRIGGER IF EXISTS apports_updated_at ON public.apports;
DROP TRIGGER IF EXISTS analyses_updated_at ON public.analyses;
DROP INDEX IF EXISTS public.uq_lot_filiation_manual;
DROP INDEX IF EXISTS public.uq_lot_filiation_assemblage;
DROP INDEX IF EXISTS public.lots_tenant_numero_lot_key;
DROP INDEX IF EXISTS public.idx_user_prefs_user;
DROP INDEX IF EXISTS public.idx_travees_tenant;
DROP INDEX IF EXISTS public.idx_produits_lots_tenant;
DROP INDEX IF EXISTS public.idx_produits_lots_produit;
DROP INDEX IF EXISTS public.idx_produits_lots_dluo;
DROP INDEX IF EXISTS public.idx_produits_lots_active;
DROP INDEX IF EXISTS public.idx_produits_cat_tenant;
DROP INDEX IF EXISTS public.idx_produits_cat_categorie;
DROP INDEX IF EXISTS public.idx_produits_cat_active;
DROP INDEX IF EXISTS public.idx_produits_cat_actif;
DROP INDEX IF EXISTS public.idx_operations_type;
DROP INDEX IF EXISTS public.idx_operations_tenant;
DROP INDEX IF EXISTS public.idx_operations_statut;
DROP INDEX IF EXISTS public.idx_operations_meta;
DROP INDEX IF EXISTS public.idx_operations_date;
DROP INDEX IF EXISTS public.idx_op_produits_tenant;
DROP INDEX IF EXISTS public.idx_op_produits_operation;
DROP INDEX IF EXISTS public.idx_op_produits_lot;
DROP INDEX IF EXISTS public.idx_op_lots_tenant;
DROP INDEX IF EXISTS public.idx_op_lots_operation;
DROP INDEX IF EXISTS public.idx_op_lots_lot;
DROP INDEX IF EXISTS public.idx_op_cont_tenant;
DROP INDEX IF EXISTS public.idx_op_cont_operation;
DROP INDEX IF EXISTS public.idx_op_cont_contenant;
DROP INDEX IF EXISTS public.idx_lots_tenant;
DROP INDEX IF EXISTS public.idx_lots_statut;
DROP INDEX IF EXISTS public.idx_lots_millesime;
DROP INDEX IF EXISTS public.idx_lots_couleur;
DROP INDEX IF EXISTS public.idx_lots_active_view;
DROP INDEX IF EXISTS public.idx_lot_filiation_tenant;
DROP INDEX IF EXISTS public.idx_lot_filiation_parent;
DROP INDEX IF EXISTS public.idx_lot_filiation_operation;
DROP INDEX IF EXISTS public.idx_lot_filiation_lot;
DROP INDEX IF EXISTS public.idx_lot_contenants_ten;
DROP INDEX IF EXISTS public.idx_lot_contenants_lot;
DROP INDEX IF EXISTS public.idx_lot_contenants_cont;
DROP INDEX IF EXISTS public.idx_lot_cepages_lot;
DROP INDEX IF EXISTS public.idx_lot_cepages_cepage;
DROP INDEX IF EXISTS public.idx_lm_tenant;
DROP INDEX IF EXISTS public.idx_lm_src;
DROP INDEX IF EXISTS public.idx_lm_operation;
DROP INDEX IF EXISTS public.idx_lm_lot;
DROP INDEX IF EXISTS public.idx_lm_dst;
DROP INDEX IF EXISTS public.idx_lm_date;
DROP INDEX IF EXISTS public.idx_lineage_parent;
DROP INDEX IF EXISTS public.idx_lineage_enfant;
DROP INDEX IF EXISTS public.idx_lch_tenant;
DROP INDEX IF EXISTS public.idx_lch_lot;
DROP INDEX IF EXISTS public.idx_lch_contenant;
DROP INDEX IF EXISTS public.idx_contenants_travee;
DROP INDEX IF EXISTS public.idx_contenants_tonnelier;
DROP INDEX IF EXISTS public.idx_contenants_tenant;
DROP INDEX IF EXISTS public.idx_contenants_materiau;
DROP INDEX IF EXISTS public.idx_contenants_marque;
DROP INDEX IF EXISTS public.idx_contenants_active;
DROP INDEX IF EXISTS public.idx_cepages_tenant;
DROP INDEX IF EXISTS public.idx_cepages_couleur;
DROP INDEX IF EXISTS public.idx_apports_tenant;
DROP INDEX IF EXISTS public.idx_apports_statut;
DROP INDEX IF EXISTS public.idx_apports_meta;
DROP INDEX IF EXISTS public.idx_apports_lot;
DROP INDEX IF EXISTS public.idx_apports_date;
DROP INDEX IF EXISTS public.idx_apports_contenant;
DROP INDEX IF EXISTS public.idx_apports_active;
DROP INDEX IF EXISTS public.idx_analyses_tenant_date;
DROP INDEX IF EXISTS public.idx_analyses_lot;
DROP INDEX IF EXISTS public.idx_analyses_active;
DROP INDEX IF EXISTS public.idx_ajust_tenant_operation;
DROP INDEX IF EXISTS public.idx_ajust_tenant_lot;
DROP INDEX IF EXISTS public.idx_ajust_tenant_date;
DROP INDEX IF EXISTS public.idx_ajust_tenant_contenant;
DROP INDEX IF EXISTS public.idx_audit_table;
DROP INDEX IF EXISTS public.idx_audit_tenant_date;
DROP INDEX IF EXISTS public.idx_audit_record;
ALTER TABLE IF EXISTS ONLY public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_pkey;
ALTER TABLE IF EXISTS ONLY public.travees DROP CONSTRAINT IF EXISTS travees_tenant_id_nom_key;
ALTER TABLE IF EXISTS ONLY public.travees DROP CONSTRAINT IF EXISTS travees_pkey;
ALTER TABLE IF EXISTS ONLY public.tenants DROP CONSTRAINT IF EXISTS tenants_slug_key;
ALTER TABLE IF EXISTS ONLY public.tenants DROP CONSTRAINT IF EXISTS tenants_pkey;
ALTER TABLE IF EXISTS ONLY public.produits_lots DROP CONSTRAINT IF EXISTS produits_lots_pkey;
ALTER TABLE IF EXISTS ONLY public.produits_catalogue DROP CONSTRAINT IF EXISTS produits_catalogue_pkey;
ALTER TABLE IF EXISTS ONLY public.operations DROP CONSTRAINT IF EXISTS operations_pkey;
ALTER TABLE IF EXISTS ONLY public.operation_produits DROP CONSTRAINT IF EXISTS operation_produits_pkey;
ALTER TABLE IF EXISTS ONLY public.operation_lots DROP CONSTRAINT IF EXISTS operation_lots_pkey;
ALTER TABLE IF EXISTS ONLY public.operation_contenants DROP CONSTRAINT IF EXISTS operation_contenants_pkey;
ALTER TABLE IF EXISTS ONLY public.memberships DROP CONSTRAINT IF EXISTS memberships_pkey;
ALTER TABLE IF EXISTS ONLY public.lots DROP CONSTRAINT IF EXISTS lots_tenant_id_nom_key;
ALTER TABLE IF EXISTS ONLY public.lots DROP CONSTRAINT IF EXISTS lots_pkey;
ALTER TABLE IF EXISTS ONLY public.lot_mouvements DROP CONSTRAINT IF EXISTS lot_mouvements_pkey;
ALTER TABLE IF EXISTS ONLY public.lot_filiation DROP CONSTRAINT IF EXISTS lot_filiation_pkey;
ALTER TABLE IF EXISTS ONLY public.lot_contenants DROP CONSTRAINT IF EXISTS lot_contenants_pkey;
ALTER TABLE IF EXISTS ONLY public.lot_contenants_history DROP CONSTRAINT IF EXISTS lot_contenants_history_pkey;
ALTER TABLE IF EXISTS ONLY public.lot_cepages DROP CONSTRAINT IF EXISTS lot_cepages_pkey;
ALTER TABLE IF EXISTS ONLY public.lineage DROP CONSTRAINT IF EXISTS lineage_pkey;
ALTER TABLE IF EXISTS ONLY public.fiches_travail DROP CONSTRAINT IF EXISTS fiches_travail_pkey;
ALTER TABLE IF EXISTS ONLY public.contenants DROP CONSTRAINT IF EXISTS contenants_tenant_id_nom_key;
ALTER TABLE IF EXISTS ONLY public.contenants DROP CONSTRAINT IF EXISTS contenants_pkey;
ALTER TABLE IF EXISTS ONLY public.cepages DROP CONSTRAINT IF EXISTS cepages_tenant_id_nom_key;
ALTER TABLE IF EXISTS ONLY public.cepages DROP CONSTRAINT IF EXISTS cepages_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_default DROP CONSTRAINT IF EXISTS audit_log_default_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2028_12 DROP CONSTRAINT IF EXISTS audit_log_2028_12_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2028_11 DROP CONSTRAINT IF EXISTS audit_log_2028_11_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2028_10 DROP CONSTRAINT IF EXISTS audit_log_2028_10_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2028_09 DROP CONSTRAINT IF EXISTS audit_log_2028_09_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2028_08 DROP CONSTRAINT IF EXISTS audit_log_2028_08_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2028_07 DROP CONSTRAINT IF EXISTS audit_log_2028_07_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2028_06 DROP CONSTRAINT IF EXISTS audit_log_2028_06_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2028_05 DROP CONSTRAINT IF EXISTS audit_log_2028_05_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2028_04 DROP CONSTRAINT IF EXISTS audit_log_2028_04_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2028_03 DROP CONSTRAINT IF EXISTS audit_log_2028_03_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2028_02 DROP CONSTRAINT IF EXISTS audit_log_2028_02_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2028_01 DROP CONSTRAINT IF EXISTS audit_log_2028_01_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2027_12 DROP CONSTRAINT IF EXISTS audit_log_2027_12_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2027_11 DROP CONSTRAINT IF EXISTS audit_log_2027_11_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2027_10 DROP CONSTRAINT IF EXISTS audit_log_2027_10_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2027_09 DROP CONSTRAINT IF EXISTS audit_log_2027_09_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2027_08 DROP CONSTRAINT IF EXISTS audit_log_2027_08_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2027_07 DROP CONSTRAINT IF EXISTS audit_log_2027_07_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2027_06 DROP CONSTRAINT IF EXISTS audit_log_2027_06_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2027_05 DROP CONSTRAINT IF EXISTS audit_log_2027_05_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2027_04 DROP CONSTRAINT IF EXISTS audit_log_2027_04_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2027_03 DROP CONSTRAINT IF EXISTS audit_log_2027_03_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2027_02 DROP CONSTRAINT IF EXISTS audit_log_2027_02_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2027_01 DROP CONSTRAINT IF EXISTS audit_log_2027_01_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2026_12 DROP CONSTRAINT IF EXISTS audit_log_2026_12_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2026_11 DROP CONSTRAINT IF EXISTS audit_log_2026_11_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2026_10 DROP CONSTRAINT IF EXISTS audit_log_2026_10_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2026_09 DROP CONSTRAINT IF EXISTS audit_log_2026_09_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2026_08 DROP CONSTRAINT IF EXISTS audit_log_2026_08_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2026_07 DROP CONSTRAINT IF EXISTS audit_log_2026_07_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2026_06 DROP CONSTRAINT IF EXISTS audit_log_2026_06_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2026_05 DROP CONSTRAINT IF EXISTS audit_log_2026_05_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2026_04 DROP CONSTRAINT IF EXISTS audit_log_2026_04_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2026_03 DROP CONSTRAINT IF EXISTS audit_log_2026_03_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2026_02 DROP CONSTRAINT IF EXISTS audit_log_2026_02_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2026_01 DROP CONSTRAINT IF EXISTS audit_log_2026_01_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2025_12 DROP CONSTRAINT IF EXISTS audit_log_2025_12_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2025_11 DROP CONSTRAINT IF EXISTS audit_log_2025_11_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2025_10 DROP CONSTRAINT IF EXISTS audit_log_2025_10_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2025_09 DROP CONSTRAINT IF EXISTS audit_log_2025_09_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2025_08 DROP CONSTRAINT IF EXISTS audit_log_2025_08_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2025_07 DROP CONSTRAINT IF EXISTS audit_log_2025_07_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2025_06 DROP CONSTRAINT IF EXISTS audit_log_2025_06_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2025_05 DROP CONSTRAINT IF EXISTS audit_log_2025_05_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2025_04 DROP CONSTRAINT IF EXISTS audit_log_2025_04_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2025_03 DROP CONSTRAINT IF EXISTS audit_log_2025_03_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2025_02 DROP CONSTRAINT IF EXISTS audit_log_2025_02_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log_2025_01 DROP CONSTRAINT IF EXISTS audit_log_2025_01_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log DROP CONSTRAINT IF EXISTS audit_log_pkey;
ALTER TABLE IF EXISTS ONLY public.apports DROP CONSTRAINT IF EXISTS apports_pkey;
ALTER TABLE IF EXISTS ONLY public.analyses DROP CONSTRAINT IF EXISTS analyses_pkey;
ALTER TABLE IF EXISTS ONLY public.ajustements_volume DROP CONSTRAINT IF EXISTS ajustements_volume_pkey;
DROP VIEW IF EXISTS public.v_stock_produits;
DROP VIEW IF EXISTS public.v_journal_operations;
DROP VIEW IF EXISTS public.v_consommation_produits;
DROP VIEW IF EXISTS public.v_apports_par_lot;
DROP VIEW IF EXISTS public.v_ajustements_detail;
DROP TABLE IF EXISTS public.user_preferences;
DROP TABLE IF EXISTS public.travees;
DROP TABLE IF EXISTS public.tenants;
DROP TABLE IF EXISTS public.produits_lots;
DROP TABLE IF EXISTS public.produits_catalogue;
DROP TABLE IF EXISTS public.operations;
DROP TABLE IF EXISTS public.operation_produits;
DROP TABLE IF EXISTS public.operation_lots;
DROP TABLE IF EXISTS public.operation_contenants;
DROP TABLE IF EXISTS public.memberships;
DROP TABLE IF EXISTS public.lots;
DROP TABLE IF EXISTS public.lot_mouvements;
DROP TABLE IF EXISTS public.lot_filiation;
DROP TABLE IF EXISTS public.lot_contenants_history;
DROP TABLE IF EXISTS public.lot_contenants;
DROP TABLE IF EXISTS public.lot_cepages;
DROP TABLE IF EXISTS public.lineage;
DROP TABLE IF EXISTS public.fiches_travail;
DROP TABLE IF EXISTS public.contenants;
DROP TABLE IF EXISTS public.cepages;
DROP TABLE IF EXISTS public.audit_log_default;
DROP TABLE IF EXISTS public.audit_log_2028_12;
DROP TABLE IF EXISTS public.audit_log_2028_11;
DROP TABLE IF EXISTS public.audit_log_2028_10;
DROP TABLE IF EXISTS public.audit_log_2028_09;
DROP TABLE IF EXISTS public.audit_log_2028_08;
DROP TABLE IF EXISTS public.audit_log_2028_07;
DROP TABLE IF EXISTS public.audit_log_2028_06;
DROP TABLE IF EXISTS public.audit_log_2028_05;
DROP TABLE IF EXISTS public.audit_log_2028_04;
DROP TABLE IF EXISTS public.audit_log_2028_03;
DROP TABLE IF EXISTS public.audit_log_2028_02;
DROP TABLE IF EXISTS public.audit_log_2028_01;
DROP TABLE IF EXISTS public.audit_log_2027_12;
DROP TABLE IF EXISTS public.audit_log_2027_11;
DROP TABLE IF EXISTS public.audit_log_2027_10;
DROP TABLE IF EXISTS public.audit_log_2027_09;
DROP TABLE IF EXISTS public.audit_log_2027_08;
DROP TABLE IF EXISTS public.audit_log_2027_07;
DROP TABLE IF EXISTS public.audit_log_2027_06;
DROP TABLE IF EXISTS public.audit_log_2027_05;
DROP TABLE IF EXISTS public.audit_log_2027_04;
DROP TABLE IF EXISTS public.audit_log_2027_03;
DROP TABLE IF EXISTS public.audit_log_2027_02;
DROP TABLE IF EXISTS public.audit_log_2027_01;
DROP TABLE IF EXISTS public.audit_log_2026_12;
DROP TABLE IF EXISTS public.audit_log_2026_11;
DROP TABLE IF EXISTS public.audit_log_2026_10;
DROP TABLE IF EXISTS public.audit_log_2026_09;
DROP TABLE IF EXISTS public.audit_log_2026_08;
DROP TABLE IF EXISTS public.audit_log_2026_07;
DROP TABLE IF EXISTS public.audit_log_2026_06;
DROP TABLE IF EXISTS public.audit_log_2026_05;
DROP TABLE IF EXISTS public.audit_log_2026_04;
DROP TABLE IF EXISTS public.audit_log_2026_03;
DROP TABLE IF EXISTS public.audit_log_2026_02;
DROP TABLE IF EXISTS public.audit_log_2026_01;
DROP TABLE IF EXISTS public.audit_log_2025_12;
DROP TABLE IF EXISTS public.audit_log_2025_11;
DROP TABLE IF EXISTS public.audit_log_2025_10;
DROP TABLE IF EXISTS public.audit_log_2025_09;
DROP TABLE IF EXISTS public.audit_log_2025_08;
DROP TABLE IF EXISTS public.audit_log_2025_07;
DROP TABLE IF EXISTS public.audit_log_2025_06;
DROP TABLE IF EXISTS public.audit_log_2025_05;
DROP TABLE IF EXISTS public.audit_log_2025_04;
DROP TABLE IF EXISTS public.audit_log_2025_03;
DROP TABLE IF EXISTS public.audit_log_2025_02;
DROP TABLE IF EXISTS public.audit_log_2025_01;
DROP TABLE IF EXISTS public.audit_log;
DROP TABLE IF EXISTS public.apports;
DROP TABLE IF EXISTS public.analyses;
DROP TABLE IF EXISTS public.ajustements_volume;
DROP FUNCTION IF EXISTS public.wb3_save_operation_graph(p_tenant_id uuid, p_op_id uuid, p_op jsonb, p_lots jsonb, p_contenants jsonb, p_produits jsonb);
DROP FUNCTION IF EXISTS public.wb3_save_lot_graph(p_tenant_id uuid, p_lot_id uuid, p_lot jsonb, p_cepages jsonb, p_contenants jsonb);
DROP FUNCTION IF EXISTS public.wb3_next_lot_numero(p_tenant_id uuid, p_millesime integer, p_date_entree date, p_cep_nom text, p_couleur text);
DROP FUNCTION IF EXISTS public.wb3_lot_contenants_history_trig();
DROP FUNCTION IF EXISTS public.wb3_lot_chain(p_tenant_id uuid, p_lot_id uuid, p_depth integer);
DROP FUNCTION IF EXISTS public.wb3_integrity_check(p_tenant_id uuid);
DROP FUNCTION IF EXISTS public.wb3_export_tenant(p_tenant_id uuid);
DROP FUNCTION IF EXISTS public.wb3_audit_create_partition(p_year integer, p_month integer);
DROP FUNCTION IF EXISTS public.wb3_apply_ajustement(p_tenant_id uuid, p_operation_id uuid, p_type text, p_lot_id uuid, p_contenant_id uuid, p_delta_hl numeric, p_volume_cible numeric, p_motif text, p_operateur text, p_date date);
DROP FUNCTION IF EXISTS public.user_tenants();
DROP FUNCTION IF EXISTS public.sync_lot_volume_actuel();
DROP FUNCTION IF EXISTS public.set_updated_at();
DROP FUNCTION IF EXISTS public.rls_auto_enable();
DROP FUNCTION IF EXISTS public.next_apport_numero(p_tenant_id uuid, p_year integer);
DROP FUNCTION IF EXISTS public.is_privileged_in(tenant uuid);
DROP FUNCTION IF EXISTS public.historique_lot(p_lot_id uuid);
DROP FUNCTION IF EXISTS public._wb3_op_lock_check();
DROP FUNCTION IF EXISTS public._wb3_op_graph_lock_check();
DROP FUNCTION IF EXISTS public._wb3_lm_delete_check();
DROP FUNCTION IF EXISTS public._wb3_audit();
DROP FUNCTION IF EXISTS public._wb3_apply_op_effects(p_tenant_id uuid, p_type text, p_lots jsonb, p_contenants jsonb, p_operation_id uuid);
-- [WB3] 'DROP SCHEMA IF EXISTS public;' retiré : dangereux sur Supabase
-- (détruirait le schéma géré + objets Supabase). Le schéma public
-- existe déjà sur un projet neuf.
--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: _wb3_apply_op_effects(uuid, text, jsonb, jsonb, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._wb3_apply_op_effects(p_tenant_id uuid, p_type text, p_lots jsonb, p_contenants jsonb, p_operation_id uuid DEFAULT NULL::uuid) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_lot_id         uuid;
  v_dest_lot_id    uuid;
  v_src_cont       uuid;
  v_dst_cont       uuid;
  v_op_vol         numeric;
  v_lc_vol         numeric;
  v_new_vol        numeric;
  v_has_src        boolean := false;
  v_has_dst        boolean := false;
  v_date_mv        date;
  v_lot_vol        numeric;   -- volume déclaré pour CE lot dans p_lots
  v_effective_vol  numeric;   -- volume à utiliser effectivement
  v_src_lot_count  int;       -- nb de contenants sources contenant ce lot
  v_dst_count      int;       -- nb de contenants destination dans p_contenants
BEGIN

  SELECT
    COALESCE(bool_or(elem->>'role' = 'source'),      false),
    COALESCE(bool_or(elem->>'role' = 'destination'), false)
  INTO v_has_src, v_has_dst
  FROM jsonb_array_elements(p_contenants) AS elem;

  -- Date de l'opération pour date_mouvement dans le journal
  IF p_operation_id IS NOT NULL THEN
    SELECT date_operation INTO v_date_mv
    FROM   public.operations
    WHERE  id = p_operation_id AND tenant_id = p_tenant_id;
  END IF;
  v_date_mv := COALESCE(v_date_mv, current_date);

  -- ── 0. Idempotence : purger les mouvements de cette opération ──
  -- Le DELETE sur lot_mouvements est déclenché par le trigger
  -- _wb3_lm_delete_check. On pose le bypass avant.
  IF p_operation_id IS NOT NULL THEN
    PERFORM set_config('app.wb3_lock_bypass', 'true', true); -- local = reset on COMMIT/ROLLBACK
    DELETE FROM public.lot_mouvements
    WHERE  operation_id = p_operation_id
      AND  tenant_id    = p_tenant_id;
  END IF;

  -- ── A. Mouvement physique ─────────────────────────────────────
  -- relogement / soutirage / transfert / ecoulage / filtration
  IF p_type IN ('relogement', 'soutirage', 'transfert', 'ecoulage', 'filtration')
     AND v_has_src AND v_has_dst
  THEN

    -- Nombre de contenants destination (pour le guard multi-dst + ventilation)
    SELECT COUNT(*) INTO v_dst_count
    FROM   jsonb_array_elements(p_contenants) AS elem
    WHERE  elem->>'role' = 'destination';

    FOR v_lot_id IN
      SELECT DISTINCT (elem->>'lot_id')::uuid
      FROM   jsonb_array_elements(p_lots) AS elem
      WHERE  (elem->>'lot_id') IS NOT NULL
        AND  COALESCE(elem->>'role', 'traite') <> 'destination'
    LOOP

      -- Volume déclaré dans p_lots pour ce lot (ventilation UI)
      SELECT NULLIF(elem->>'volume_hl', '')::numeric INTO v_lot_vol
      FROM   jsonb_array_elements(p_lots) AS elem
      WHERE  (elem->>'lot_id')::uuid = v_lot_id
        AND  COALESCE(elem->>'role', 'traite') <> 'destination'
      LIMIT 1;

      -- Guard : un même lot ne peut pas être dans plusieurs contenants sources.
      -- Le volume_hl de p_lots est unique pour le lot ; impossible de savoir
      -- quelle fraction retirer de chaque cuve source.
      SELECT COUNT(DISTINCT lc.contenant_id) INTO v_src_lot_count
      FROM   public.lot_contenants lc
      WHERE  lc.lot_id      = v_lot_id
        AND  lc.tenant_id   = p_tenant_id
        AND  lc.contenant_id IN (
               SELECT (elem->>'contenant_id')::uuid
               FROM   jsonb_array_elements(p_contenants) AS elem
               WHERE  elem->>'role' = 'source'
             );

      IF v_src_lot_count > 1 THEN
        RAISE EXCEPTION
          'Source ambiguë — lot (id=%) présent dans % contenants sources. '
          'La ventilation par couple (lot_id, contenant_id) n''est pas '
          'supportée. Scindez l''opération ou n''incluez qu''un contenant source.',
          v_lot_id, v_src_lot_count;
      END IF;

      -- Guard : multi-destinations avec ventilation par lot
      -- v_lot_vol est un volume global pour le lot, pas distribué par dst.
      IF v_lot_vol IS NOT NULL AND v_dst_count > 1 THEN
        RAISE EXCEPTION
          'Ambiguïté destination — lot (id=%) : ventilation par lot (volume_hl=%) '
          'incompatible avec % contenants destination. '
          'Un seul contenant destination autorisé quand volume_hl est fourni par lot.',
          v_lot_id, v_lot_vol, v_dst_count;
      END IF;

      -- ── Sources ──────────────────────────────────────────────
      FOR v_src_cont, v_op_vol IN
        SELECT (elem->>'contenant_id')::uuid,
               NULLIF(elem->>'volume_hl', '')::numeric
        FROM   jsonb_array_elements(p_contenants) AS elem
        WHERE  elem->>'role' = 'source'
      LOOP
        SELECT volume_hl INTO v_lc_vol
        FROM   public.lot_contenants
        WHERE  lot_id       = v_lot_id
          AND  contenant_id = v_src_cont
          AND  tenant_id    = p_tenant_id;

        IF FOUND THEN

          -- Déterminer le volume effectif pour ce lot
          IF v_lot_vol IS NOT NULL THEN
            v_effective_vol := v_lot_vol;
          ELSE
            -- Pas de ventilation : toléré seulement si source mono-lot
            SELECT COUNT(*) INTO v_src_lot_count
            FROM   public.lot_contenants
            WHERE  contenant_id = v_src_cont
              AND  tenant_id    = p_tenant_id;

            IF v_src_lot_count > 1 THEN
              RAISE EXCEPTION
                'Ventilation par lot requise — contenant (id=%) contient % lots. '
                'Fournissez volume_hl par lot dans p_lots.',
                v_src_cont, v_src_lot_count;
            END IF;
            v_effective_vol := v_op_vol;
          END IF;

          -- Résoudre v_lc_vol si NULL (lot sans volume_hl dans lot_contenants)
          IF v_lc_vol IS NULL AND v_effective_vol IS NOT NULL THEN
            SELECT volume_actuel_hl INTO v_lc_vol
            FROM   public.lots
            WHERE  id = v_lot_id AND tenant_id = p_tenant_id;
          END IF;

          -- Guard : volume insuffisant
          IF v_effective_vol IS NOT NULL
             AND v_effective_vol > COALESCE(v_lc_vol, 0)
          THEN
            RAISE EXCEPTION
              'Volume insuffisant — lot (id=%), contenant source (id=%) : '
              'demandé % hL, disponible % hL.',
              v_lot_id, v_src_cont,
              v_effective_vol, COALESCE(v_lc_vol, 0);
          END IF;

          -- Appliquer sur lot_contenants
          IF v_effective_vol IS NULL THEN
            DELETE FROM public.lot_contenants
            WHERE  lot_id = v_lot_id AND contenant_id = v_src_cont AND tenant_id = p_tenant_id;
          ELSE
            v_new_vol := COALESCE(v_lc_vol, 0) - v_effective_vol;
            IF v_new_vol = 0 THEN
              DELETE FROM public.lot_contenants
              WHERE  lot_id = v_lot_id AND contenant_id = v_src_cont AND tenant_id = p_tenant_id;
            ELSE
              UPDATE public.lot_contenants SET volume_hl = v_new_vol
              WHERE  lot_id = v_lot_id AND contenant_id = v_src_cont AND tenant_id = p_tenant_id;
            END IF;
          END IF;

          -- Journal
          IF p_operation_id IS NOT NULL THEN
            INSERT INTO public.lot_mouvements
              (tenant_id, operation_id, type_operation, lot_id,
               contenant_source_id, contenant_dest_id, volume_hl,
               date_mouvement, sens)
            SELECT
              p_tenant_id, p_operation_id, p_type, v_lot_id,
              v_src_cont,
              (dst.elem->>'contenant_id')::uuid,
              COALESCE(v_effective_vol, v_lc_vol),
              v_date_mv, 'transfert'
            FROM   jsonb_array_elements(p_contenants) dst(elem)
            WHERE  dst.elem->>'role' = 'destination';
          END IF;

        END IF;
      END LOOP; -- sources

      -- ── Destinations ─────────────────────────────────────────
      FOR v_dst_cont, v_op_vol IN
        SELECT (elem->>'contenant_id')::uuid,
               NULLIF(elem->>'volume_hl', '')::numeric
        FROM   jsonb_array_elements(p_contenants) AS elem
        WHERE  elem->>'role' = 'destination'
      LOOP
        v_effective_vol := COALESCE(v_lot_vol, v_op_vol);

        SELECT volume_hl INTO v_lc_vol
        FROM   public.lot_contenants
        WHERE  lot_id = v_lot_id AND contenant_id = v_dst_cont AND tenant_id = p_tenant_id;

        IF FOUND THEN
          UPDATE public.lot_contenants
          SET    volume_hl = COALESCE(v_lc_vol, 0) + COALESCE(v_effective_vol, 0)
          WHERE  lot_id = v_lot_id AND contenant_id = v_dst_cont AND tenant_id = p_tenant_id;
        ELSE
          INSERT INTO public.lot_contenants (lot_id, contenant_id, volume_hl, tenant_id, date_affectation)
          VALUES (v_lot_id, v_dst_cont, v_effective_vol, p_tenant_id, current_date);
        END IF;
        -- Journal côté destination déjà inséré dans la boucle source (src×dst cross-join)
      END LOOP; -- destinations

    END LOOP; -- lots
  END IF;

  -- ── B. Assemblage ─────────────────────────────────────────────
  -- Même protection multi-lots et volume insuffisant côté sources.
  -- Destinations : multiple contenants supportés (v_op_vol par cuve).
  IF p_type = 'assemblage' AND v_has_src AND v_has_dst THEN

    -- Sources
    FOR v_lot_id IN
      SELECT DISTINCT (elem->>'lot_id')::uuid
      FROM   jsonb_array_elements(p_lots) AS elem
      WHERE  (elem->>'lot_id') IS NOT NULL AND elem->>'role' = 'source'
    LOOP
      SELECT NULLIF(elem->>'volume_hl', '')::numeric INTO v_lot_vol
      FROM   jsonb_array_elements(p_lots) AS elem
      WHERE  (elem->>'lot_id')::uuid = v_lot_id AND elem->>'role' = 'source'
      LIMIT 1;

      -- Guard : lot dans plusieurs contenants sources (assemblage)
      SELECT COUNT(DISTINCT lc.contenant_id) INTO v_src_lot_count
      FROM   public.lot_contenants lc
      WHERE  lc.lot_id      = v_lot_id
        AND  lc.tenant_id   = p_tenant_id
        AND  lc.contenant_id IN (
               SELECT (elem->>'contenant_id')::uuid
               FROM   jsonb_array_elements(p_contenants) AS elem
               WHERE  elem->>'role' = 'source'
             );

      IF v_src_lot_count > 1 THEN
        RAISE EXCEPTION
          'Assemblage — source ambiguë : lot (id=%) présent dans % contenants sources. '
          'Un lot source ne peut appartenir qu''à un seul contenant source par opération.',
          v_lot_id, v_src_lot_count;
      END IF;

      FOR v_src_cont, v_op_vol IN
        SELECT (elem->>'contenant_id')::uuid,
               NULLIF(elem->>'volume_hl', '')::numeric
        FROM   jsonb_array_elements(p_contenants) AS elem
        WHERE  elem->>'role' = 'source'
      LOOP
        SELECT volume_hl INTO v_lc_vol
        FROM   public.lot_contenants
        WHERE  lot_id = v_lot_id AND contenant_id = v_src_cont AND tenant_id = p_tenant_id;

        IF FOUND THEN
          IF v_lot_vol IS NOT NULL THEN
            v_effective_vol := v_lot_vol;
          ELSE
            SELECT COUNT(*) INTO v_src_lot_count
            FROM   public.lot_contenants
            WHERE  contenant_id = v_src_cont AND tenant_id = p_tenant_id;

            IF v_src_lot_count > 1 THEN
              RAISE EXCEPTION
                'Assemblage — ventilation par lot requise : contenant (id=%) contient % lots.',
                v_src_cont, v_src_lot_count;
            END IF;
            v_effective_vol := v_op_vol;
          END IF;

          IF v_lc_vol IS NULL AND v_effective_vol IS NOT NULL THEN
            SELECT volume_actuel_hl INTO v_lc_vol
            FROM   public.lots WHERE id = v_lot_id AND tenant_id = p_tenant_id;
          END IF;

          -- Guard : volume insuffisant
          IF v_effective_vol IS NOT NULL
             AND v_effective_vol > COALESCE(v_lc_vol, 0)
          THEN
            RAISE EXCEPTION
              'Assemblage — volume insuffisant : lot (id=%), contenant (id=%) : '
              'demandé % hL, disponible % hL.',
              v_lot_id, v_src_cont,
              v_effective_vol, COALESCE(v_lc_vol, 0);
          END IF;

          IF v_effective_vol IS NULL THEN
            DELETE FROM public.lot_contenants
            WHERE  lot_id = v_lot_id AND contenant_id = v_src_cont AND tenant_id = p_tenant_id;
          ELSE
            v_new_vol := COALESCE(v_lc_vol, 0) - v_effective_vol;
            IF v_new_vol = 0 THEN
              DELETE FROM public.lot_contenants
              WHERE  lot_id = v_lot_id AND contenant_id = v_src_cont AND tenant_id = p_tenant_id;
            ELSE
              UPDATE public.lot_contenants SET volume_hl = v_new_vol
              WHERE  lot_id = v_lot_id AND contenant_id = v_src_cont AND tenant_id = p_tenant_id;
            END IF;
          END IF;

          IF p_operation_id IS NOT NULL THEN
            INSERT INTO public.lot_mouvements
              (tenant_id, operation_id, type_operation, lot_id,
               contenant_source_id, contenant_dest_id, volume_hl,
               date_mouvement, sens)
            VALUES
              (p_tenant_id, p_operation_id, p_type, v_lot_id,
               v_src_cont, NULL, COALESCE(v_effective_vol, v_lc_vol),
               v_date_mv, 'sortie');
          END IF;

        END IF;
      END LOOP;
    END LOOP; -- lots source

    -- Destinations
    FOR v_lot_id IN
      SELECT DISTINCT (elem->>'lot_id')::uuid
      FROM   jsonb_array_elements(p_lots) AS elem
      WHERE  (elem->>'lot_id') IS NOT NULL AND elem->>'role' = 'destination'
    LOOP
      FOR v_dst_cont, v_op_vol IN
        SELECT (elem->>'contenant_id')::uuid,
               NULLIF(elem->>'volume_hl', '')::numeric
        FROM   jsonb_array_elements(p_contenants) AS elem
        WHERE  elem->>'role' = 'destination'
      LOOP
        SELECT volume_hl INTO v_lc_vol
        FROM   public.lot_contenants
        WHERE  lot_id = v_lot_id AND contenant_id = v_dst_cont AND tenant_id = p_tenant_id;

        IF FOUND THEN
          UPDATE public.lot_contenants
          SET    volume_hl = COALESCE(v_lc_vol, 0) + COALESCE(v_op_vol, 0)
          WHERE  lot_id = v_lot_id AND contenant_id = v_dst_cont AND tenant_id = p_tenant_id;
        ELSE
          INSERT INTO public.lot_contenants (lot_id, contenant_id, volume_hl, tenant_id, date_affectation)
          VALUES (v_lot_id, v_dst_cont, v_op_vol, p_tenant_id, current_date);
        END IF;

        IF p_operation_id IS NOT NULL THEN
          INSERT INTO public.lot_mouvements
            (tenant_id, operation_id, type_operation, lot_id,
             contenant_source_id, contenant_dest_id, volume_hl,
             date_mouvement, sens)
          VALUES
            (p_tenant_id, p_operation_id, p_type, v_lot_id,
             NULL, v_dst_cont, v_op_vol,
             v_date_mv, 'entree');
        END IF;

      END LOOP;
    END LOOP; -- lots destination

    -- Filiation assemblage : identique migrations 034/035/036
    IF p_operation_id IS NOT NULL THEN
      DELETE FROM public.lot_filiation
      WHERE  operation_id = p_operation_id
        AND  source_type  = 'assemblage'
        AND  tenant_id    = p_tenant_id;
    END IF;

    FOR v_dest_lot_id IN
      SELECT DISTINCT (elem->>'lot_id')::uuid
      FROM   jsonb_array_elements(p_lots) AS elem
      WHERE  (elem->>'lot_id') IS NOT NULL AND elem->>'role' = 'destination'
    LOOP
      FOR v_lot_id, v_op_vol IN
        SELECT (elem->>'lot_id')::uuid,
               NULLIF(elem->>'volume_hl', '')::numeric
        FROM   jsonb_array_elements(p_lots) AS elem
        WHERE  (elem->>'lot_id') IS NOT NULL AND elem->>'role' = 'source'
      LOOP
        IF p_operation_id IS NOT NULL THEN
          INSERT INTO public.lot_filiation
            (tenant_id, lot_id, parent_id, volume_hl, operation_id, source_type)
          VALUES
            (p_tenant_id, v_dest_lot_id, v_lot_id, v_op_vol, p_operation_id, 'assemblage');
        ELSE
          INSERT INTO public.lot_filiation
            (tenant_id, lot_id, parent_id, volume_hl, source_type)
          VALUES
            (p_tenant_id, v_dest_lot_id, v_lot_id, v_op_vol, 'assemblage')
          ON CONFLICT (lot_id, parent_id, source_type) DO UPDATE
            SET volume_hl = EXCLUDED.volume_hl;
        END IF;
      END LOOP;
    END LOOP;

  END IF;

  -- ── C. Mise en bouteille ──────────────────────────────────────
  -- Inchangé depuis v6.
  IF p_type = 'mise_en_bouteille' AND v_has_src THEN
    FOR v_lot_id IN
      SELECT DISTINCT (elem->>'lot_id')::uuid
      FROM   jsonb_array_elements(p_lots) AS elem
      WHERE  (elem->>'lot_id') IS NOT NULL
        AND  COALESCE(elem->>'role', 'traite') <> 'destination'
    LOOP
      FOR v_src_cont IN
        SELECT (elem->>'contenant_id')::uuid
        FROM   jsonb_array_elements(p_contenants) AS elem
        WHERE  elem->>'role' = 'source'
      LOOP
        SELECT volume_hl INTO v_lc_vol
        FROM   public.lot_contenants
        WHERE  lot_id = v_lot_id AND contenant_id = v_src_cont AND tenant_id = p_tenant_id;

        IF FOUND THEN
          DELETE FROM public.lot_contenants
          WHERE  lot_id = v_lot_id AND contenant_id = v_src_cont AND tenant_id = p_tenant_id;

          IF p_operation_id IS NOT NULL THEN
            INSERT INTO public.lot_mouvements
              (tenant_id, operation_id, type_operation, lot_id,
               contenant_source_id, contenant_dest_id, volume_hl,
               date_mouvement, sens)
            VALUES
              (p_tenant_id, p_operation_id, p_type, v_lot_id,
               v_src_cont, NULL, v_lc_vol,
               v_date_mv, 'sortie_definitive');
          END IF;
        END IF;
      END LOOP;
    END LOOP;
  END IF;

  -- ── D. Sortie / sortie_lot ─────────────────────────────────────
  -- Inchangé depuis v6.
  IF p_type IN ('sortie', 'sortie_lot') THEN
    FOR v_lot_id IN
      SELECT DISTINCT (elem->>'lot_id')::uuid
      FROM   jsonb_array_elements(p_lots) AS elem
      WHERE  (elem->>'lot_id') IS NOT NULL
    LOOP
      IF p_operation_id IS NOT NULL THEN
        INSERT INTO public.lot_mouvements
          (tenant_id, operation_id, type_operation, lot_id,
           contenant_source_id, contenant_dest_id, volume_hl,
           date_mouvement, sens)
        SELECT
          p_tenant_id, p_operation_id, p_type, v_lot_id,
          contenant_id, NULL, volume_hl,
          v_date_mv, 'sortie_definitive'
        FROM   public.lot_contenants
        WHERE  lot_id    = v_lot_id
          AND  tenant_id = p_tenant_id;
      END IF;

      DELETE FROM public.lot_contenants
      WHERE  lot_id = v_lot_id AND tenant_id = p_tenant_id;

      UPDATE public.lots
      SET    archived    = true,
             date_sortie = COALESCE(date_sortie, current_date)
      WHERE  id = v_lot_id AND tenant_id = p_tenant_id;

    END LOOP;
  END IF;

END;
$$;


--
-- Name: FUNCTION _wb3_apply_op_effects(p_tenant_id uuid, p_type text, p_lots jsonb, p_contenants jsonb, p_operation_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public._wb3_apply_op_effects(p_tenant_id uuid, p_type text, p_lots jsonb, p_contenants jsonb, p_operation_id uuid) IS 'INTERNE — Ne pas appeler directement. Appelé uniquement par public.wb3_save_operation_graph (SECURITY DEFINER). Pas de vérification d''idempotence ni de verrou statut — ces contrôles appartiennent à wb3_save_operation_graph.';


--
-- Name: _wb3_audit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._wb3_audit() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_old     jsonb;
  v_new     jsonb;
  v_changed text[];
  v_tenant  uuid;
  v_rec     uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
  ELSIF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
  ELSE  -- UPDATE
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    -- Champs réellement modifiés (on ignore le bruit updated_at)
    SELECT array_agg(k.key ORDER BY k.key)
    INTO   v_changed
    FROM   jsonb_object_keys(v_new) AS k(key)
    WHERE  (v_new -> k.key) IS DISTINCT FROM (v_old -> k.key)
      AND  k.key <> 'updated_at';

    -- UPDATE sans changement réel → ne pas journaliser
    IF v_changed IS NULL OR array_length(v_changed, 1) IS NULL THEN
      RETURN NULL;
    END IF;
  END IF;

  v_tenant := NULLIF(COALESCE(v_new ->> 'tenant_id', v_old ->> 'tenant_id'), '')::uuid;
  v_rec    := NULLIF(COALESCE(v_new ->> 'id',        v_old ->> 'id'),        '')::uuid;

  INSERT INTO public.audit_log
    (tenant_id, table_name, record_id, action, old_data, new_data, changed_fields, actor)
  VALUES
    (v_tenant, TG_TABLE_NAME, v_rec, TG_OP, v_old, v_new, v_changed, auth.uid());

  RETURN NULL;  -- AFTER trigger : valeur de retour ignorée
END;
$$;


--
-- Name: FUNCTION _wb3_audit(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public._wb3_audit() IS 'Trigger AFTER INSERT/UPDATE/DELETE générique. Écrit une ligne dans audit_log (jsonb old/new + champs modifiés). SECURITY DEFINER pour pouvoir écrire malgré la RLS restrictive sur audit_log.';


--
-- Name: _wb3_lm_delete_check(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._wb3_lm_delete_check() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF current_setting('app.wb3_lock_bypass', true) = 'true' THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION
    'lot_mouvements est un journal immuable (ligne id=%, operation_id=%). '
    'Les suppressions directes sont interdites. '
    'Seul _wb3_apply_op_effects peut purger des lignes (idempotence interne).',
    OLD.id, OLD.operation_id;
END;
$$;


--
-- Name: FUNCTION _wb3_lm_delete_check(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public._wb3_lm_delete_check() IS 'Trigger BEFORE DELETE sur lot_mouvements. Bloque toute suppression directe en dehors du mécanisme d''idempotence de _wb3_apply_op_effects.';


--
-- Name: _wb3_op_graph_lock_check(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._wb3_op_graph_lock_check() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_op_id  uuid;
  v_statut text;
BEGIN
  IF current_setting('app.wb3_lock_bypass', true) = 'true' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  v_op_id := CASE TG_OP WHEN 'DELETE' THEN OLD.operation_id ELSE NEW.operation_id END;

  SELECT statut INTO v_statut
  FROM   public.operations
  WHERE  id = v_op_id;

  IF v_statut = 'realise' THEN
    RAISE EXCEPTION
      'Opération réalisée verrouillée (id=%) : '
      'les liens physiques (%, table %) ne peuvent pas être modifiés directement. '
      'Utilisez uniquement wb3_save_operation_graph.',
      v_op_id, TG_OP, TG_TABLE_NAME;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;


--
-- Name: FUNCTION _wb3_op_graph_lock_check(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public._wb3_op_graph_lock_check() IS 'Trigger BEFORE INSERT/UPDATE/DELETE sur operation_lots, operation_contenants, operation_produits. Bloque toute écriture directe sur une opération réalisée.';


--
-- Name: _wb3_op_lock_check(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._wb3_op_lock_check() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF current_setting('app.wb3_lock_bypass', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF OLD.statut = 'realise' THEN

    IF NEW.statut IS DISTINCT FROM 'realise' THEN
      RAISE EXCEPTION
        'Opération réalisée verrouillée (id=%) : '
        'impossible de changer le statut (valeur demandée : %).',
        OLD.id, NEW.statut;
    END IF;

    IF NEW.type_operation  IS DISTINCT FROM OLD.type_operation
    OR NEW.date_operation   IS DISTINCT FROM OLD.date_operation
    OR NEW.heure_operation  IS DISTINCT FROM OLD.heure_operation
    OR NEW.volume_hl        IS DISTINCT FROM OLD.volume_hl
    OR NEW.quantite         IS DISTINCT FROM OLD.quantite
    OR NEW.unite            IS DISTINCT FROM OLD.unite
    OR NEW.meta             IS DISTINCT FROM OLD.meta
    THEN
      RAISE EXCEPTION
        'Opération réalisée verrouillée (id=%) : '
        'seuls notes, référence et opérateur sont modifiables directement. '
        'Les modifications techniques (meta, volumes, date) nécessitent '
        'le mécanisme interne via wb3_save_operation_graph.',
        OLD.id;
    END IF;

  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION _wb3_op_lock_check(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public._wb3_op_lock_check() IS 'Trigger BEFORE UPDATE sur operations. Bloque les modifications physiques ET les modifications de meta sur une opération réalisée. Contournable uniquement via app.wb3_lock_bypass (local à la transaction).';


--
-- Name: historique_lot(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.historique_lot(p_lot_id uuid) RETURNS TABLE(operation_id uuid, type_operation text, date_operation date, role text, volume_hl numeric, statut text, notes text)
    LANGUAGE sql SECURITY DEFINER
    AS $$
  select
    o.id, o.type_operation, o.date_operation,
    ol.role, ol.volume_hl, o.statut, o.notes
  from public.operation_lots ol
  join public.operations o on o.id = ol.operation_id
  where ol.lot_id = p_lot_id
  order by o.date_operation desc, o.created_at desc;
$$;


--
-- Name: is_privileged_in(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_privileged_in(tenant uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
  select exists (
    select 1 from public.memberships
    where user_id = auth.uid()
      and tenant_id = tenant
      and role in ('admin','oenologue')
  );
$$;


--
-- Name: next_apport_numero(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.next_apport_numero(p_tenant_id uuid, p_year integer DEFAULT (date_part('year'::text, CURRENT_DATE))::integer) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
declare
  v_seq int;
  v_prefix text;
begin
  v_prefix := p_year::text || '-';
  select coalesce(max(
    case when numero ~ ('^' || v_prefix || '\d+$')
    then (split_part(numero, '-', 2))::int
    else 0 end
  ), 0) + 1
  into v_seq
  from public.apports
  where tenant_id = p_tenant_id
    and numero like v_prefix || '%';

  return v_prefix || lpad(v_seq::text, 3, '0');
end $_$;


--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin new.updated_at = now(); return new; end; $$;


--
-- Name: sync_lot_volume_actuel(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_lot_volume_actuel() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_lot_id uuid;
BEGIN
  -- Récupérer le lot concerné selon le type d'opération DML
  v_lot_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.lot_id ELSE NEW.lot_id END;

  -- Recalculer le volume total à partir des lignes restantes
  UPDATE public.lots
  SET    volume_actuel_hl = (
    SELECT COALESCE(SUM(lc.volume_hl), 0)
    FROM   public.lot_contenants lc
    WHERE  lc.lot_id = v_lot_id
  )
  WHERE  id = v_lot_id;

  -- AFTER trigger sur table : valeur de retour ignorée pour les statements
  RETURN NULL;
END;
$$;


--
-- Name: user_tenants(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_tenants() RETURNS SETOF uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
  select tenant_id from public.memberships where user_id = auth.uid();
$$;


--
-- Name: wb3_apply_ajustement(uuid, uuid, text, uuid, uuid, numeric, numeric, text, text, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wb3_apply_ajustement(p_tenant_id uuid, p_operation_id uuid DEFAULT NULL::uuid, p_type text DEFAULT 'ajustement_volume'::text, p_lot_id uuid DEFAULT NULL::uuid, p_contenant_id uuid DEFAULT NULL::uuid, p_delta_hl numeric DEFAULT NULL::numeric, p_volume_cible numeric DEFAULT NULL::numeric, p_motif text DEFAULT NULL::text, p_operateur text DEFAULT NULL::text, p_date date DEFAULT CURRENT_DATE) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_volume_avant NUMERIC(10,3);
  v_volume_apres NUMERIC(10,3);
  v_delta        NUMERIC(10,3);
  v_delta_pct    NUMERIC(8,4);
  v_ref_vol      NUMERIC(10,3);
  v_ajust_id     UUID;
  v_sens         TEXT;
  v_needs_volume BOOLEAN;
BEGIN
  -- Validation basique
  IF p_lot_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'lot_manquant',
      'message', 'Un lot est obligatoire pour cet ajustement.');
  END IF;

  -- correction_administrative ne modifie pas les volumes
  v_needs_volume := p_type != 'correction_administrative';

  -- ── Récupérer le volume actuel ──────────────────────────────────
  IF v_needs_volume THEN
    -- Source primaire : volume dans le contenant spécifique
    IF p_contenant_id IS NOT NULL THEN
      SELECT volume_hl INTO v_volume_avant
      FROM lot_contenants
      WHERE lot_id = p_lot_id
        AND contenant_id = p_contenant_id
        AND tenant_id = p_tenant_id;
    END IF;

    -- Fallback : volume actuel total du lot
    IF v_volume_avant IS NULL THEN
      SELECT volume_actuel_hl INTO v_volume_avant
      FROM lots
      WHERE id = p_lot_id AND tenant_id = p_tenant_id;
    END IF;

    v_volume_avant := COALESCE(v_volume_avant, 0);

    -- ── Calculer le volume final ────────────────────────────────────
    IF p_volume_cible IS NOT NULL THEN
      -- Mode correction_jauge : cible absolue
      v_volume_apres := p_volume_cible;
      v_delta        := p_volume_cible - v_volume_avant;
    ELSIF p_delta_hl IS NOT NULL THEN
      v_delta        := p_delta_hl;
      v_volume_apres := v_volume_avant + v_delta;
    ELSE
      RETURN jsonb_build_object('ok', false, 'error', 'delta_manquant',
        'message', 'delta_hl ou volume_cible doit être fourni.');
    END IF;

    -- ── Garde : volume final non négatif ───────────────────────────
    IF v_volume_apres < 0 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'volume_negatif',
        'message', format('Le volume résultant serait négatif (%s hL).', round(v_volume_apres, 3)));
    END IF;

    -- ── % d'écart ──────────────────────────────────────────────────
    v_ref_vol   := GREATEST(ABS(v_volume_avant), 0.001);
    v_delta_pct := ROUND((v_delta / v_ref_vol * 100)::NUMERIC, 4);

    -- ── Mettre à jour lot_contenants ───────────────────────────────
    IF p_contenant_id IS NOT NULL THEN
      UPDATE lot_contenants
      SET volume_hl = v_volume_apres
      WHERE lot_id = p_lot_id
        AND contenant_id = p_contenant_id
        AND tenant_id = p_tenant_id;

      -- Insérer si la ligne n'existait pas encore
      IF NOT FOUND THEN
        INSERT INTO lot_contenants(lot_id, contenant_id, tenant_id, volume_hl)
        VALUES(p_lot_id, p_contenant_id, p_tenant_id, v_volume_apres);
      END IF;
    END IF;

    -- ── Mettre à jour le volume total du lot ───────────────────────
    UPDATE lots
    SET volume_actuel_hl = GREATEST(0, volume_actuel_hl + v_delta)
    WHERE id = p_lot_id AND tenant_id = p_tenant_id;

    -- ── Sens pour lot_mouvements ────────────────────────────────────
    v_sens := CASE
      WHEN v_delta > 0 THEN 'entree'
      WHEN v_delta < 0 THEN 'sortie'
      ELSE NULL
    END;

    -- ── Insérer dans lot_mouvements si delta réel ───────────────────
    IF v_delta != 0 AND v_sens IS NOT NULL THEN
      INSERT INTO lot_mouvements(
        tenant_id, operation_id, type_operation, lot_id,
        contenant_source_id, contenant_dest_id,
        volume_hl, date_mouvement, sens
      ) VALUES (
        p_tenant_id, p_operation_id, p_type, p_lot_id,
        CASE WHEN v_delta < 0 THEN p_contenant_id ELSE NULL END,
        CASE WHEN v_delta > 0 THEN p_contenant_id ELSE NULL END,
        ABS(v_delta), p_date, v_sens
      );
    END IF;
  ELSE
    -- correction_administrative : volumes inchangés
    v_volume_avant := NULL;
    v_volume_apres := NULL;
    v_delta        := 0;
    v_delta_pct    := 0;
  END IF;

  -- ── Insérer dans ajustements_volume ──────────────────────────────
  INSERT INTO ajustements_volume(
    tenant_id, operation_id, type_operation, lot_id, contenant_id,
    volume_avant_hl, volume_apres_hl, delta_pct, motif, operateur, date_operation
  ) VALUES (
    p_tenant_id, p_operation_id, p_type, p_lot_id, p_contenant_id,
    COALESCE(v_volume_avant, 0),
    COALESCE(v_volume_apres, 0),
    v_delta_pct,
    p_motif, p_operateur, p_date
  ) RETURNING id INTO v_ajust_id;

  -- ── Marquer l'opération réalisée ───────────────────────────────
  IF p_operation_id IS NOT NULL THEN
    UPDATE operations
    SET statut = 'realise',
        meta   = COALESCE(meta, '{}'::jsonb) || jsonb_build_object('effects_applied_at', now()::text)
    WHERE id = p_operation_id
      AND tenant_id = p_tenant_id
      AND statut != 'realise';
  END IF;

  RETURN jsonb_build_object(
    'ok',              true,
    'ajustement_id',   v_ajust_id,
    'volume_avant_hl', v_volume_avant,
    'volume_apres_hl', v_volume_apres,
    'delta_hl',        v_delta,
    'delta_pct',       v_delta_pct
  );
END;
$$;


--
-- Name: wb3_audit_create_partition(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wb3_audit_create_partition(p_year integer, p_month integer) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_start date := make_date(p_year, p_month, 1);
  v_end   date := (make_date(p_year, p_month, 1) + INTERVAL '1 month')::date;
  v_name  text := format('audit_log_%s_%s', p_year, lpad(p_month::text, 2, '0'));
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = v_name
  ) THEN
    EXECUTE format(
      'CREATE TABLE public.%I PARTITION OF public.audit_log FOR VALUES FROM (%L) TO (%L)',
      v_name, v_start, v_end
    );
  END IF;
  RETURN v_name;
END;
$$;


--
-- Name: FUNCTION wb3_audit_create_partition(p_year integer, p_month integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.wb3_audit_create_partition(p_year integer, p_month integer) IS 'Crée (si absente) la partition mensuelle audit_log_AAAA_MM. À appeler périodiquement pour préparer les mois à venir.';


--
-- Name: wb3_export_tenant(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wb3_export_tenant(p_tenant_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- ── Contrôle d'accès : l'appelant doit être membre du tenant ──
  IF NOT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE tenant_id = p_tenant_id
      AND user_id   = auth.uid()
  ) THEN
    RAISE EXCEPTION
      'Accès refusé : vous n''êtes pas membre du tenant % (export interdit).',
      p_tenant_id;
  END IF;

  -- ── Construction de l'export ──────────────────────────────────
  -- COALESCE(jsonb_agg(...), '[]') : table vide → tableau vide (pas NULL).
  SELECT jsonb_build_object(

    'meta', jsonb_build_object(
      'tenant_id',   p_tenant_id,
      'exported_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'schema_version', '044',
      'note', 'Export complet WB3 — inclut les lignes archivées'
    ),

    'tenant', (
      SELECT to_jsonb(t.*) FROM public.tenants t WHERE t.id = p_tenant_id
    ),

    'cepages', (
      SELECT COALESCE(jsonb_agg(to_jsonb(c.*)), '[]'::jsonb)
      FROM public.cepages c WHERE c.tenant_id = p_tenant_id
    ),

    'travees', (
      SELECT COALESCE(jsonb_agg(to_jsonb(tr.*)), '[]'::jsonb)
      FROM public.travees tr WHERE tr.tenant_id = p_tenant_id
    ),

    'contenants', (
      SELECT COALESCE(jsonb_agg(to_jsonb(co.*)), '[]'::jsonb)
      FROM public.contenants co WHERE co.tenant_id = p_tenant_id
    ),

    'lots', (
      SELECT COALESCE(jsonb_agg(to_jsonb(l.*)), '[]'::jsonb)
      FROM public.lots l WHERE l.tenant_id = p_tenant_id
    ),

    'lot_cepages', (
      -- Pas de tenant_id propre : filtré via lot_id
      SELECT COALESCE(jsonb_agg(to_jsonb(lc.*)), '[]'::jsonb)
      FROM public.lot_cepages lc
      WHERE lc.lot_id IN (SELECT id FROM public.lots WHERE tenant_id = p_tenant_id)
    ),

    'lot_contenants', (
      SELECT COALESCE(jsonb_agg(to_jsonb(lk.*)), '[]'::jsonb)
      FROM public.lot_contenants lk WHERE lk.tenant_id = p_tenant_id
    ),

    'apports', (
      SELECT COALESCE(jsonb_agg(to_jsonb(a.*)), '[]'::jsonb)
      FROM public.apports a WHERE a.tenant_id = p_tenant_id
    ),

    'operations', (
      SELECT COALESCE(jsonb_agg(to_jsonb(o.*)), '[]'::jsonb)
      FROM public.operations o WHERE o.tenant_id = p_tenant_id
    ),

    'operation_lots', (
      SELECT COALESCE(jsonb_agg(to_jsonb(ol.*)), '[]'::jsonb)
      FROM public.operation_lots ol WHERE ol.tenant_id = p_tenant_id
    ),

    'operation_contenants', (
      SELECT COALESCE(jsonb_agg(to_jsonb(oc.*)), '[]'::jsonb)
      FROM public.operation_contenants oc WHERE oc.tenant_id = p_tenant_id
    ),

    'operation_produits', (
      SELECT COALESCE(jsonb_agg(to_jsonb(op.*)), '[]'::jsonb)
      FROM public.operation_produits op WHERE op.tenant_id = p_tenant_id
    ),

    'produits_catalogue', (
      SELECT COALESCE(jsonb_agg(to_jsonb(pc.*)), '[]'::jsonb)
      FROM public.produits_catalogue pc WHERE pc.tenant_id = p_tenant_id
    ),

    'produits_lots', (
      SELECT COALESCE(jsonb_agg(to_jsonb(pl.*)), '[]'::jsonb)
      FROM public.produits_lots pl WHERE pl.tenant_id = p_tenant_id
    ),

    'analyses', (
      SELECT COALESCE(jsonb_agg(to_jsonb(an.*)), '[]'::jsonb)
      FROM public.analyses an WHERE an.tenant_id = p_tenant_id
    ),

    'lot_filiation', (
      SELECT COALESCE(jsonb_agg(to_jsonb(lf.*)), '[]'::jsonb)
      FROM public.lot_filiation lf WHERE lf.tenant_id = p_tenant_id
    ),

    'lot_mouvements', (
      SELECT COALESCE(jsonb_agg(to_jsonb(lm.*)), '[]'::jsonb)
      FROM public.lot_mouvements lm WHERE lm.tenant_id = p_tenant_id
    ),

    'ajustements_volume', (
      SELECT COALESCE(jsonb_agg(to_jsonb(av.*)), '[]'::jsonb)
      FROM public.ajustements_volume av WHERE av.tenant_id = p_tenant_id
    ),

    'user_preferences', (
      SELECT COALESCE(jsonb_agg(to_jsonb(up.*)), '[]'::jsonb)
      FROM public.user_preferences up WHERE up.tenant_id = p_tenant_id
    )

  ) INTO v_result;

  RETURN v_result;
END;
$$;


--
-- Name: FUNCTION wb3_export_tenant(p_tenant_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.wb3_export_tenant(p_tenant_id uuid) IS 'Export JSON complet d''un tenant (toutes tables, lignes archivées incluses). SECURITY DEFINER + vérification d''appartenance via memberships. Un utilisateur ne peut exporter que son propre tenant.';


--
-- Name: wb3_integrity_check(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wb3_integrity_check(p_tenant_id uuid DEFAULT NULL::uuid) RETURNS TABLE(categorie text, severite text, type text, description text, entite_table text, entite_id uuid, tenant_id uuid, detail jsonb)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$

  -- =============================================================
  -- A. ORPHELINS / INCOHÉRENCES TENANT
  -- =============================================================
  WITH a1_lc_tenant_mismatch AS (
    -- lot_contenants : tenant doit matcher lot ET contenant
    SELECT
      'A_orphelin'::text                                                AS categorie,
      'critique'::text                                                  AS severite,
      'lc_tenant_mismatch'::text                                        AS type,
      format('lot_contenants id=%s : tenant=%s, lot.tenant=%s, contenant.tenant=%s',
             lc.id, lc.tenant_id, l.tenant_id, c.tenant_id)             AS description,
      'lot_contenants'::text                                            AS entite_table,
      lc.id                                                             AS entite_id,
      lc.tenant_id                                                      AS tenant_id,
      jsonb_build_object(
        'lot_id', lc.lot_id, 'contenant_id', lc.contenant_id,
        'lc_tenant', lc.tenant_id, 'lot_tenant', l.tenant_id, 'cont_tenant', c.tenant_id
      )                                                                 AS detail
    FROM public.lot_contenants lc
    LEFT JOIN public.lots       l ON l.id = lc.lot_id
    LEFT JOIN public.contenants c ON c.id = lc.contenant_id
    WHERE (p_tenant_id IS NULL OR lc.tenant_id = p_tenant_id)
      AND (l.tenant_id IS DISTINCT FROM lc.tenant_id
           OR c.tenant_id IS DISTINCT FROM lc.tenant_id
           OR l.id IS NULL OR c.id IS NULL)
  ),

  a2_op_lots_orphan AS (
    SELECT
      'A_orphelin'::text,
      'critique'::text,
      'op_lots_tenant_mismatch'::text,
      format('operation_lots id=%s : tenant=%s, lot.tenant=%s, operation.tenant=%s',
             ol.id, ol.tenant_id, l.tenant_id, o.tenant_id),
      'operation_lots'::text,
      ol.id,
      ol.tenant_id,
      jsonb_build_object(
        'operation_id', ol.operation_id, 'lot_id', ol.lot_id, 'role', ol.role,
        'ol_tenant', ol.tenant_id, 'op_tenant', o.tenant_id, 'lot_tenant', l.tenant_id
      )
    FROM public.operation_lots ol
    LEFT JOIN public.operations o ON o.id = ol.operation_id
    LEFT JOIN public.lots       l ON l.id = ol.lot_id
    WHERE (p_tenant_id IS NULL OR ol.tenant_id = p_tenant_id)
      AND (o.tenant_id IS DISTINCT FROM ol.tenant_id
           OR l.tenant_id IS DISTINCT FROM ol.tenant_id
           OR o.id IS NULL OR l.id IS NULL)
  ),

  a3_op_cont_orphan AS (
    SELECT
      'A_orphelin'::text,
      'critique'::text,
      'op_contenants_tenant_mismatch'::text,
      format('operation_contenants id=%s : tenant=%s, contenant.tenant=%s, operation.tenant=%s',
             oc.id, oc.tenant_id, c.tenant_id, o.tenant_id),
      'operation_contenants'::text,
      oc.id,
      oc.tenant_id,
      jsonb_build_object(
        'operation_id', oc.operation_id, 'contenant_id', oc.contenant_id, 'role', oc.role,
        'oc_tenant', oc.tenant_id, 'op_tenant', o.tenant_id, 'cont_tenant', c.tenant_id
      )
    FROM public.operation_contenants oc
    LEFT JOIN public.operations o ON o.id = oc.operation_id
    LEFT JOIN public.contenants c ON c.id = oc.contenant_id
    WHERE (p_tenant_id IS NULL OR oc.tenant_id = p_tenant_id)
      AND (o.tenant_id IS DISTINCT FROM oc.tenant_id
           OR c.tenant_id IS DISTINCT FROM oc.tenant_id
           OR o.id IS NULL OR c.id IS NULL)
  ),

  a4_op_prod_orphan AS (
    SELECT
      'A_orphelin'::text,
      'critique'::text,
      'op_produits_tenant_mismatch'::text,
      format('operation_produits id=%s : tenant=%s, produit_lot.tenant=%s, operation.tenant=%s',
             op.id, op.tenant_id, pl.tenant_id, o.tenant_id),
      'operation_produits'::text,
      op.id,
      op.tenant_id,
      jsonb_build_object(
        'operation_id', op.operation_id, 'produit_lot_id', op.produit_lot_id,
        'op_tenant', op.tenant_id, 'oper_tenant', o.tenant_id, 'pl_tenant', pl.tenant_id
      )
    FROM public.operation_produits op
    LEFT JOIN public.operations    o  ON o.id  = op.operation_id
    LEFT JOIN public.produits_lots pl ON pl.id = op.produit_lot_id
    WHERE (p_tenant_id IS NULL OR op.tenant_id = p_tenant_id)
      AND (o.tenant_id IS DISTINCT FROM op.tenant_id
           OR pl.tenant_id IS DISTINCT FROM op.tenant_id
           OR o.id IS NULL OR pl.id IS NULL)
  ),

  a5_filiation_cross_tenant AS (
    SELECT
      'A_orphelin'::text,
      'critique'::text,
      'filiation_cross_tenant'::text,
      format('lot_filiation id=%s : tenant=%s, lot.tenant=%s, parent.tenant=%s',
             lf.id, lf.tenant_id, child.tenant_id, parent.tenant_id),
      'lot_filiation'::text,
      lf.id,
      lf.tenant_id,
      jsonb_build_object(
        'lot_id', lf.lot_id, 'parent_id', lf.parent_id, 'source_type', lf.source_type,
        'lf_tenant', lf.tenant_id, 'child_tenant', child.tenant_id, 'parent_tenant', parent.tenant_id
      )
    FROM public.lot_filiation lf
    LEFT JOIN public.lots child  ON child.id  = lf.lot_id
    LEFT JOIN public.lots parent ON parent.id = lf.parent_id
    WHERE (p_tenant_id IS NULL OR lf.tenant_id = p_tenant_id)
      AND (child.tenant_id IS DISTINCT FROM lf.tenant_id
           OR parent.tenant_id IS DISTINCT FROM lf.tenant_id
           OR child.id IS NULL OR parent.id IS NULL)
  ),

  a6_lm_cross_tenant AS (
    SELECT
      'A_orphelin'::text,
      'critique'::text,
      'lot_mouvements_cross_tenant'::text,
      format('lot_mouvements id=%s : tenant=%s mais lot/src/dst hors tenant', lm.id, lm.tenant_id),
      'lot_mouvements'::text,
      lm.id,
      lm.tenant_id,
      jsonb_build_object(
        'operation_id', lm.operation_id, 'lot_id', lm.lot_id,
        'src_id', lm.contenant_source_id, 'dst_id', lm.contenant_dest_id,
        'lm_tenant', lm.tenant_id,
        'lot_tenant', l.tenant_id, 'src_tenant', cs.tenant_id, 'dst_tenant', cd.tenant_id
      )
    FROM public.lot_mouvements lm
    LEFT JOIN public.lots       l  ON l.id  = lm.lot_id
    LEFT JOIN public.contenants cs ON cs.id = lm.contenant_source_id
    LEFT JOIN public.contenants cd ON cd.id = lm.contenant_dest_id
    WHERE (p_tenant_id IS NULL OR lm.tenant_id = p_tenant_id)
      AND (
            l.tenant_id IS DISTINCT FROM lm.tenant_id
        OR (lm.contenant_source_id IS NOT NULL AND cs.tenant_id IS DISTINCT FROM lm.tenant_id)
        OR (lm.contenant_dest_id   IS NOT NULL AND cd.tenant_id IS DISTINCT FROM lm.tenant_id)
        OR l.id IS NULL
      )
  ),

  -- =============================================================
  -- B. VOLUMES INCOHÉRENTS
  -- =============================================================
  b1_lot_vol_vs_lc AS (
    SELECT
      'B_volume'::text,
      'avertissement'::text,
      'lot_volume_mismatch'::text,
      format('Lot %s : volume_actuel_hl=%s ≠ Σ lot_contenants=%s (écart %s hL)',
             l.nom, l.volume_actuel_hl, COALESCE(sl.s, 0),
             round(l.volume_actuel_hl - COALESCE(sl.s, 0), 4)),
      'lots'::text,
      l.id,
      l.tenant_id,
      jsonb_build_object(
        'volume_actuel_hl', l.volume_actuel_hl,
        'somme_lot_contenants_hl', COALESCE(sl.s, 0),
        'ecart_hl', round(l.volume_actuel_hl - COALESCE(sl.s, 0), 4)
      )
    FROM public.lots l
    LEFT JOIN (
      SELECT lot_id, SUM(volume_hl) AS s
      FROM public.lot_contenants
      GROUP BY lot_id
    ) sl ON sl.lot_id = l.id
    WHERE (p_tenant_id IS NULL OR l.tenant_id = p_tenant_id)
      AND l.volume_actuel_hl IS NOT NULL
      AND ABS(l.volume_actuel_hl - COALESCE(sl.s, 0)) > 0.01
      AND l.statut NOT IN ('conditionne', 'sorti', 'archive')
  ),

  b2_lc_overcap_individuel AS (
    SELECT
      'B_volume'::text,
      'critique'::text,
      'lc_volume_over_capacity'::text,
      format('lot_contenants %s : volume_hl=%s > capacite_hl=%s (contenant %s)',
             lc.id, lc.volume_hl, c.capacite_hl, c.nom),
      'lot_contenants'::text,
      lc.id,
      lc.tenant_id,
      jsonb_build_object(
        'lot_id', lc.lot_id, 'contenant_id', lc.contenant_id, 'contenant_nom', c.nom,
        'volume_hl', lc.volume_hl, 'capacite_hl', c.capacite_hl,
        'depassement_hl', lc.volume_hl - c.capacite_hl
      )
    FROM public.lot_contenants lc
    JOIN public.contenants c ON c.id = lc.contenant_id
    WHERE (p_tenant_id IS NULL OR lc.tenant_id = p_tenant_id)
      AND lc.volume_hl IS NOT NULL
      AND c.capacite_hl > 0
      AND lc.volume_hl > c.capacite_hl
  ),

  b3_cont_overcap_total AS (
    SELECT
      'B_volume'::text,
      'critique'::text,
      'contenant_over_capacity'::text,
      format('Contenant %s : Σ volume_hl=%s > capacite_hl=%s',
             c.nom, totaux.s, c.capacite_hl),
      'contenants'::text,
      c.id,
      c.tenant_id,
      jsonb_build_object(
        'contenant_nom', c.nom, 'somme_volume_hl', totaux.s,
        'capacite_hl', c.capacite_hl, 'depassement_hl', totaux.s - c.capacite_hl,
        'nb_lots', totaux.n
      )
    FROM public.contenants c
    JOIN (
      SELECT contenant_id, SUM(volume_hl) AS s, COUNT(*) AS n
      FROM public.lot_contenants
      WHERE volume_hl IS NOT NULL
      GROUP BY contenant_id
    ) totaux ON totaux.contenant_id = c.id
    WHERE (p_tenant_id IS NULL OR c.tenant_id = p_tenant_id)
      AND c.capacite_hl > 0
      AND totaux.s > c.capacite_hl
  ),

  b4_volume_negatif AS (
    SELECT
      'B_volume'::text,
      'critique'::text,
      'volume_negatif'::text,
      format('%s id=%s : volume_hl=%s négatif', src.src_table, src.src_id, src.vol),
      src.src_table,
      src.src_id,
      src.tenant_id,
      jsonb_build_object('volume_hl', src.vol)
    FROM (
      SELECT 'lot_contenants'::text   AS src_table, id AS src_id, tenant_id, volume_hl AS vol
        FROM public.lot_contenants WHERE volume_hl < 0
      UNION ALL
      SELECT 'operation_lots',                id, tenant_id, volume_hl
        FROM public.operation_lots WHERE volume_hl < 0
      UNION ALL
      SELECT 'operation_contenants',          id, tenant_id, volume_hl
        FROM public.operation_contenants WHERE volume_hl < 0
      UNION ALL
      SELECT 'lot_mouvements',                id, tenant_id, volume_hl
        FROM public.lot_mouvements WHERE volume_hl < 0
      UNION ALL
      SELECT 'lots',                          id, tenant_id, volume_actuel_hl
        FROM public.lots WHERE volume_actuel_hl < 0
    ) src
    WHERE p_tenant_id IS NULL OR src.tenant_id = p_tenant_id
  ),

  b5_gain_anormal AS (
    SELECT
      'B_volume'::text,
      'avertissement'::text,
      'gain_volume_anormal'::text,
      format('Lot %s : volume_actuel=%s > volume_initial=%s × 1.05',
             l.nom, l.volume_actuel_hl, l.volume_initial_hl),
      'lots'::text,
      l.id,
      l.tenant_id,
      jsonb_build_object(
        'volume_initial_hl', l.volume_initial_hl,
        'volume_actuel_hl',  l.volume_actuel_hl,
        'gain_pct', round((l.volume_actuel_hl / NULLIF(l.volume_initial_hl, 0) - 1) * 100, 2)
      )
    FROM public.lots l
    WHERE (p_tenant_id IS NULL OR l.tenant_id = p_tenant_id)
      AND l.volume_initial_hl IS NOT NULL
      AND l.volume_actuel_hl  IS NOT NULL
      AND l.volume_initial_hl > 0
      AND l.volume_actuel_hl  > l.volume_initial_hl * 1.05
  ),

  -- =============================================================
  -- C. OPÉRATIONS RÉALISÉES SANS effects_applied_at (depuis 040)
  -- =============================================================
  c1_realise_sans_horodatage AS (
    SELECT
      'C_horodatage'::text,
      'avertissement'::text,
      'realise_sans_effects_applied_at'::text,
      format('Opération %s (%s, %s) statut=realise mais meta.effects_applied_at absent',
             o.id, o.type_operation, o.date_operation),
      'operations'::text,
      o.id,
      o.tenant_id,
      jsonb_build_object(
        'type_operation', o.type_operation,
        'date_operation', o.date_operation,
        'reference', o.reference,
        'created_at', o.created_at
      )
    FROM public.operations o
    WHERE (p_tenant_id IS NULL OR o.tenant_id = p_tenant_id)
      AND o.statut = 'realise'
      AND (o.meta->>'effects_applied_at') IS NULL
  ),

  c2_realise_sans_mouvement AS (
    -- Types qui DOIVENT produire un lot_mouvement
    SELECT
      'C_horodatage'::text,
      'critique'::text,
      'realise_sans_lot_mouvement'::text,
      format('Opération %s (%s) statut=realise : aucun lot_mouvement enregistré',
             o.id, o.type_operation),
      'operations'::text,
      o.id,
      o.tenant_id,
      jsonb_build_object(
        'type_operation', o.type_operation,
        'date_operation', o.date_operation,
        'effects_applied_at', o.meta->>'effects_applied_at'
      )
    FROM public.operations o
    WHERE (p_tenant_id IS NULL OR o.tenant_id = p_tenant_id)
      AND o.statut = 'realise'
      AND o.type_operation IN
          ('soutirage','transfert','relogement','ecoulage','filtration','assemblage','mise_en_bouteille')
      AND NOT EXISTS (
        SELECT 1 FROM public.lot_mouvements lm
        WHERE lm.operation_id = o.id AND lm.tenant_id = o.tenant_id
      )
  ),

  -- =============================================================
  -- D. DLUO DÉPASSÉES AVEC STOCK
  -- =============================================================
  d1_dluo_expired AS (
    SELECT
      'D_dluo'::text,
      CASE
        WHEN pl.dluo < CURRENT_DATE - INTERVAL '30 days' THEN 'critique'
        ELSE 'avertissement'
      END                                                              AS severite,
      'dluo_expired_with_stock'::text,
      format('Produit lot %s (%s) : DLUO %s dépassée, stock restant %s %s',
             pl.numero_lot, pc.nom, pl.dluo, pl.quantite_actuelle, COALESCE(pl.unite, pc.unite_stock, '')),
      'produits_lots'::text,
      pl.id,
      pl.tenant_id,
      jsonb_build_object(
        'numero_lot', pl.numero_lot, 'produit_nom', pc.nom, 'categorie', pc.categorie,
        'dluo', pl.dluo, 'quantite_actuelle', pl.quantite_actuelle,
        'unite', COALESCE(pl.unite, pc.unite_stock),
        'jours_depassement', (CURRENT_DATE - pl.dluo)
      )
    FROM public.produits_lots pl
    JOIN public.produits_catalogue pc ON pc.id = pl.produit_id
    WHERE (p_tenant_id IS NULL OR pl.tenant_id = p_tenant_id)
      AND pl.dluo IS NOT NULL
      AND pl.dluo < CURRENT_DATE
      AND COALESCE(pl.quantite_actuelle, 0) > 0
  )

  -- =============================================================
  -- AGRÉGATION FINALE
  -- =============================================================
  SELECT * FROM a1_lc_tenant_mismatch
  UNION ALL SELECT * FROM a2_op_lots_orphan
  UNION ALL SELECT * FROM a3_op_cont_orphan
  UNION ALL SELECT * FROM a4_op_prod_orphan
  UNION ALL SELECT * FROM a5_filiation_cross_tenant
  UNION ALL SELECT * FROM a6_lm_cross_tenant
  UNION ALL SELECT * FROM b1_lot_vol_vs_lc
  UNION ALL SELECT * FROM b2_lc_overcap_individuel
  UNION ALL SELECT * FROM b3_cont_overcap_total
  UNION ALL SELECT * FROM b4_volume_negatif
  UNION ALL SELECT * FROM b5_gain_anormal
  UNION ALL SELECT * FROM c1_realise_sans_horodatage
  UNION ALL SELECT * FROM c2_realise_sans_mouvement
  UNION ALL SELECT * FROM d1_dluo_expired
  ORDER BY 1, 2, 3;
$$;


--
-- Name: FUNCTION wb3_integrity_check(p_tenant_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.wb3_integrity_check(p_tenant_id uuid) IS 'Audit d''intégrité WB3 : retourne les anomalies par catégorie (orphelins, volumes, horodatage opérations réalisées, DLUO dépassées avec stock). SECURITY DEFINER + filtre tenant explicite. p_tenant_id=NULL → tous tenants.';


--
-- Name: wb3_lot_chain(uuid, uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wb3_lot_chain(p_tenant_id uuid, p_lot_id uuid, p_depth integer DEFAULT 5) RETURNS TABLE(lot_id uuid, parent_id uuid, depth integer, direction text, source_type text)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Vérification tenant : le lot doit appartenir au tenant appelant
  IF NOT EXISTS (
    SELECT 1 FROM public.lots
    WHERE id = p_lot_id AND tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Lot % introuvable pour le tenant %', p_lot_id, p_tenant_id;
  END IF;

  RETURN QUERY
  WITH RECURSIVE
    -- Remontée vers les ancêtres (direction = 'up')
    ancestors AS (
      -- Base : parents directs du lot pivot
      SELECT
        lf.parent_id  AS lot_id,
        lf.lot_id     AS parent_id,
        1             AS depth,
        'up'::text    AS direction,
        lf.source_type
      FROM public.lot_filiation lf
      WHERE lf.lot_id    = p_lot_id
        AND lf.tenant_id = p_tenant_id

      UNION ALL

      -- Récursion : parents des ancêtres déjà trouvés
      SELECT
        lf.parent_id,
        lf.lot_id,
        a.depth + 1,
        'up'::text,
        lf.source_type
      FROM public.lot_filiation lf
      JOIN ancestors a ON lf.lot_id = a.lot_id
      WHERE lf.tenant_id = p_tenant_id
        AND a.depth < p_depth
    ),

    -- Descente vers les descendants (direction = 'down')
    descendants AS (
      -- Base : enfants directs du lot pivot
      SELECT
        lf.lot_id     AS lot_id,
        lf.parent_id  AS parent_id,
        1             AS depth,
        'down'::text  AS direction,
        lf.source_type
      FROM public.lot_filiation lf
      WHERE lf.parent_id = p_lot_id
        AND lf.tenant_id = p_tenant_id

      UNION ALL

      -- Récursion : enfants des descendants déjà trouvés
      SELECT
        lf.lot_id,
        lf.parent_id,
        d.depth + 1,
        'down'::text,
        lf.source_type
      FROM public.lot_filiation lf
      JOIN descendants d ON lf.parent_id = d.lot_id
      WHERE lf.tenant_id = p_tenant_id
        AND d.depth < p_depth
    )

  SELECT a.lot_id, a.parent_id, a.depth, a.direction, a.source_type FROM ancestors a
  UNION ALL
  SELECT d.lot_id, d.parent_id, d.depth, d.direction, d.source_type FROM descendants d;
END;
$$;


--
-- Name: FUNCTION wb3_lot_chain(p_tenant_id uuid, p_lot_id uuid, p_depth integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.wb3_lot_chain(p_tenant_id uuid, p_lot_id uuid, p_depth integer) IS 'CTE récursive sur lot_filiation — retourne ancêtres (direction=up) et descendants (direction=down) jusqu''à p_depth niveaux. SECURITY DEFINER + vérification tenant explicite.';


--
-- Name: wb3_lot_contenants_history_trig(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wb3_lot_contenants_history_trig() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_nom text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Snapshot du nom de la cuve au moment de l'affectation
    SELECT nom INTO v_nom FROM public.contenants WHERE id = NEW.contenant_id;
    INSERT INTO public.lot_contenants_history
      (tenant_id, lot_id, contenant_id, contenant_nom_snap, volume_hl, type_evt, date_evt)
    VALUES
      (NEW.tenant_id, NEW.lot_id, NEW.contenant_id, COALESCE(v_nom,'?'), NEW.volume_hl, 'entree', now());

  ELSIF TG_OP = 'DELETE' THEN
    SELECT nom INTO v_nom FROM public.contenants WHERE id = OLD.contenant_id;
    INSERT INTO public.lot_contenants_history
      (tenant_id, lot_id, contenant_id, contenant_nom_snap, volume_hl, type_evt, date_evt)
    VALUES
      (OLD.tenant_id, OLD.lot_id, OLD.contenant_id, COALESCE(v_nom,'?'), OLD.volume_hl, 'sortie', now());
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: wb3_next_lot_numero(uuid, integer, date, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wb3_next_lot_numero(p_tenant_id uuid, p_millesime integer DEFAULT NULL::integer, p_date_entree date DEFAULT NULL::date, p_cep_nom text DEFAULT NULL::text, p_couleur text DEFAULT NULL::text) RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_yyyy text;
  v_jjj  text;
  v_cep  text;
  v_coul text;
  v_pfx  text;
  v_seq  int;
BEGIN
  -- Année : millésime ou année de la date d'entrée ou année courante
  v_yyyy := COALESCE(
    NULLIF(p_millesime::text, ''),
    EXTRACT(YEAR FROM COALESCE(p_date_entree, CURRENT_DATE))::text
  );

  -- Jour julien basé sur la date d'entrée (ou aujourd'hui)
  v_jjj := LPAD(
    EXTRACT(DOY FROM COALESCE(p_date_entree, CURRENT_DATE))::int::text,
    3, '0'
  );

  -- Code cépage : 3 lettres majuscules sans accents ni caractères spéciaux
  v_cep := UPPER(LEFT(
    REGEXP_REPLACE(
      unaccent(COALESCE(NULLIF(TRIM(p_cep_nom), ''), '---')),
      '[^A-Za-z]', '', 'g'
    ),
    3
  ));
  IF LENGTH(v_cep) < 3 THEN v_cep := RPAD(v_cep, 3, '-'); END IF;

  -- Code couleur
  v_coul := CASE LOWER(COALESCE(p_couleur, ''))
    WHEN 'rouge' THEN 'R'
    WHEN 'blanc' THEN 'B'
    WHEN 'rose'  THEN 'RO'
    WHEN 'gris'  THEN 'G'
    ELSE 'X'
  END;

  v_pfx := 'L-' || v_yyyy || '-' || v_jjj || '-' || v_cep || '-' || v_coul || '-';

  -- Prochaine séquence : max existant pour ce préfixe + 1
  SELECT COALESCE(
    MAX(
      CASE
        WHEN numero_lot LIKE (v_pfx || '%')
         AND SUBSTRING(numero_lot FROM LENGTH(v_pfx) + 1) ~ '^\d+$'
        THEN SUBSTRING(numero_lot FROM LENGTH(v_pfx) + 1)::int
        ELSE 0
      END
    ), 0
  ) + 1
  INTO v_seq
  FROM public.lots
  WHERE tenant_id = p_tenant_id;

  RETURN v_pfx || LPAD(v_seq::text, 2, '0');
END;
$_$;


--
-- Name: wb3_save_lot_graph(uuid, uuid, jsonb, jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wb3_save_lot_graph(p_tenant_id uuid, p_lot_id uuid DEFAULT NULL::uuid, p_lot jsonb DEFAULT '{}'::jsonb, p_cepages jsonb DEFAULT '[]'::jsonb, p_contenants jsonb DEFAULT '[]'::jsonb) RETURNS uuid
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_id         uuid;
  v_numero_lot text;
  v_cep_nom    text;
BEGIN

  -- ── 1. Lot : upsert ─────────────────────────────────────────
  IF p_lot_id IS NOT NULL THEN
    UPDATE public.lots SET
      nom               = CASE WHEN p_lot ? 'nom'               THEN      p_lot->>'nom'                                ELSE nom               END,
      millesime         = CASE WHEN p_lot ? 'millesime'         THEN NULLIF(p_lot->>'millesime',        '')::int        ELSE millesime         END,
      couleur           = CASE WHEN p_lot ? 'couleur'           THEN      p_lot->>'couleur'                            ELSE couleur           END,
      statut            = CASE WHEN p_lot ? 'statut'            THEN      p_lot->>'statut'                             ELSE statut            END,
      volume_initial_hl = CASE WHEN p_lot ? 'volume_initial_hl' THEN NULLIF(p_lot->>'volume_initial_hl', '')::numeric   ELSE volume_initial_hl END,
      volume_actuel_hl  = CASE WHEN p_lot ? 'volume_actuel_hl'  THEN NULLIF(p_lot->>'volume_actuel_hl',  '')::numeric   ELSE volume_actuel_hl  END,
      date_entree       = CASE WHEN p_lot ? 'date_entree'       THEN NULLIF(p_lot->>'date_entree',       '')::date      ELSE date_entree       END,
      date_sortie       = CASE WHEN p_lot ? 'date_sortie'       THEN NULLIF(p_lot->>'date_sortie',       '')::date      ELSE date_sortie       END,
      notes             = CASE WHEN p_lot ? 'notes'             THEN      p_lot->>'notes'                              ELSE notes             END,
      actif             = CASE WHEN p_lot ? 'actif'             THEN NULLIF(p_lot->>'actif',             '')::boolean   ELSE actif             END,
      type_lot          = CASE WHEN p_lot ? 'type_lot'          THEN NULLIF(p_lot->>'type_lot',          '')            ELSE type_lot          END,
      appellation       = CASE WHEN p_lot ? 'appellation'       THEN NULLIF(p_lot->>'appellation',       '')            ELSE appellation       END,
      destination       = CASE WHEN p_lot ? 'destination'       THEN NULLIF(p_lot->>'destination',       '')            ELSE destination       END
    WHERE id = p_lot_id AND tenant_id = p_tenant_id
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
      RAISE EXCEPTION 'wb3_save_lot_graph: lot introuvable ou accès refusé (id=%, tenant=%)',
        p_lot_id, p_tenant_id;
    END IF;

  ELSE
    -- Cépage principal (plus grand pourcentage ou premier de la liste)
    SELECT c.nom INTO v_cep_nom
    FROM   jsonb_array_elements(p_cepages) AS elem
    JOIN   public.cepages c ON c.id = (elem->>'cepage_id')::uuid
    WHERE  (elem->>'cepage_id') IS NOT NULL
    ORDER  BY COALESCE(NULLIF(elem->>'pourcentage', '')::numeric, 0) DESC
    LIMIT  1;

    -- Numéro unique auto-généré
    v_numero_lot := public.wb3_next_lot_numero(
      p_tenant_id,
      NULLIF(p_lot->>'millesime', '')::int,
      NULLIF(p_lot->>'date_entree', '')::date,
      v_cep_nom,
      p_lot->>'couleur'
    );

    INSERT INTO public.lots (
      tenant_id,
      nom, millesime, couleur, statut,
      volume_initial_hl, volume_actuel_hl,
      date_entree, date_sortie, notes, actif,
      type_lot, appellation, destination,
      numero_lot
    ) VALUES (
      p_tenant_id,
      p_lot->>'nom',
      NULLIF(p_lot->>'millesime',        '')::int,
      p_lot->>'couleur',
      COALESCE(NULLIF(p_lot->>'statut',  ''), 'vendange'),
      NULLIF(p_lot->>'volume_initial_hl', '')::numeric,
      NULLIF(p_lot->>'volume_actuel_hl',  '')::numeric,
      NULLIF(p_lot->>'date_entree',       '')::date,
      NULLIF(p_lot->>'date_sortie',       '')::date,
      p_lot->>'notes',
      COALESCE(NULLIF(p_lot->>'actif',    '')::boolean, true),
      NULLIF(p_lot->>'type_lot',          ''),
      NULLIF(p_lot->>'appellation',       ''),
      NULLIF(p_lot->>'destination',       ''),
      v_numero_lot
    )
    RETURNING id INTO v_id;
  END IF;

  -- ── 2. lot_cepages : delta complet ──────────────────────────
  DELETE FROM public.lot_cepages
    WHERE lot_id = v_id
      AND cepage_id NOT IN (
        SELECT (elem->>'cepage_id')::uuid
        FROM   jsonb_array_elements(p_cepages) AS elem
        WHERE  (elem->>'cepage_id') IS NOT NULL
      );

  -- lot_cepages n'a pas de colonne tenant_id (héritage RLS via lot_id)
  INSERT INTO public.lot_cepages (lot_id, cepage_id, pourcentage)
  SELECT v_id, (elem->>'cepage_id')::uuid,
         NULLIF(elem->>'pourcentage', '')::numeric
  FROM   jsonb_array_elements(p_cepages) AS elem
  WHERE  (elem->>'cepage_id') IS NOT NULL
  ON CONFLICT (lot_id, cepage_id) DO UPDATE
    SET pourcentage = EXCLUDED.pourcentage;

  -- ── 3. lot_contenants : delta par lc_id ─────────────────────
  DELETE FROM public.lot_contenants lc
    WHERE lc.lot_id = v_id
      AND lc.id NOT IN (
        SELECT (elem->>'lc_id')::uuid
        FROM   jsonb_array_elements(p_contenants) AS elem
        WHERE  (elem->>'lc_id') IS NOT NULL
      )
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_contenants) AS e WHERE (e->>'lc_id') IS NOT NULL
      );

  INSERT INTO public.lot_contenants (tenant_id, lot_id, contenant_id, volume_hl, date_affectation)
  SELECT p_tenant_id, v_id,
         (elem->>'contenant_id')::uuid,
         NULLIF(elem->>'volume_hl', '')::numeric,
         COALESCE(NULLIF(elem->>'date_affectation', '')::date, CURRENT_DATE)
  FROM   jsonb_array_elements(p_contenants) AS elem
  WHERE  (elem->>'contenant_id') IS NOT NULL
    AND  (elem->>'lc_id') IS NULL
  ON CONFLICT DO NOTHING;

  UPDATE public.lot_contenants lc SET
    volume_hl        = NULLIF(elem->>'volume_hl', '')::numeric,
    date_affectation = COALESCE(NULLIF(elem->>'date_affectation', '')::date, lc.date_affectation)
  FROM jsonb_array_elements(p_contenants) AS elem
  WHERE lc.id        = (elem->>'lc_id')::uuid
    AND lc.lot_id    = v_id
    AND lc.tenant_id = p_tenant_id
    AND (elem->>'lc_id') IS NOT NULL;

  RETURN v_id;
END;
$$;


--
-- Name: wb3_save_operation_graph(uuid, uuid, jsonb, jsonb, jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wb3_save_operation_graph(p_tenant_id uuid, p_op_id uuid DEFAULT NULL::uuid, p_op jsonb DEFAULT '{}'::jsonb, p_lots jsonb DEFAULT '[]'::jsonb, p_contenants jsonb DEFAULT '[]'::jsonb, p_produits jsonb DEFAULT '[]'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_id          uuid;
  v_is_new      boolean := (p_op_id IS NULL);
  v_type        text;
  v_new_statut  text;
  v_old_statut  text;
  v_apply       boolean := false;
  v_is_locked   boolean := false;
  v_stored_type text;
  v_stored_date date;
  v_plid        uuid;
  v_qty         numeric;
  v_stock       numeric;   -- stock disponible avant décrémentation
BEGIN

  -- ── Bypass transactionnel ─────────────────────────────────────
  PERFORM set_config('app.wb3_lock_bypass', 'true', true);

  -- ── 1. Opération : upsert ─────────────────────────────────────
  IF NOT v_is_new THEN

    SELECT statut, type_operation, date_operation
    INTO   v_old_statut, v_stored_type, v_stored_date
    FROM   public.operations
    WHERE  id = p_op_id AND tenant_id = p_tenant_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'wb3_save_operation_graph: opération introuvable ou accès refusé (id=%, tenant=%)',
        p_op_id, p_tenant_id;
    END IF;

    v_new_statut := CASE
      WHEN p_op ? 'statut' THEN COALESCE(NULLIF(p_op->>'statut', ''), v_old_statut)
      ELSE v_old_statut
    END;

    v_is_locked := (v_old_statut = 'realise');

    -- ── VERROU ────────────────────────────────────────────────────
    IF v_is_locked THEN

      IF (p_op ? 'type_operation' AND p_op->>'type_operation' IS DISTINCT FROM v_stored_type)
      OR (p_op ? 'date_operation' AND (p_op->>'date_operation')::date IS DISTINCT FROM v_stored_date)
      OR v_new_statut IS DISTINCT FROM 'realise'
      THEN
        RAISE EXCEPTION
          'Opération réalisée verrouillée. '
          'Créez une opération corrective pour modifier les effets cave.';
      END IF;

      UPDATE public.operations SET
        reference = CASE WHEN p_op ? 'reference' THEN NULLIF(p_op->>'reference', '') ELSE reference END,
        operateur = CASE WHEN p_op ? 'operateur' THEN NULLIF(p_op->>'operateur', '') ELSE operateur END,
        notes     = CASE WHEN p_op ? 'notes'     THEN NULLIF(p_op->>'notes',     '') ELSE notes     END
      WHERE  id = p_op_id AND tenant_id = p_tenant_id
      RETURNING id INTO v_id;

      RETURN v_id;
    END IF;
    -- ── FIN VERROU ────────────────────────────────────────────────

    UPDATE public.operations SET
      type_operation  = CASE WHEN p_op ? 'type_operation'  THEN       p_op->>'type_operation'                   ELSE type_operation  END,
      date_operation  = CASE WHEN p_op ? 'date_operation'  THEN      (p_op->>'date_operation')::date             ELSE date_operation  END,
      heure_operation = CASE WHEN p_op ? 'heure_operation' THEN NULLIF(p_op->>'heure_operation', '')::time       ELSE heure_operation END,
      reference       = CASE WHEN p_op ? 'reference'       THEN NULLIF(p_op->>'reference',       '')             ELSE reference       END,
      volume_hl       = CASE WHEN p_op ? 'volume_hl'       THEN NULLIF(p_op->>'volume_hl',       '')::numeric   ELSE volume_hl       END,
      quantite        = CASE WHEN p_op ? 'quantite'        THEN NULLIF(p_op->>'quantite',        '')::numeric   ELSE quantite        END,
      unite           = CASE WHEN p_op ? 'unite'           THEN NULLIF(p_op->>'unite',           '')             ELSE unite           END,
      operateur       = CASE WHEN p_op ? 'operateur'       THEN NULLIF(p_op->>'operateur',       '')             ELSE operateur       END,
      statut          = CASE WHEN p_op ? 'statut'          THEN       p_op->>'statut'                            ELSE statut          END,
      notes           = CASE WHEN p_op ? 'notes'           THEN NULLIF(p_op->>'notes',           '')             ELSE notes           END,
      meta            = CASE WHEN p_op ? 'meta'
                          THEN p_op->'meta' || jsonb_strip_nulls(jsonb_build_object(
                                 'effects_applied_at', meta->>'effects_applied_at'))
                          ELSE meta END
    WHERE id = p_op_id AND tenant_id = p_tenant_id
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
      RAISE EXCEPTION 'wb3_save_operation_graph: opération introuvable ou accès refusé (id=%, tenant=%)',
        p_op_id, p_tenant_id;
    END IF;

    v_apply := (v_old_statut IS DISTINCT FROM 'realise' AND v_new_statut = 'realise');

  ELSE
    INSERT INTO public.operations (
      tenant_id,
      type_operation, date_operation, heure_operation,
      reference, volume_hl, quantite, unite, operateur, statut, notes, meta
    ) VALUES (
      p_tenant_id,
      p_op->>'type_operation',
      (p_op->>'date_operation')::date,
      NULLIF(p_op->>'heure_operation', '')::time,
      NULLIF(p_op->>'reference',       ''),
      NULLIF(p_op->>'volume_hl',       '')::numeric,
      NULLIF(p_op->>'quantite',        '')::numeric,
      NULLIF(p_op->>'unite',           ''),
      NULLIF(p_op->>'operateur',       ''),
      COALESCE(NULLIF(p_op->>'statut', ''), 'realise'),
      NULLIF(p_op->>'notes',           ''),
      COALESCE(p_op->'meta', '{}')
    )
    RETURNING id INTO v_id;

    v_new_statut := COALESCE(NULLIF(p_op->>'statut', ''), 'realise');
    v_apply      := (v_new_statut = 'realise');
  END IF;

  -- ── 2. operation_lots ─────────────────────────────────────────
  DELETE FROM public.operation_lots
    WHERE operation_id = v_id
      AND tenant_id    = p_tenant_id
      AND NOT EXISTS (
        SELECT 1
        FROM   jsonb_array_elements(p_lots) AS elem
        WHERE  (elem->>'lot_id') IS NOT NULL
          AND  (elem->>'lot_id')::uuid = operation_lots.lot_id
          AND  elem->>'role'           = operation_lots.role
      );

  INSERT INTO public.operation_lots (operation_id, lot_id, role, volume_hl, tenant_id)
  SELECT
    v_id,
    (elem->>'lot_id')::uuid,
    COALESCE(NULLIF(elem->>'role', ''), 'traite'),
    NULLIF(elem->>'volume_hl', '')::numeric,
    p_tenant_id
  FROM jsonb_array_elements(p_lots) AS elem
  WHERE (elem->>'lot_id') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.operation_lots ol2
      WHERE  ol2.operation_id = v_id
        AND  ol2.tenant_id    = p_tenant_id
        AND  ol2.lot_id       = (elem->>'lot_id')::uuid
        AND  ol2.role         = COALESCE(NULLIF(elem->>'role', ''), 'traite')
    );

  UPDATE public.operation_lots ol
    SET volume_hl = NULLIF(elem->>'volume_hl', '')::numeric
  FROM jsonb_array_elements(p_lots) AS elem
  WHERE ol.operation_id = v_id
    AND ol.tenant_id    = p_tenant_id
    AND ol.lot_id       = (elem->>'lot_id')::uuid
    AND ol.role         = COALESCE(NULLIF(elem->>'role', ''), 'traite');

  -- ── 3. operation_contenants ───────────────────────────────────
  DELETE FROM public.operation_contenants
    WHERE operation_id = v_id
      AND tenant_id    = p_tenant_id
      AND NOT EXISTS (
        SELECT 1
        FROM   jsonb_array_elements(p_contenants) AS elem
        WHERE  (elem->>'contenant_id') IS NOT NULL
          AND  (elem->>'contenant_id')::uuid = operation_contenants.contenant_id
          AND  elem->>'role'                  = operation_contenants.role
      );

  INSERT INTO public.operation_contenants (operation_id, contenant_id, role, volume_hl, tenant_id)
  SELECT
    v_id,
    (elem->>'contenant_id')::uuid,
    COALESCE(NULLIF(elem->>'role', ''), 'implique'),
    NULLIF(elem->>'volume_hl', '')::numeric,
    p_tenant_id
  FROM jsonb_array_elements(p_contenants) AS elem
  WHERE (elem->>'contenant_id') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.operation_contenants oc2
      WHERE  oc2.operation_id  = v_id
        AND  oc2.tenant_id     = p_tenant_id
        AND  oc2.contenant_id  = (elem->>'contenant_id')::uuid
        AND  oc2.role          = COALESCE(NULLIF(elem->>'role', ''), 'implique')
    );

  UPDATE public.operation_contenants oc
    SET volume_hl = NULLIF(elem->>'volume_hl', '')::numeric
  FROM jsonb_array_elements(p_contenants) AS elem
  WHERE oc.operation_id = v_id
    AND oc.tenant_id    = p_tenant_id
    AND oc.contenant_id = (elem->>'contenant_id')::uuid
    AND oc.role         = COALESCE(NULLIF(elem->>'role', ''), 'implique');

  -- ── 4. operation_produits ─────────────────────────────────────
  DELETE FROM public.operation_produits
    WHERE operation_id = v_id
      AND tenant_id    = p_tenant_id
      AND produit_lot_id NOT IN (
        SELECT (elem->>'produit_lot_id')::uuid
        FROM   jsonb_array_elements(p_produits) AS elem
        WHERE  (elem->>'produit_lot_id') IS NOT NULL
      );

  INSERT INTO public.operation_produits (operation_id, produit_lot_id, quantite, unite, tenant_id)
  SELECT
    v_id,
    (elem->>'produit_lot_id')::uuid,
    NULLIF(elem->>'quantite', '')::numeric,
    NULLIF(elem->>'unite', ''),
    p_tenant_id
  FROM jsonb_array_elements(p_produits) AS elem
  WHERE (elem->>'produit_lot_id') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.operation_produits op2
      WHERE  op2.operation_id   = v_id
        AND  op2.tenant_id      = p_tenant_id
        AND  op2.produit_lot_id = (elem->>'produit_lot_id')::uuid
    );

  UPDATE public.operation_produits op
    SET quantite = NULLIF(elem->>'quantite', '')::numeric,
        unite    = NULLIF(elem->>'unite',    '')
  FROM jsonb_array_elements(p_produits) AS elem
  WHERE op.operation_id   = v_id
    AND op.tenant_id      = p_tenant_id
    AND op.produit_lot_id = (elem->>'produit_lot_id')::uuid;

  -- ── 5. Effets physiques + vérification + décrémentation stock ─
  IF v_apply THEN
    v_type := CASE
      WHEN v_is_new THEN p_op->>'type_operation'
      ELSE COALESCE(
             NULLIF(p_op->>'type_operation', ''),
             (SELECT type_operation FROM public.operations WHERE id = v_id AND tenant_id = p_tenant_id)
           )
    END;

    PERFORM public._wb3_apply_op_effects(p_tenant_id, v_type, p_lots, p_contenants, v_id);

    -- Vérification stock puis décrémentation.
    -- SELECT ... FOR UPDATE : sérialise les appels concurrents sur le même lot produit.
    -- L'idempotence est garantie par v_apply = true une seule fois par opération.
    FOR v_plid, v_qty IN
      SELECT (elem->>'produit_lot_id')::uuid,
             NULLIF(elem->>'quantite', '')::numeric
      FROM   jsonb_array_elements(p_produits) AS elem
      WHERE  (elem->>'produit_lot_id') IS NOT NULL
    LOOP
      IF v_qty IS NOT NULL AND v_qty > 0 THEN

        SELECT quantite_actuelle INTO v_stock
        FROM   public.produits_lots
        WHERE  id = v_plid AND tenant_id = p_tenant_id
        FOR UPDATE;

        IF NOT FOUND THEN
          RAISE EXCEPTION
            'Stock produit introuvable — produit lot (id=%). '
            'Vérifiez que le lot de produit existe et appartient au tenant.',
            v_plid;
        END IF;

        IF v_qty > COALESCE(v_stock, 0) THEN
          RAISE EXCEPTION
            'Stock insuffisant — produit lot (id=%) : '
            'quantité demandée %, stock disponible %.',
            v_plid, v_qty, COALESCE(v_stock, 0);
        END IF;

        UPDATE public.produits_lots
        SET    quantite_actuelle = quantite_actuelle - v_qty
        WHERE  id = v_plid AND tenant_id = p_tenant_id;

      END IF;
    END LOOP;

    -- Horodatage d'application
    UPDATE public.operations SET
      meta = COALESCE(meta, '{}') ||
             jsonb_build_object('effects_applied_at',
               to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
    WHERE  id = v_id AND tenant_id = p_tenant_id;
  END IF;

  -- ── 6. Filiation assemblage (cas résiduel pré-037) ────────────
  IF NOT v_apply AND NOT v_is_new AND v_old_statut = 'realise' THEN
    v_type := COALESCE(
      NULLIF(p_op->>'type_operation', ''),
      (SELECT type_operation FROM public.operations WHERE id = v_id AND tenant_id = p_tenant_id)
    );
    IF v_type = 'assemblage' THEN
      DELETE FROM public.lot_filiation
      WHERE  operation_id = v_id
        AND  source_type  = 'assemblage'
        AND  tenant_id    = p_tenant_id;

      INSERT INTO public.lot_filiation
        (tenant_id, lot_id, parent_id, volume_hl, operation_id, source_type)
      SELECT
        p_tenant_id,
        (d.elem->>'lot_id')::uuid,
        (s.elem->>'lot_id')::uuid,
        NULLIF(s.elem->>'volume_hl', '')::numeric,
        v_id,
        'assemblage'
      FROM  jsonb_array_elements(p_lots) d(elem)
      CROSS JOIN jsonb_array_elements(p_lots) s(elem)
      WHERE (d.elem->>'lot_id') IS NOT NULL
        AND (s.elem->>'lot_id') IS NOT NULL
        AND  d.elem->>'role' = 'destination'
        AND  s.elem->>'role' = 'source';
    END IF;
  END IF;

  RETURN v_id;
END;
$$;


--
-- Name: FUNCTION wb3_save_operation_graph(p_tenant_id uuid, p_op_id uuid, p_op jsonb, p_lots jsonb, p_contenants jsonb, p_produits jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.wb3_save_operation_graph(p_tenant_id uuid, p_op_id uuid, p_op jsonb, p_lots jsonb, p_contenants jsonb, p_produits jsonb) IS 'v8 — SECURITY DEFINER. Point d''entrée unique pour créer ou modifier une opération. Gère l''upsert, les verrous métier, les effets physiques (via _wb3_apply_op_effects), la vérification et la décrémentation du stock produit.';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ajustements_volume; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ajustements_volume (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    operation_id uuid,
    type_operation text NOT NULL,
    lot_id uuid NOT NULL,
    contenant_id uuid,
    volume_avant_hl numeric(10,3) NOT NULL,
    volume_apres_hl numeric(10,3) NOT NULL,
    delta_hl numeric(10,3) GENERATED ALWAYS AS ((volume_apres_hl - volume_avant_hl)) STORED,
    delta_pct numeric(8,4),
    motif text,
    operateur text,
    date_operation date NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE ajustements_volume; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ajustements_volume IS 'Journal d''audit des ajustements de volume cave : ouillage, pertes, corrections jauge, etc.';


--
-- Name: COLUMN ajustements_volume.delta_hl; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ajustements_volume.delta_hl IS 'Delta calculé automatiquement (volume_apres - volume_avant)';


--
-- Name: COLUMN ajustements_volume.delta_pct; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ajustements_volume.delta_pct IS 'Pourcentage d''écart sur le volume de référence';


--
-- Name: COLUMN ajustements_volume.motif; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ajustements_volume.motif IS 'Motif court obligatoire. Pour écarts > 2%, la justification complète est dans notes de l''opération liée.';


--
-- Name: analyses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analyses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    lot_id uuid,
    contenant_id uuid,
    date_analyse date DEFAULT CURRENT_DATE NOT NULL,
    operateur text,
    so2_libre numeric(6,1),
    so2_total numeric(6,1),
    ph numeric(4,2),
    ta numeric(5,2),
    acidite_volatile numeric(5,2),
    tav numeric(5,2),
    sucres_residuels numeric(7,2),
    densite numeric(7,4),
    acide_malique numeric(5,2),
    co2 numeric(5,2),
    turbidite numeric(7,1),
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    gf_neg5 numeric(6,2),
    gf_pos5 numeric(6,2),
    so2_actif numeric(6,2),
    acide_lactique numeric(5,2),
    extra_params jsonb,
    archived_at timestamp with time zone
);

ALTER TABLE ONLY public.analyses REPLICA IDENTITY FULL;


--
-- Name: COLUMN analyses.archived_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.analyses.archived_at IS 'Soft-delete : NULL=actif, timestamp=archivé. Ligne conservée pour traçabilité.';


--
-- Name: apports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.apports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    numero text,
    date_apport date DEFAULT CURRENT_DATE NOT NULL,
    heure_apport time without time zone,
    lot_id uuid,
    contenant_id uuid,
    poids_kg numeric(12,2),
    volume_hl numeric(10,2),
    apporteur text,
    provenance text,
    cepage_libre text,
    millesime integer,
    degre_probable numeric(5,2),
    tat numeric(6,2),
    ph numeric(4,2),
    temperature_c numeric(5,2),
    statut text DEFAULT 'recu'::text NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_at timestamp with time zone,
    CONSTRAINT apports_millesime_check CHECK (((millesime >= 1900) AND (millesime <= 2100))),
    CONSTRAINT apports_statut_check CHECK ((statut = ANY (ARRAY['recu'::text, 'annule'::text])))
);

ALTER TABLE ONLY public.apports REPLICA IDENTITY FULL;


--
-- Name: COLUMN apports.archived_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.apports.archived_at IS 'Soft-delete : NULL=actif, timestamp=archivé. Ligne conservée pour traçabilité.';


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
)
PARTITION BY RANGE (created_at);


--
-- Name: TABLE audit_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.audit_log IS 'Journal d''audit applicatif partitionné par mois. Écrit uniquement par le trigger _wb3_audit (SECURITY DEFINER). Lecture réservée aux admins.';


--
-- Name: audit_log_2025_01; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2025_01 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2025_02; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2025_02 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2025_03; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2025_03 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2025_04; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2025_04 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2025_05; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2025_05 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2025_06; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2025_06 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2025_07; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2025_07 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2025_08; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2025_08 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2025_09; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2025_09 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2025_10; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2025_10 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2025_11; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2025_11 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2025_12; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2025_12 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2026_01; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2026_01 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2026_02; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2026_02 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2026_03; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2026_03 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2026_04; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2026_04 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2026_05; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2026_05 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2026_06; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2026_06 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2026_07; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2026_07 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2026_08; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2026_08 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2026_09; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2026_09 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2026_10; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2026_10 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2026_11; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2026_11 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2026_12; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2026_12 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2027_01; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2027_01 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2027_02; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2027_02 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2027_03; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2027_03 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2027_04; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2027_04 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2027_05; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2027_05 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2027_06; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2027_06 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2027_07; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2027_07 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2027_08; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2027_08 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2027_09; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2027_09 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2027_10; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2027_10 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2027_11; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2027_11 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2027_12; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2027_12 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2028_01; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2028_01 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2028_02; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2028_02 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2028_03; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2028_03 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2028_04; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2028_04 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2028_05; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2028_05 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2028_06; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2028_06 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2028_07; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2028_07 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2028_08; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2028_08 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2028_09; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2028_09 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2028_10; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2028_10 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2028_11; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2028_11 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_2028_12; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2028_12 (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_default; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_default (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    actor uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.audit_log ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: cepages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cepages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    nom text NOT NULL,
    couleur text DEFAULT 'rouge'::text NOT NULL,
    ordre integer DEFAULT 0 NOT NULL,
    actif boolean DEFAULT true NOT NULL,
    CONSTRAINT cepages_couleur_check CHECK ((couleur = ANY (ARRAY['rouge'::text, 'blanc'::text, 'rose'::text, 'gris'::text])))
);


--
-- Name: contenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    nom text NOT NULL,
    type text NOT NULL,
    capacite_hl numeric NOT NULL,
    localisation text,
    actif boolean DEFAULT true,
    tags text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    materiau text,
    marque text,
    annee_mise_service integer,
    prix_achat numeric,
    travee_id uuid,
    tonnelier text,
    origine_bois text,
    chauffe text,
    specificites text,
    archived_at timestamp with time zone,
    CONSTRAINT contenants_annee_mise_service_check CHECK (((annee_mise_service IS NULL) OR ((annee_mise_service >= 1900) AND (annee_mise_service <= 2100)))),
    CONSTRAINT contenants_capacite_hl_check CHECK ((capacite_hl > (0)::numeric)),
    CONSTRAINT contenants_chauffe_check CHECK (((chauffe IS NULL) OR (chauffe = ANY (ARRAY['legere'::text, 'moyenne'::text, 'forte'::text, 'extra_forte'::text])))),
    CONSTRAINT contenants_prix_achat_check CHECK (((prix_achat IS NULL) OR (prix_achat >= (0)::numeric))),
    CONSTRAINT contenants_type_check CHECK ((type = ANY (ARRAY['cuve'::text, 'foudre'::text, 'fut'::text, 'pressoir'::text])))
);


--
-- Name: COLUMN contenants.archived_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contenants.archived_at IS 'Soft-delete : NULL=actif, timestamp=archivé. Ligne conservée pour traçabilité.';


--
-- Name: fiches_travail; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fiches_travail (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    date_fiche date NOT NULL,
    caviste_id uuid,
    statut text DEFAULT 'brouillon'::text,
    signature_oenologue uuid,
    signature_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT fiches_travail_statut_check CHECK ((statut = ANY (ARRAY['brouillon'::text, 'validee'::text])))
);


--
-- Name: lineage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lineage (
    lot_parent_id uuid NOT NULL,
    lot_enfant_id uuid NOT NULL,
    operation_id uuid
);


--
-- Name: lot_cepages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lot_cepages (
    lot_id uuid NOT NULL,
    cepage_id uuid NOT NULL,
    pourcentage numeric(5,2),
    CONSTRAINT lot_cepages_pourcentage_check CHECK (((pourcentage >= (0)::numeric) AND (pourcentage <= (100)::numeric)))
);


--
-- Name: lot_contenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lot_contenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lot_id uuid NOT NULL,
    contenant_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    volume_hl numeric(10,2),
    date_affectation date DEFAULT CURRENT_DATE,
    notes text
);

ALTER TABLE ONLY public.lot_contenants REPLICA IDENTITY FULL;


--
-- Name: lot_contenants_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lot_contenants_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    lot_id uuid NOT NULL,
    contenant_id uuid,
    contenant_nom_snap text DEFAULT ''::text NOT NULL,
    volume_hl numeric(10,2),
    type_evt text NOT NULL,
    date_evt timestamp with time zone DEFAULT now() NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lot_contenants_history_type_evt_check CHECK ((type_evt = ANY (ARRAY['entree'::text, 'sortie'::text, 'backfill'::text])))
);


--
-- Name: TABLE lot_contenants_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lot_contenants_history IS 'Parcours cuves d''un lot : chaque ligne = un événement entree/sortie déclenché par trigger.';


--
-- Name: lot_filiation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lot_filiation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    lot_id uuid NOT NULL,
    parent_id uuid NOT NULL,
    volume_hl numeric(10,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    operation_id uuid,
    source_type text DEFAULT 'manual'::text NOT NULL,
    CONSTRAINT lot_filiation_no_self CHECK ((lot_id <> parent_id)),
    CONSTRAINT lot_filiation_source_type_check CHECK ((source_type = ANY (ARRAY['manual'::text, 'assemblage'::text])))
);

ALTER TABLE ONLY public.lot_filiation REPLICA IDENTITY FULL;


--
-- Name: TABLE lot_filiation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lot_filiation IS 'Lien explicite entre un lot dérivé (lot_id) et ses lots sources (parent_id). Volume = quantité prélevée du parent.';


--
-- Name: COLUMN lot_filiation.operation_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_filiation.operation_id IS 'Opération d''assemblage qui a créé ce lien (NULL = lien manuel).';


--
-- Name: COLUMN lot_filiation.source_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_filiation.source_type IS 'manual = créé par l''utilisateur | assemblage = créé automatiquement par une opération.';


--
-- Name: lot_mouvements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lot_mouvements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    operation_id uuid NOT NULL,
    type_operation text NOT NULL,
    lot_id uuid NOT NULL,
    contenant_source_id uuid,
    contenant_dest_id uuid,
    volume_hl numeric(10,4),
    date_mouvement date NOT NULL,
    sens text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lot_mouvements_sens_check CHECK ((sens = ANY (ARRAY['transfert'::text, 'sortie'::text, 'entree'::text, 'sortie_definitive'::text])))
);

ALTER TABLE ONLY public.lot_mouvements REPLICA IDENTITY FULL;


--
-- Name: TABLE lot_mouvements; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lot_mouvements IS 'Journal immuable des mouvements physiques de volumes. Écrit par _wb3_apply_op_effects à chaque opération réalisée. Idempotent via DELETE/re-INSERT par operation_id.';


--
-- Name: COLUMN lot_mouvements.volume_hl; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_mouvements.volume_hl IS 'Volume effectivement déplacé. NULL = transfert total (tout le contenu du contenant source). Capturé avant la modification de lot_contenants.';


--
-- Name: COLUMN lot_mouvements.sens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_mouvements.sens IS 'transfert=même lot src→dst ; sortie=lot source assemblage ; entree=lot destination assemblage ; sortie_definitive=mise_en_bouteille ou sortie_lot';


--
-- Name: lots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    nom text NOT NULL,
    numero text,
    millesime integer,
    couleur text,
    statut text DEFAULT 'vendange'::text NOT NULL,
    volume_initial_hl numeric(10,2),
    volume_actuel_hl numeric(10,2),
    date_entree date,
    date_sortie date,
    notes text,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    actif boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    archived boolean DEFAULT false NOT NULL,
    appellation text,
    destination text,
    type_lot text,
    numero_lot text,
    CONSTRAINT lots_couleur_check CHECK ((couleur = ANY (ARRAY['rouge'::text, 'blanc'::text, 'rose'::text, 'gris'::text]))),
    CONSTRAINT lots_millesime_check CHECK (((millesime >= 1900) AND (millesime <= 2100))),
    CONSTRAINT lots_statut_check CHECK ((statut = ANY (ARRAY['vendange'::text, 'mout'::text, 'mout_stabule'::text, 'mout_debourbe'::text, 'fa'::text, 'vin'::text, 'fml'::text, 'elevage'::text, 'vin_filtre'::text, 'pre_mise'::text, 'conditionne'::text, 'sorti'::text])))
);


--
-- Name: COLUMN lots.appellation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lots.appellation IS 'Appellation d''origine (ex: AOC Champagne, IGP…)';


--
-- Name: COLUMN lots.destination; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lots.destination IS 'Destination commerciale du lot';


--
-- Name: COLUMN lots.type_lot; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lots.type_lot IS 'Type de matière (vendange, moût, jus, vin, base mousse…)';


--
-- Name: COLUMN lots.numero_lot; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lots.numero_lot IS 'Numéro de lot unique par cave : L-YYYY-JJJ-CÉP-COUL-NN (ex: L-2024-271-CAB-R-01)';


--
-- Name: memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.memberships (
    user_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    role text DEFAULT 'caviste'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT memberships_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'oenologue'::text, 'caviste'::text])))
);


--
-- Name: operation_contenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operation_contenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operation_id uuid NOT NULL,
    contenant_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    role text DEFAULT 'implique'::text NOT NULL,
    volume_hl numeric(10,2),
    notes text,
    CONSTRAINT operation_contenants_role_check CHECK ((role = ANY (ARRAY['source'::text, 'destination'::text, 'implique'::text])))
);


--
-- Name: operation_lots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operation_lots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operation_id uuid NOT NULL,
    lot_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    role text DEFAULT 'traite'::text NOT NULL,
    volume_hl numeric(10,2),
    notes text,
    CONSTRAINT operation_lots_role_check CHECK ((role = ANY (ARRAY['source'::text, 'destination'::text, 'traite'::text])))
);


--
-- Name: operation_produits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operation_produits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operation_id uuid NOT NULL,
    produit_lot_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    quantite numeric(12,4),
    unite text,
    notes text
);


--
-- Name: operations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    type_operation text NOT NULL,
    date_operation date DEFAULT CURRENT_DATE NOT NULL,
    heure_operation time without time zone,
    reference text,
    volume_hl numeric(10,2),
    quantite numeric(12,3),
    unite text,
    operateur text,
    statut text DEFAULT 'realise'::text NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT operations_statut_check CHECK ((statut = ANY (ARRAY['planifie'::text, 'realise'::text, 'annule'::text])))
);


--
-- Name: produits_catalogue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.produits_catalogue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    nom text NOT NULL,
    categorie text DEFAULT 'autre'::text NOT NULL,
    sous_categorie text,
    fournisseur text,
    reference_fournisseur text,
    dose_min numeric(10,4),
    dose_max numeric(10,4),
    dose_unite text,
    unite_stock text,
    concentration numeric(10,4),
    concentration_libelle text,
    notes text,
    actif boolean DEFAULT true NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_at timestamp with time zone
);


--
-- Name: COLUMN produits_catalogue.archived_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.produits_catalogue.archived_at IS 'Soft-delete : NULL=actif, timestamp=archivé. Ligne conservée pour traçabilité.';


--
-- Name: produits_lots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.produits_lots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    produit_id uuid NOT NULL,
    numero_lot text,
    dluo date,
    quantite_initiale numeric(12,4),
    quantite_actuelle numeric(12,4),
    unite text,
    date_reception date,
    fournisseur text,
    notes text,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_at timestamp with time zone
);


--
-- Name: COLUMN produits_lots.archived_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.produits_lots.archived_at IS 'Soft-delete : NULL=actif, timestamp=archivé. Ligne conservée pour traçabilité.';


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nom text NOT NULL,
    slug text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: travees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.travees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    nom text NOT NULL,
    ordre integer DEFAULT 0 NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_preferences (
    user_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    module text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: v_ajustements_detail; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ajustements_detail AS
 SELECT av.id,
    av.tenant_id,
    av.operation_id,
    av.type_operation,
    av.lot_id,
    av.contenant_id,
    av.volume_avant_hl,
    av.volume_apres_hl,
    av.delta_hl,
    av.delta_pct,
    av.motif,
    av.operateur,
    av.date_operation,
    av.created_at,
    l.nom AS lot_nom,
    l.couleur AS lot_couleur,
    l.millesime AS lot_millesime,
    l.statut AS lot_statut,
    c.nom AS contenant_nom,
    c.type AS contenant_type,
    op.reference AS operation_reference,
    op.notes AS operation_notes
   FROM (((public.ajustements_volume av
     LEFT JOIN public.lots l ON ((l.id = av.lot_id)))
     LEFT JOIN public.contenants c ON ((c.id = av.contenant_id)))
     LEFT JOIN public.operations op ON ((op.id = av.operation_id)));


--
-- Name: v_apports_par_lot; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_apports_par_lot AS
 SELECT a.lot_id,
    l.nom AS lot_nom,
    l.millesime AS lot_millesime,
    l.couleur AS lot_couleur,
    count(*) AS nb_apports,
    sum(a.poids_kg) AS total_poids_kg,
    sum(a.volume_hl) AS total_volume_hl,
    min(a.date_apport) AS premiere_entree,
    max(a.date_apport) AS derniere_entree
   FROM (public.apports a
     LEFT JOIN public.lots l ON ((l.id = a.lot_id)))
  WHERE (a.statut = 'recu'::text)
  GROUP BY a.lot_id, l.nom, l.millesime, l.couleur;


--
-- Name: v_consommation_produits; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_consommation_produits AS
 SELECT op.id,
    op.tenant_id,
    op.operation_id,
    o.type_operation,
    o.date_operation,
    op.produit_lot_id,
    pc.nom AS produit_nom,
    pc.categorie,
    pl.numero_lot,
    pl.dluo,
    op.quantite,
    COALESCE(op.unite, pl.unite, pc.unite_stock) AS unite,
    op.notes,
    o.volume_hl,
    pc.concentration,
    pc.dose_max,
        CASE
            WHEN ((op.quantite IS NOT NULL) AND (pc.concentration IS NOT NULL)) THEN (op.quantite * pc.concentration)
            ELSE NULL::numeric
        END AS g_actif,
        CASE
            WHEN ((op.quantite IS NOT NULL) AND (pc.concentration IS NOT NULL) AND (o.volume_hl IS NOT NULL) AND (o.volume_hl > (0)::numeric)) THEN (((op.quantite * pc.concentration) / (o.volume_hl * 100.0)) * 1000.0)
            ELSE NULL::numeric
        END AS dose_mg_l
   FROM (((public.operation_produits op
     JOIN public.produits_lots pl ON ((pl.id = op.produit_lot_id)))
     JOIN public.produits_catalogue pc ON ((pc.id = pl.produit_id)))
     JOIN public.operations o ON ((o.id = op.operation_id)));


--
-- Name: VIEW v_consommation_produits; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_consommation_produits IS 'Consommations produits par opération avec calculs œnologiques. g_actif = quantite × concentration (g actif/unité). dose_mg_l = (g_actif / volume_hl × 100) × 1000. NULL si données manquantes.';


--
-- Name: v_journal_operations; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_journal_operations AS
 SELECT id,
    tenant_id,
    type_operation,
    date_operation,
    heure_operation,
    reference,
    volume_hl,
    quantite,
    unite,
    operateur,
    statut,
    notes,
    meta,
    created_at,
    ( SELECT string_agg(l.nom, ', '::text ORDER BY l.nom) AS string_agg
           FROM (public.operation_lots ol
             JOIN public.lots l ON ((l.id = ol.lot_id)))
          WHERE (ol.operation_id = o.id)) AS lots_noms,
    ( SELECT string_agg(c.nom, ', '::text ORDER BY c.nom) AS string_agg
           FROM (public.operation_contenants oc
             JOIN public.contenants c ON ((c.id = oc.contenant_id)))
          WHERE (oc.operation_id = o.id)) AS contenants_noms
   FROM public.operations o;


--
-- Name: v_stock_produits; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_stock_produits AS
 SELECT pl.id,
    pl.tenant_id,
    pc.nom AS produit_nom,
    pc.categorie,
    pc.fournisseur AS fournisseur_cat,
    COALESCE(pl.fournisseur, pc.fournisseur) AS fournisseur,
    pl.numero_lot,
    pl.dluo,
    pl.quantite_initiale,
    pl.quantite_actuelle,
    pl.unite,
    pl.date_reception,
    pl.notes,
        CASE
            WHEN (pl.dluo IS NULL) THEN 'inconnu'::text
            WHEN (pl.dluo < CURRENT_DATE) THEN 'expire'::text
            WHEN (pl.dluo <= (CURRENT_DATE + '30 days'::interval)) THEN 'alerte'::text
            ELSE 'ok'::text
        END AS statut_dluo,
    pl.produit_id,
    pl.created_at
   FROM (public.produits_lots pl
     JOIN public.produits_catalogue pc ON ((pc.id = pl.produit_id)));


--
-- Name: audit_log_2025_01; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2025_01 FOR VALUES FROM ('2025-01-01 00:00:00+00') TO ('2025-02-01 00:00:00+00');


--
-- Name: audit_log_2025_02; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2025_02 FOR VALUES FROM ('2025-02-01 00:00:00+00') TO ('2025-03-01 00:00:00+00');


--
-- Name: audit_log_2025_03; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2025_03 FOR VALUES FROM ('2025-03-01 00:00:00+00') TO ('2025-04-01 00:00:00+00');


--
-- Name: audit_log_2025_04; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2025_04 FOR VALUES FROM ('2025-04-01 00:00:00+00') TO ('2025-05-01 00:00:00+00');


--
-- Name: audit_log_2025_05; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2025_05 FOR VALUES FROM ('2025-05-01 00:00:00+00') TO ('2025-06-01 00:00:00+00');


--
-- Name: audit_log_2025_06; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2025_06 FOR VALUES FROM ('2025-06-01 00:00:00+00') TO ('2025-07-01 00:00:00+00');


--
-- Name: audit_log_2025_07; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2025_07 FOR VALUES FROM ('2025-07-01 00:00:00+00') TO ('2025-08-01 00:00:00+00');


--
-- Name: audit_log_2025_08; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2025_08 FOR VALUES FROM ('2025-08-01 00:00:00+00') TO ('2025-09-01 00:00:00+00');


--
-- Name: audit_log_2025_09; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2025_09 FOR VALUES FROM ('2025-09-01 00:00:00+00') TO ('2025-10-01 00:00:00+00');


--
-- Name: audit_log_2025_10; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2025_10 FOR VALUES FROM ('2025-10-01 00:00:00+00') TO ('2025-11-01 00:00:00+00');


--
-- Name: audit_log_2025_11; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2025_11 FOR VALUES FROM ('2025-11-01 00:00:00+00') TO ('2025-12-01 00:00:00+00');


--
-- Name: audit_log_2025_12; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2025_12 FOR VALUES FROM ('2025-12-01 00:00:00+00') TO ('2026-01-01 00:00:00+00');


--
-- Name: audit_log_2026_01; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2026_01 FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-02-01 00:00:00+00');


--
-- Name: audit_log_2026_02; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2026_02 FOR VALUES FROM ('2026-02-01 00:00:00+00') TO ('2026-03-01 00:00:00+00');


--
-- Name: audit_log_2026_03; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2026_03 FOR VALUES FROM ('2026-03-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');


--
-- Name: audit_log_2026_04; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2026_04 FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-05-01 00:00:00+00');


--
-- Name: audit_log_2026_05; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2026_05 FOR VALUES FROM ('2026-05-01 00:00:00+00') TO ('2026-06-01 00:00:00+00');


--
-- Name: audit_log_2026_06; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2026_06 FOR VALUES FROM ('2026-06-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');


--
-- Name: audit_log_2026_07; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2026_07 FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-08-01 00:00:00+00');


--
-- Name: audit_log_2026_08; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2026_08 FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');


--
-- Name: audit_log_2026_09; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2026_09 FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');


--
-- Name: audit_log_2026_10; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2026_10 FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2026-11-01 00:00:00+00');


--
-- Name: audit_log_2026_11; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2026_11 FOR VALUES FROM ('2026-11-01 00:00:00+00') TO ('2026-12-01 00:00:00+00');


--
-- Name: audit_log_2026_12; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2026_12 FOR VALUES FROM ('2026-12-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');


--
-- Name: audit_log_2027_01; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2027_01 FOR VALUES FROM ('2027-01-01 00:00:00+00') TO ('2027-02-01 00:00:00+00');


--
-- Name: audit_log_2027_02; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2027_02 FOR VALUES FROM ('2027-02-01 00:00:00+00') TO ('2027-03-01 00:00:00+00');


--
-- Name: audit_log_2027_03; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2027_03 FOR VALUES FROM ('2027-03-01 00:00:00+00') TO ('2027-04-01 00:00:00+00');


--
-- Name: audit_log_2027_04; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2027_04 FOR VALUES FROM ('2027-04-01 00:00:00+00') TO ('2027-05-01 00:00:00+00');


--
-- Name: audit_log_2027_05; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2027_05 FOR VALUES FROM ('2027-05-01 00:00:00+00') TO ('2027-06-01 00:00:00+00');


--
-- Name: audit_log_2027_06; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2027_06 FOR VALUES FROM ('2027-06-01 00:00:00+00') TO ('2027-07-01 00:00:00+00');


--
-- Name: audit_log_2027_07; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2027_07 FOR VALUES FROM ('2027-07-01 00:00:00+00') TO ('2027-08-01 00:00:00+00');


--
-- Name: audit_log_2027_08; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2027_08 FOR VALUES FROM ('2027-08-01 00:00:00+00') TO ('2027-09-01 00:00:00+00');


--
-- Name: audit_log_2027_09; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2027_09 FOR VALUES FROM ('2027-09-01 00:00:00+00') TO ('2027-10-01 00:00:00+00');


--
-- Name: audit_log_2027_10; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2027_10 FOR VALUES FROM ('2027-10-01 00:00:00+00') TO ('2027-11-01 00:00:00+00');


--
-- Name: audit_log_2027_11; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2027_11 FOR VALUES FROM ('2027-11-01 00:00:00+00') TO ('2027-12-01 00:00:00+00');


--
-- Name: audit_log_2027_12; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2027_12 FOR VALUES FROM ('2027-12-01 00:00:00+00') TO ('2028-01-01 00:00:00+00');


--
-- Name: audit_log_2028_01; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2028_01 FOR VALUES FROM ('2028-01-01 00:00:00+00') TO ('2028-02-01 00:00:00+00');


--
-- Name: audit_log_2028_02; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2028_02 FOR VALUES FROM ('2028-02-01 00:00:00+00') TO ('2028-03-01 00:00:00+00');


--
-- Name: audit_log_2028_03; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2028_03 FOR VALUES FROM ('2028-03-01 00:00:00+00') TO ('2028-04-01 00:00:00+00');


--
-- Name: audit_log_2028_04; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2028_04 FOR VALUES FROM ('2028-04-01 00:00:00+00') TO ('2028-05-01 00:00:00+00');


--
-- Name: audit_log_2028_05; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2028_05 FOR VALUES FROM ('2028-05-01 00:00:00+00') TO ('2028-06-01 00:00:00+00');


--
-- Name: audit_log_2028_06; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2028_06 FOR VALUES FROM ('2028-06-01 00:00:00+00') TO ('2028-07-01 00:00:00+00');


--
-- Name: audit_log_2028_07; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2028_07 FOR VALUES FROM ('2028-07-01 00:00:00+00') TO ('2028-08-01 00:00:00+00');


--
-- Name: audit_log_2028_08; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2028_08 FOR VALUES FROM ('2028-08-01 00:00:00+00') TO ('2028-09-01 00:00:00+00');


--
-- Name: audit_log_2028_09; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2028_09 FOR VALUES FROM ('2028-09-01 00:00:00+00') TO ('2028-10-01 00:00:00+00');


--
-- Name: audit_log_2028_10; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2028_10 FOR VALUES FROM ('2028-10-01 00:00:00+00') TO ('2028-11-01 00:00:00+00');


--
-- Name: audit_log_2028_11; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2028_11 FOR VALUES FROM ('2028-11-01 00:00:00+00') TO ('2028-12-01 00:00:00+00');


--
-- Name: audit_log_2028_12; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2028_12 FOR VALUES FROM ('2028-12-01 00:00:00+00') TO ('2029-01-01 00:00:00+00');


--
-- Name: audit_log_default; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_default DEFAULT;


--
-- Name: ajustements_volume ajustements_volume_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ajustements_volume
    ADD CONSTRAINT ajustements_volume_pkey PRIMARY KEY (id);


--
-- Name: analyses analyses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analyses
    ADD CONSTRAINT analyses_pkey PRIMARY KEY (id);


--
-- Name: apports apports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.apports
    ADD CONSTRAINT apports_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2025_01 audit_log_2025_01_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2025_01
    ADD CONSTRAINT audit_log_2025_01_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2025_02 audit_log_2025_02_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2025_02
    ADD CONSTRAINT audit_log_2025_02_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2025_03 audit_log_2025_03_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2025_03
    ADD CONSTRAINT audit_log_2025_03_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2025_04 audit_log_2025_04_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2025_04
    ADD CONSTRAINT audit_log_2025_04_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2025_05 audit_log_2025_05_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2025_05
    ADD CONSTRAINT audit_log_2025_05_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2025_06 audit_log_2025_06_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2025_06
    ADD CONSTRAINT audit_log_2025_06_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2025_07 audit_log_2025_07_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2025_07
    ADD CONSTRAINT audit_log_2025_07_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2025_08 audit_log_2025_08_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2025_08
    ADD CONSTRAINT audit_log_2025_08_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2025_09 audit_log_2025_09_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2025_09
    ADD CONSTRAINT audit_log_2025_09_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2025_10 audit_log_2025_10_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2025_10
    ADD CONSTRAINT audit_log_2025_10_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2025_11 audit_log_2025_11_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2025_11
    ADD CONSTRAINT audit_log_2025_11_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2025_12 audit_log_2025_12_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2025_12
    ADD CONSTRAINT audit_log_2025_12_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2026_01 audit_log_2026_01_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2026_01
    ADD CONSTRAINT audit_log_2026_01_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2026_02 audit_log_2026_02_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2026_02
    ADD CONSTRAINT audit_log_2026_02_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2026_03 audit_log_2026_03_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2026_03
    ADD CONSTRAINT audit_log_2026_03_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2026_04 audit_log_2026_04_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2026_04
    ADD CONSTRAINT audit_log_2026_04_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2026_05 audit_log_2026_05_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2026_05
    ADD CONSTRAINT audit_log_2026_05_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2026_06 audit_log_2026_06_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2026_06
    ADD CONSTRAINT audit_log_2026_06_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2026_07 audit_log_2026_07_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2026_07
    ADD CONSTRAINT audit_log_2026_07_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2026_08 audit_log_2026_08_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2026_08
    ADD CONSTRAINT audit_log_2026_08_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2026_09 audit_log_2026_09_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2026_09
    ADD CONSTRAINT audit_log_2026_09_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2026_10 audit_log_2026_10_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2026_10
    ADD CONSTRAINT audit_log_2026_10_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2026_11 audit_log_2026_11_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2026_11
    ADD CONSTRAINT audit_log_2026_11_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2026_12 audit_log_2026_12_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2026_12
    ADD CONSTRAINT audit_log_2026_12_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2027_01 audit_log_2027_01_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2027_01
    ADD CONSTRAINT audit_log_2027_01_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2027_02 audit_log_2027_02_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2027_02
    ADD CONSTRAINT audit_log_2027_02_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2027_03 audit_log_2027_03_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2027_03
    ADD CONSTRAINT audit_log_2027_03_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2027_04 audit_log_2027_04_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2027_04
    ADD CONSTRAINT audit_log_2027_04_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2027_05 audit_log_2027_05_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2027_05
    ADD CONSTRAINT audit_log_2027_05_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2027_06 audit_log_2027_06_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2027_06
    ADD CONSTRAINT audit_log_2027_06_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2027_07 audit_log_2027_07_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2027_07
    ADD CONSTRAINT audit_log_2027_07_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2027_08 audit_log_2027_08_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2027_08
    ADD CONSTRAINT audit_log_2027_08_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2027_09 audit_log_2027_09_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2027_09
    ADD CONSTRAINT audit_log_2027_09_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2027_10 audit_log_2027_10_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2027_10
    ADD CONSTRAINT audit_log_2027_10_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2027_11 audit_log_2027_11_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2027_11
    ADD CONSTRAINT audit_log_2027_11_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2027_12 audit_log_2027_12_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2027_12
    ADD CONSTRAINT audit_log_2027_12_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2028_01 audit_log_2028_01_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2028_01
    ADD CONSTRAINT audit_log_2028_01_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2028_02 audit_log_2028_02_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2028_02
    ADD CONSTRAINT audit_log_2028_02_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2028_03 audit_log_2028_03_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2028_03
    ADD CONSTRAINT audit_log_2028_03_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2028_04 audit_log_2028_04_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2028_04
    ADD CONSTRAINT audit_log_2028_04_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2028_05 audit_log_2028_05_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2028_05
    ADD CONSTRAINT audit_log_2028_05_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2028_06 audit_log_2028_06_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2028_06
    ADD CONSTRAINT audit_log_2028_06_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2028_07 audit_log_2028_07_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2028_07
    ADD CONSTRAINT audit_log_2028_07_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2028_08 audit_log_2028_08_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2028_08
    ADD CONSTRAINT audit_log_2028_08_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2028_09 audit_log_2028_09_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2028_09
    ADD CONSTRAINT audit_log_2028_09_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2028_10 audit_log_2028_10_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2028_10
    ADD CONSTRAINT audit_log_2028_10_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2028_11 audit_log_2028_11_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2028_11
    ADD CONSTRAINT audit_log_2028_11_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2028_12 audit_log_2028_12_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2028_12
    ADD CONSTRAINT audit_log_2028_12_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_default audit_log_default_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_default
    ADD CONSTRAINT audit_log_default_pkey PRIMARY KEY (id, created_at);


--
-- Name: cepages cepages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cepages
    ADD CONSTRAINT cepages_pkey PRIMARY KEY (id);


--
-- Name: cepages cepages_tenant_id_nom_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cepages
    ADD CONSTRAINT cepages_tenant_id_nom_key UNIQUE (tenant_id, nom);


--
-- Name: contenants contenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contenants
    ADD CONSTRAINT contenants_pkey PRIMARY KEY (id);


--
-- Name: contenants contenants_tenant_id_nom_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contenants
    ADD CONSTRAINT contenants_tenant_id_nom_key UNIQUE (tenant_id, nom);


--
-- Name: fiches_travail fiches_travail_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiches_travail
    ADD CONSTRAINT fiches_travail_pkey PRIMARY KEY (id);


--
-- Name: lineage lineage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lineage
    ADD CONSTRAINT lineage_pkey PRIMARY KEY (lot_parent_id, lot_enfant_id);


--
-- Name: lot_cepages lot_cepages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_cepages
    ADD CONSTRAINT lot_cepages_pkey PRIMARY KEY (lot_id, cepage_id);


--
-- Name: lot_contenants_history lot_contenants_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_contenants_history
    ADD CONSTRAINT lot_contenants_history_pkey PRIMARY KEY (id);


--
-- Name: lot_contenants lot_contenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_contenants
    ADD CONSTRAINT lot_contenants_pkey PRIMARY KEY (id);


--
-- Name: lot_filiation lot_filiation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_filiation
    ADD CONSTRAINT lot_filiation_pkey PRIMARY KEY (id);


--
-- Name: lot_mouvements lot_mouvements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_mouvements
    ADD CONSTRAINT lot_mouvements_pkey PRIMARY KEY (id);


--
-- Name: lots lots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT lots_pkey PRIMARY KEY (id);


--
-- Name: lots lots_tenant_id_nom_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT lots_tenant_id_nom_key UNIQUE (tenant_id, nom);


--
-- Name: memberships memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_pkey PRIMARY KEY (user_id, tenant_id);


--
-- Name: operation_contenants operation_contenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_contenants
    ADD CONSTRAINT operation_contenants_pkey PRIMARY KEY (id);


--
-- Name: operation_lots operation_lots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_lots
    ADD CONSTRAINT operation_lots_pkey PRIMARY KEY (id);


--
-- Name: operation_produits operation_produits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_produits
    ADD CONSTRAINT operation_produits_pkey PRIMARY KEY (id);


--
-- Name: operations operations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations
    ADD CONSTRAINT operations_pkey PRIMARY KEY (id);


--
-- Name: produits_catalogue produits_catalogue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produits_catalogue
    ADD CONSTRAINT produits_catalogue_pkey PRIMARY KEY (id);


--
-- Name: produits_lots produits_lots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produits_lots
    ADD CONSTRAINT produits_lots_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_slug_key UNIQUE (slug);


--
-- Name: travees travees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travees
    ADD CONSTRAINT travees_pkey PRIMARY KEY (id);


--
-- Name: travees travees_tenant_id_nom_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travees
    ADD CONSTRAINT travees_tenant_id_nom_key UNIQUE (tenant_id, nom);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (user_id, tenant_id, module);


--
-- Name: idx_audit_record; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_record ON ONLY public.audit_log USING btree (record_id);


--
-- Name: audit_log_2025_01_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_01_record_id_idx ON public.audit_log_2025_01 USING btree (record_id);


--
-- Name: idx_audit_tenant_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_tenant_date ON ONLY public.audit_log USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2025_01_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_01_tenant_id_created_at_idx ON public.audit_log_2025_01 USING btree (tenant_id, created_at DESC);


--
-- Name: idx_audit_table; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_table ON ONLY public.audit_log USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2025_01_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_01_tenant_id_table_name_created_at_idx ON public.audit_log_2025_01 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2025_02_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_02_record_id_idx ON public.audit_log_2025_02 USING btree (record_id);


--
-- Name: audit_log_2025_02_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_02_tenant_id_created_at_idx ON public.audit_log_2025_02 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2025_02_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_02_tenant_id_table_name_created_at_idx ON public.audit_log_2025_02 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2025_03_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_03_record_id_idx ON public.audit_log_2025_03 USING btree (record_id);


--
-- Name: audit_log_2025_03_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_03_tenant_id_created_at_idx ON public.audit_log_2025_03 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2025_03_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_03_tenant_id_table_name_created_at_idx ON public.audit_log_2025_03 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2025_04_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_04_record_id_idx ON public.audit_log_2025_04 USING btree (record_id);


--
-- Name: audit_log_2025_04_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_04_tenant_id_created_at_idx ON public.audit_log_2025_04 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2025_04_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_04_tenant_id_table_name_created_at_idx ON public.audit_log_2025_04 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2025_05_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_05_record_id_idx ON public.audit_log_2025_05 USING btree (record_id);


--
-- Name: audit_log_2025_05_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_05_tenant_id_created_at_idx ON public.audit_log_2025_05 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2025_05_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_05_tenant_id_table_name_created_at_idx ON public.audit_log_2025_05 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2025_06_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_06_record_id_idx ON public.audit_log_2025_06 USING btree (record_id);


--
-- Name: audit_log_2025_06_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_06_tenant_id_created_at_idx ON public.audit_log_2025_06 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2025_06_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_06_tenant_id_table_name_created_at_idx ON public.audit_log_2025_06 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2025_07_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_07_record_id_idx ON public.audit_log_2025_07 USING btree (record_id);


--
-- Name: audit_log_2025_07_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_07_tenant_id_created_at_idx ON public.audit_log_2025_07 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2025_07_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_07_tenant_id_table_name_created_at_idx ON public.audit_log_2025_07 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2025_08_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_08_record_id_idx ON public.audit_log_2025_08 USING btree (record_id);


--
-- Name: audit_log_2025_08_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_08_tenant_id_created_at_idx ON public.audit_log_2025_08 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2025_08_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_08_tenant_id_table_name_created_at_idx ON public.audit_log_2025_08 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2025_09_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_09_record_id_idx ON public.audit_log_2025_09 USING btree (record_id);


--
-- Name: audit_log_2025_09_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_09_tenant_id_created_at_idx ON public.audit_log_2025_09 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2025_09_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_09_tenant_id_table_name_created_at_idx ON public.audit_log_2025_09 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2025_10_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_10_record_id_idx ON public.audit_log_2025_10 USING btree (record_id);


--
-- Name: audit_log_2025_10_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_10_tenant_id_created_at_idx ON public.audit_log_2025_10 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2025_10_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_10_tenant_id_table_name_created_at_idx ON public.audit_log_2025_10 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2025_11_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_11_record_id_idx ON public.audit_log_2025_11 USING btree (record_id);


--
-- Name: audit_log_2025_11_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_11_tenant_id_created_at_idx ON public.audit_log_2025_11 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2025_11_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_11_tenant_id_table_name_created_at_idx ON public.audit_log_2025_11 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2025_12_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_12_record_id_idx ON public.audit_log_2025_12 USING btree (record_id);


--
-- Name: audit_log_2025_12_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_12_tenant_id_created_at_idx ON public.audit_log_2025_12 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2025_12_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2025_12_tenant_id_table_name_created_at_idx ON public.audit_log_2025_12 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2026_01_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_01_record_id_idx ON public.audit_log_2026_01 USING btree (record_id);


--
-- Name: audit_log_2026_01_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_01_tenant_id_created_at_idx ON public.audit_log_2026_01 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2026_01_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_01_tenant_id_table_name_created_at_idx ON public.audit_log_2026_01 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2026_02_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_02_record_id_idx ON public.audit_log_2026_02 USING btree (record_id);


--
-- Name: audit_log_2026_02_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_02_tenant_id_created_at_idx ON public.audit_log_2026_02 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2026_02_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_02_tenant_id_table_name_created_at_idx ON public.audit_log_2026_02 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2026_03_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_03_record_id_idx ON public.audit_log_2026_03 USING btree (record_id);


--
-- Name: audit_log_2026_03_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_03_tenant_id_created_at_idx ON public.audit_log_2026_03 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2026_03_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_03_tenant_id_table_name_created_at_idx ON public.audit_log_2026_03 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2026_04_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_04_record_id_idx ON public.audit_log_2026_04 USING btree (record_id);


--
-- Name: audit_log_2026_04_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_04_tenant_id_created_at_idx ON public.audit_log_2026_04 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2026_04_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_04_tenant_id_table_name_created_at_idx ON public.audit_log_2026_04 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2026_05_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_05_record_id_idx ON public.audit_log_2026_05 USING btree (record_id);


--
-- Name: audit_log_2026_05_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_05_tenant_id_created_at_idx ON public.audit_log_2026_05 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2026_05_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_05_tenant_id_table_name_created_at_idx ON public.audit_log_2026_05 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2026_06_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_06_record_id_idx ON public.audit_log_2026_06 USING btree (record_id);


--
-- Name: audit_log_2026_06_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_06_tenant_id_created_at_idx ON public.audit_log_2026_06 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2026_06_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_06_tenant_id_table_name_created_at_idx ON public.audit_log_2026_06 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2026_07_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_07_record_id_idx ON public.audit_log_2026_07 USING btree (record_id);


--
-- Name: audit_log_2026_07_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_07_tenant_id_created_at_idx ON public.audit_log_2026_07 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2026_07_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_07_tenant_id_table_name_created_at_idx ON public.audit_log_2026_07 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2026_08_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_08_record_id_idx ON public.audit_log_2026_08 USING btree (record_id);


--
-- Name: audit_log_2026_08_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_08_tenant_id_created_at_idx ON public.audit_log_2026_08 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2026_08_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_08_tenant_id_table_name_created_at_idx ON public.audit_log_2026_08 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2026_09_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_09_record_id_idx ON public.audit_log_2026_09 USING btree (record_id);


--
-- Name: audit_log_2026_09_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_09_tenant_id_created_at_idx ON public.audit_log_2026_09 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2026_09_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_09_tenant_id_table_name_created_at_idx ON public.audit_log_2026_09 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2026_10_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_10_record_id_idx ON public.audit_log_2026_10 USING btree (record_id);


--
-- Name: audit_log_2026_10_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_10_tenant_id_created_at_idx ON public.audit_log_2026_10 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2026_10_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_10_tenant_id_table_name_created_at_idx ON public.audit_log_2026_10 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2026_11_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_11_record_id_idx ON public.audit_log_2026_11 USING btree (record_id);


--
-- Name: audit_log_2026_11_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_11_tenant_id_created_at_idx ON public.audit_log_2026_11 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2026_11_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_11_tenant_id_table_name_created_at_idx ON public.audit_log_2026_11 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2026_12_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_12_record_id_idx ON public.audit_log_2026_12 USING btree (record_id);


--
-- Name: audit_log_2026_12_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_12_tenant_id_created_at_idx ON public.audit_log_2026_12 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2026_12_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_12_tenant_id_table_name_created_at_idx ON public.audit_log_2026_12 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2027_01_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_01_record_id_idx ON public.audit_log_2027_01 USING btree (record_id);


--
-- Name: audit_log_2027_01_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_01_tenant_id_created_at_idx ON public.audit_log_2027_01 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2027_01_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_01_tenant_id_table_name_created_at_idx ON public.audit_log_2027_01 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2027_02_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_02_record_id_idx ON public.audit_log_2027_02 USING btree (record_id);


--
-- Name: audit_log_2027_02_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_02_tenant_id_created_at_idx ON public.audit_log_2027_02 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2027_02_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_02_tenant_id_table_name_created_at_idx ON public.audit_log_2027_02 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2027_03_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_03_record_id_idx ON public.audit_log_2027_03 USING btree (record_id);


--
-- Name: audit_log_2027_03_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_03_tenant_id_created_at_idx ON public.audit_log_2027_03 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2027_03_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_03_tenant_id_table_name_created_at_idx ON public.audit_log_2027_03 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2027_04_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_04_record_id_idx ON public.audit_log_2027_04 USING btree (record_id);


--
-- Name: audit_log_2027_04_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_04_tenant_id_created_at_idx ON public.audit_log_2027_04 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2027_04_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_04_tenant_id_table_name_created_at_idx ON public.audit_log_2027_04 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2027_05_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_05_record_id_idx ON public.audit_log_2027_05 USING btree (record_id);


--
-- Name: audit_log_2027_05_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_05_tenant_id_created_at_idx ON public.audit_log_2027_05 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2027_05_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_05_tenant_id_table_name_created_at_idx ON public.audit_log_2027_05 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2027_06_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_06_record_id_idx ON public.audit_log_2027_06 USING btree (record_id);


--
-- Name: audit_log_2027_06_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_06_tenant_id_created_at_idx ON public.audit_log_2027_06 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2027_06_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_06_tenant_id_table_name_created_at_idx ON public.audit_log_2027_06 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2027_07_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_07_record_id_idx ON public.audit_log_2027_07 USING btree (record_id);


--
-- Name: audit_log_2027_07_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_07_tenant_id_created_at_idx ON public.audit_log_2027_07 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2027_07_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_07_tenant_id_table_name_created_at_idx ON public.audit_log_2027_07 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2027_08_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_08_record_id_idx ON public.audit_log_2027_08 USING btree (record_id);


--
-- Name: audit_log_2027_08_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_08_tenant_id_created_at_idx ON public.audit_log_2027_08 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2027_08_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_08_tenant_id_table_name_created_at_idx ON public.audit_log_2027_08 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2027_09_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_09_record_id_idx ON public.audit_log_2027_09 USING btree (record_id);


--
-- Name: audit_log_2027_09_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_09_tenant_id_created_at_idx ON public.audit_log_2027_09 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2027_09_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_09_tenant_id_table_name_created_at_idx ON public.audit_log_2027_09 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2027_10_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_10_record_id_idx ON public.audit_log_2027_10 USING btree (record_id);


--
-- Name: audit_log_2027_10_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_10_tenant_id_created_at_idx ON public.audit_log_2027_10 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2027_10_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_10_tenant_id_table_name_created_at_idx ON public.audit_log_2027_10 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2027_11_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_11_record_id_idx ON public.audit_log_2027_11 USING btree (record_id);


--
-- Name: audit_log_2027_11_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_11_tenant_id_created_at_idx ON public.audit_log_2027_11 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2027_11_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_11_tenant_id_table_name_created_at_idx ON public.audit_log_2027_11 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2027_12_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_12_record_id_idx ON public.audit_log_2027_12 USING btree (record_id);


--
-- Name: audit_log_2027_12_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_12_tenant_id_created_at_idx ON public.audit_log_2027_12 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2027_12_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2027_12_tenant_id_table_name_created_at_idx ON public.audit_log_2027_12 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2028_01_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_01_record_id_idx ON public.audit_log_2028_01 USING btree (record_id);


--
-- Name: audit_log_2028_01_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_01_tenant_id_created_at_idx ON public.audit_log_2028_01 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2028_01_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_01_tenant_id_table_name_created_at_idx ON public.audit_log_2028_01 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2028_02_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_02_record_id_idx ON public.audit_log_2028_02 USING btree (record_id);


--
-- Name: audit_log_2028_02_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_02_tenant_id_created_at_idx ON public.audit_log_2028_02 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2028_02_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_02_tenant_id_table_name_created_at_idx ON public.audit_log_2028_02 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2028_03_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_03_record_id_idx ON public.audit_log_2028_03 USING btree (record_id);


--
-- Name: audit_log_2028_03_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_03_tenant_id_created_at_idx ON public.audit_log_2028_03 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2028_03_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_03_tenant_id_table_name_created_at_idx ON public.audit_log_2028_03 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2028_04_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_04_record_id_idx ON public.audit_log_2028_04 USING btree (record_id);


--
-- Name: audit_log_2028_04_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_04_tenant_id_created_at_idx ON public.audit_log_2028_04 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2028_04_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_04_tenant_id_table_name_created_at_idx ON public.audit_log_2028_04 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2028_05_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_05_record_id_idx ON public.audit_log_2028_05 USING btree (record_id);


--
-- Name: audit_log_2028_05_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_05_tenant_id_created_at_idx ON public.audit_log_2028_05 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2028_05_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_05_tenant_id_table_name_created_at_idx ON public.audit_log_2028_05 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2028_06_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_06_record_id_idx ON public.audit_log_2028_06 USING btree (record_id);


--
-- Name: audit_log_2028_06_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_06_tenant_id_created_at_idx ON public.audit_log_2028_06 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2028_06_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_06_tenant_id_table_name_created_at_idx ON public.audit_log_2028_06 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2028_07_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_07_record_id_idx ON public.audit_log_2028_07 USING btree (record_id);


--
-- Name: audit_log_2028_07_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_07_tenant_id_created_at_idx ON public.audit_log_2028_07 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2028_07_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_07_tenant_id_table_name_created_at_idx ON public.audit_log_2028_07 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2028_08_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_08_record_id_idx ON public.audit_log_2028_08 USING btree (record_id);


--
-- Name: audit_log_2028_08_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_08_tenant_id_created_at_idx ON public.audit_log_2028_08 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2028_08_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_08_tenant_id_table_name_created_at_idx ON public.audit_log_2028_08 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2028_09_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_09_record_id_idx ON public.audit_log_2028_09 USING btree (record_id);


--
-- Name: audit_log_2028_09_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_09_tenant_id_created_at_idx ON public.audit_log_2028_09 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2028_09_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_09_tenant_id_table_name_created_at_idx ON public.audit_log_2028_09 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2028_10_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_10_record_id_idx ON public.audit_log_2028_10 USING btree (record_id);


--
-- Name: audit_log_2028_10_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_10_tenant_id_created_at_idx ON public.audit_log_2028_10 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2028_10_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_10_tenant_id_table_name_created_at_idx ON public.audit_log_2028_10 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2028_11_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_11_record_id_idx ON public.audit_log_2028_11 USING btree (record_id);


--
-- Name: audit_log_2028_11_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_11_tenant_id_created_at_idx ON public.audit_log_2028_11 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2028_11_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_11_tenant_id_table_name_created_at_idx ON public.audit_log_2028_11 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_2028_12_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_12_record_id_idx ON public.audit_log_2028_12 USING btree (record_id);


--
-- Name: audit_log_2028_12_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_12_tenant_id_created_at_idx ON public.audit_log_2028_12 USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_2028_12_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2028_12_tenant_id_table_name_created_at_idx ON public.audit_log_2028_12 USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: audit_log_default_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_default_record_id_idx ON public.audit_log_default USING btree (record_id);


--
-- Name: audit_log_default_tenant_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_default_tenant_id_created_at_idx ON public.audit_log_default USING btree (tenant_id, created_at DESC);


--
-- Name: audit_log_default_tenant_id_table_name_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_default_tenant_id_table_name_created_at_idx ON public.audit_log_default USING btree (tenant_id, table_name, created_at DESC);


--
-- Name: idx_ajust_tenant_contenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ajust_tenant_contenant ON public.ajustements_volume USING btree (tenant_id, contenant_id);


--
-- Name: idx_ajust_tenant_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ajust_tenant_date ON public.ajustements_volume USING btree (tenant_id, date_operation DESC);


--
-- Name: idx_ajust_tenant_lot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ajust_tenant_lot ON public.ajustements_volume USING btree (tenant_id, lot_id);


--
-- Name: idx_ajust_tenant_operation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ajust_tenant_operation ON public.ajustements_volume USING btree (tenant_id, operation_id);


--
-- Name: idx_analyses_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analyses_active ON public.analyses USING btree (tenant_id) WHERE (archived_at IS NULL);


--
-- Name: idx_analyses_lot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analyses_lot ON public.analyses USING btree (tenant_id, lot_id) WHERE (lot_id IS NOT NULL);


--
-- Name: idx_analyses_tenant_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analyses_tenant_date ON public.analyses USING btree (tenant_id, date_analyse DESC);


--
-- Name: idx_apports_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apports_active ON public.apports USING btree (tenant_id) WHERE (archived_at IS NULL);


--
-- Name: idx_apports_contenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apports_contenant ON public.apports USING btree (contenant_id);


--
-- Name: idx_apports_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apports_date ON public.apports USING btree (date_apport);


--
-- Name: idx_apports_lot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apports_lot ON public.apports USING btree (lot_id);


--
-- Name: idx_apports_meta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apports_meta ON public.apports USING gin (meta);


--
-- Name: idx_apports_statut; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apports_statut ON public.apports USING btree (statut);


--
-- Name: idx_apports_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apports_tenant ON public.apports USING btree (tenant_id);


--
-- Name: idx_cepages_couleur; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cepages_couleur ON public.cepages USING btree (couleur);


--
-- Name: idx_cepages_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cepages_tenant ON public.cepages USING btree (tenant_id);


--
-- Name: idx_contenants_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contenants_active ON public.contenants USING btree (tenant_id) WHERE (archived_at IS NULL);


--
-- Name: idx_contenants_marque; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contenants_marque ON public.contenants USING btree (tenant_id, marque) WHERE (marque IS NOT NULL);


--
-- Name: idx_contenants_materiau; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contenants_materiau ON public.contenants USING btree (tenant_id, materiau) WHERE (materiau IS NOT NULL);


--
-- Name: idx_contenants_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contenants_tenant ON public.contenants USING btree (tenant_id) WHERE (actif = true);


--
-- Name: idx_contenants_tonnelier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contenants_tonnelier ON public.contenants USING btree (tenant_id, tonnelier) WHERE (tonnelier IS NOT NULL);


--
-- Name: idx_contenants_travee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contenants_travee ON public.contenants USING btree (tenant_id, travee_id) WHERE (travee_id IS NOT NULL);


--
-- Name: idx_lch_contenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lch_contenant ON public.lot_contenants_history USING btree (contenant_id);


--
-- Name: idx_lch_lot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lch_lot ON public.lot_contenants_history USING btree (lot_id, date_evt DESC);


--
-- Name: idx_lch_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lch_tenant ON public.lot_contenants_history USING btree (tenant_id);


--
-- Name: idx_lineage_enfant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lineage_enfant ON public.lineage USING btree (lot_enfant_id);


--
-- Name: idx_lineage_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lineage_parent ON public.lineage USING btree (lot_parent_id);


--
-- Name: idx_lm_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lm_date ON public.lot_mouvements USING btree (date_mouvement DESC);


--
-- Name: idx_lm_dst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lm_dst ON public.lot_mouvements USING btree (contenant_dest_id) WHERE (contenant_dest_id IS NOT NULL);


--
-- Name: idx_lm_lot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lm_lot ON public.lot_mouvements USING btree (lot_id, date_mouvement DESC);


--
-- Name: idx_lm_operation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lm_operation ON public.lot_mouvements USING btree (operation_id);


--
-- Name: idx_lm_src; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lm_src ON public.lot_mouvements USING btree (contenant_source_id) WHERE (contenant_source_id IS NOT NULL);


--
-- Name: idx_lm_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lm_tenant ON public.lot_mouvements USING btree (tenant_id);


--
-- Name: idx_lot_cepages_cepage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_cepages_cepage ON public.lot_cepages USING btree (cepage_id);


--
-- Name: idx_lot_cepages_lot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_cepages_lot ON public.lot_cepages USING btree (lot_id);


--
-- Name: idx_lot_contenants_cont; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_contenants_cont ON public.lot_contenants USING btree (contenant_id);


--
-- Name: idx_lot_contenants_lot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_contenants_lot ON public.lot_contenants USING btree (lot_id);


--
-- Name: idx_lot_contenants_ten; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_contenants_ten ON public.lot_contenants USING btree (tenant_id);


--
-- Name: idx_lot_filiation_lot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_filiation_lot ON public.lot_filiation USING btree (lot_id);


--
-- Name: idx_lot_filiation_operation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_filiation_operation ON public.lot_filiation USING btree (operation_id) WHERE (operation_id IS NOT NULL);


--
-- Name: idx_lot_filiation_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_filiation_parent ON public.lot_filiation USING btree (parent_id);


--
-- Name: idx_lot_filiation_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_filiation_tenant ON public.lot_filiation USING btree (tenant_id);


--
-- Name: idx_lots_active_view; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lots_active_view ON public.lots USING btree (tenant_id, statut) WHERE (archived = false);


--
-- Name: idx_lots_couleur; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lots_couleur ON public.lots USING btree (couleur);


--
-- Name: idx_lots_millesime; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lots_millesime ON public.lots USING btree (millesime);


--
-- Name: idx_lots_statut; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lots_statut ON public.lots USING btree (statut);


--
-- Name: idx_lots_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lots_tenant ON public.lots USING btree (tenant_id);


--
-- Name: idx_op_cont_contenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_op_cont_contenant ON public.operation_contenants USING btree (contenant_id);


--
-- Name: idx_op_cont_operation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_op_cont_operation ON public.operation_contenants USING btree (operation_id);


--
-- Name: idx_op_cont_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_op_cont_tenant ON public.operation_contenants USING btree (tenant_id);


--
-- Name: idx_op_lots_lot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_op_lots_lot ON public.operation_lots USING btree (lot_id);


--
-- Name: idx_op_lots_operation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_op_lots_operation ON public.operation_lots USING btree (operation_id);


--
-- Name: idx_op_lots_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_op_lots_tenant ON public.operation_lots USING btree (tenant_id);


--
-- Name: idx_op_produits_lot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_op_produits_lot ON public.operation_produits USING btree (produit_lot_id);


--
-- Name: idx_op_produits_operation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_op_produits_operation ON public.operation_produits USING btree (operation_id);


--
-- Name: idx_op_produits_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_op_produits_tenant ON public.operation_produits USING btree (tenant_id);


--
-- Name: idx_operations_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operations_date ON public.operations USING btree (date_operation);


--
-- Name: idx_operations_meta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operations_meta ON public.operations USING gin (meta);


--
-- Name: idx_operations_statut; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operations_statut ON public.operations USING btree (statut);


--
-- Name: idx_operations_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operations_tenant ON public.operations USING btree (tenant_id);


--
-- Name: idx_operations_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operations_type ON public.operations USING btree (type_operation);


--
-- Name: idx_produits_cat_actif; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_produits_cat_actif ON public.produits_catalogue USING btree (actif);


--
-- Name: idx_produits_cat_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_produits_cat_active ON public.produits_catalogue USING btree (tenant_id) WHERE (archived_at IS NULL);


--
-- Name: idx_produits_cat_categorie; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_produits_cat_categorie ON public.produits_catalogue USING btree (categorie);


--
-- Name: idx_produits_cat_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_produits_cat_tenant ON public.produits_catalogue USING btree (tenant_id);


--
-- Name: idx_produits_lots_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_produits_lots_active ON public.produits_lots USING btree (tenant_id) WHERE (archived_at IS NULL);


--
-- Name: idx_produits_lots_dluo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_produits_lots_dluo ON public.produits_lots USING btree (dluo);


--
-- Name: idx_produits_lots_produit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_produits_lots_produit ON public.produits_lots USING btree (produit_id);


--
-- Name: idx_produits_lots_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_produits_lots_tenant ON public.produits_lots USING btree (tenant_id);


--
-- Name: idx_travees_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_travees_tenant ON public.travees USING btree (tenant_id, ordre);


--
-- Name: idx_user_prefs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_prefs_user ON public.user_preferences USING btree (user_id);


--
-- Name: lots_tenant_numero_lot_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX lots_tenant_numero_lot_key ON public.lots USING btree (tenant_id, numero_lot) WHERE (numero_lot IS NOT NULL);


--
-- Name: uq_lot_filiation_assemblage; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_lot_filiation_assemblage ON public.lot_filiation USING btree (lot_id, parent_id, operation_id) WHERE ((source_type = 'assemblage'::text) AND (operation_id IS NOT NULL));


--
-- Name: INDEX uq_lot_filiation_assemblage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.uq_lot_filiation_assemblage IS 'Idempotence : une même opération ne peut pas créer deux fois la même paire (lot_id, parent_id) avec source_type=assemblage. Deux opérations différentes sur la même paire sont permises.';


--
-- Name: uq_lot_filiation_manual; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_lot_filiation_manual ON public.lot_filiation USING btree (lot_id, parent_id) WHERE (source_type = 'manual'::text);


--
-- Name: INDEX uq_lot_filiation_manual; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.uq_lot_filiation_manual IS 'Un seul lien manuel (source_type=manual) par couple (lot_id, parent_id). Les liens auto d''assemblage ne sont pas concernés par cet index.';


--
-- Name: audit_log_2025_01_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2025_01_pkey;


--
-- Name: audit_log_2025_01_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2025_01_record_id_idx;


--
-- Name: audit_log_2025_01_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2025_01_tenant_id_created_at_idx;


--
-- Name: audit_log_2025_01_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2025_01_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2025_02_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2025_02_pkey;


--
-- Name: audit_log_2025_02_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2025_02_record_id_idx;


--
-- Name: audit_log_2025_02_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2025_02_tenant_id_created_at_idx;


--
-- Name: audit_log_2025_02_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2025_02_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2025_03_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2025_03_pkey;


--
-- Name: audit_log_2025_03_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2025_03_record_id_idx;


--
-- Name: audit_log_2025_03_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2025_03_tenant_id_created_at_idx;


--
-- Name: audit_log_2025_03_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2025_03_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2025_04_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2025_04_pkey;


--
-- Name: audit_log_2025_04_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2025_04_record_id_idx;


--
-- Name: audit_log_2025_04_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2025_04_tenant_id_created_at_idx;


--
-- Name: audit_log_2025_04_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2025_04_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2025_05_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2025_05_pkey;


--
-- Name: audit_log_2025_05_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2025_05_record_id_idx;


--
-- Name: audit_log_2025_05_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2025_05_tenant_id_created_at_idx;


--
-- Name: audit_log_2025_05_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2025_05_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2025_06_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2025_06_pkey;


--
-- Name: audit_log_2025_06_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2025_06_record_id_idx;


--
-- Name: audit_log_2025_06_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2025_06_tenant_id_created_at_idx;


--
-- Name: audit_log_2025_06_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2025_06_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2025_07_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2025_07_pkey;


--
-- Name: audit_log_2025_07_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2025_07_record_id_idx;


--
-- Name: audit_log_2025_07_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2025_07_tenant_id_created_at_idx;


--
-- Name: audit_log_2025_07_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2025_07_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2025_08_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2025_08_pkey;


--
-- Name: audit_log_2025_08_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2025_08_record_id_idx;


--
-- Name: audit_log_2025_08_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2025_08_tenant_id_created_at_idx;


--
-- Name: audit_log_2025_08_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2025_08_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2025_09_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2025_09_pkey;


--
-- Name: audit_log_2025_09_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2025_09_record_id_idx;


--
-- Name: audit_log_2025_09_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2025_09_tenant_id_created_at_idx;


--
-- Name: audit_log_2025_09_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2025_09_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2025_10_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2025_10_pkey;


--
-- Name: audit_log_2025_10_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2025_10_record_id_idx;


--
-- Name: audit_log_2025_10_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2025_10_tenant_id_created_at_idx;


--
-- Name: audit_log_2025_10_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2025_10_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2025_11_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2025_11_pkey;


--
-- Name: audit_log_2025_11_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2025_11_record_id_idx;


--
-- Name: audit_log_2025_11_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2025_11_tenant_id_created_at_idx;


--
-- Name: audit_log_2025_11_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2025_11_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2025_12_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2025_12_pkey;


--
-- Name: audit_log_2025_12_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2025_12_record_id_idx;


--
-- Name: audit_log_2025_12_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2025_12_tenant_id_created_at_idx;


--
-- Name: audit_log_2025_12_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2025_12_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2026_01_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2026_01_pkey;


--
-- Name: audit_log_2026_01_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2026_01_record_id_idx;


--
-- Name: audit_log_2026_01_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2026_01_tenant_id_created_at_idx;


--
-- Name: audit_log_2026_01_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2026_01_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2026_02_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2026_02_pkey;


--
-- Name: audit_log_2026_02_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2026_02_record_id_idx;


--
-- Name: audit_log_2026_02_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2026_02_tenant_id_created_at_idx;


--
-- Name: audit_log_2026_02_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2026_02_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2026_03_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2026_03_pkey;


--
-- Name: audit_log_2026_03_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2026_03_record_id_idx;


--
-- Name: audit_log_2026_03_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2026_03_tenant_id_created_at_idx;


--
-- Name: audit_log_2026_03_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2026_03_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2026_04_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2026_04_pkey;


--
-- Name: audit_log_2026_04_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2026_04_record_id_idx;


--
-- Name: audit_log_2026_04_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2026_04_tenant_id_created_at_idx;


--
-- Name: audit_log_2026_04_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2026_04_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2026_05_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2026_05_pkey;


--
-- Name: audit_log_2026_05_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2026_05_record_id_idx;


--
-- Name: audit_log_2026_05_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2026_05_tenant_id_created_at_idx;


--
-- Name: audit_log_2026_05_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2026_05_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2026_06_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2026_06_pkey;


--
-- Name: audit_log_2026_06_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2026_06_record_id_idx;


--
-- Name: audit_log_2026_06_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2026_06_tenant_id_created_at_idx;


--
-- Name: audit_log_2026_06_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2026_06_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2026_07_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2026_07_pkey;


--
-- Name: audit_log_2026_07_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2026_07_record_id_idx;


--
-- Name: audit_log_2026_07_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2026_07_tenant_id_created_at_idx;


--
-- Name: audit_log_2026_07_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2026_07_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2026_08_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2026_08_pkey;


--
-- Name: audit_log_2026_08_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2026_08_record_id_idx;


--
-- Name: audit_log_2026_08_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2026_08_tenant_id_created_at_idx;


--
-- Name: audit_log_2026_08_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2026_08_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2026_09_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2026_09_pkey;


--
-- Name: audit_log_2026_09_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2026_09_record_id_idx;


--
-- Name: audit_log_2026_09_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2026_09_tenant_id_created_at_idx;


--
-- Name: audit_log_2026_09_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2026_09_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2026_10_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2026_10_pkey;


--
-- Name: audit_log_2026_10_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2026_10_record_id_idx;


--
-- Name: audit_log_2026_10_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2026_10_tenant_id_created_at_idx;


--
-- Name: audit_log_2026_10_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2026_10_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2026_11_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2026_11_pkey;


--
-- Name: audit_log_2026_11_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2026_11_record_id_idx;


--
-- Name: audit_log_2026_11_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2026_11_tenant_id_created_at_idx;


--
-- Name: audit_log_2026_11_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2026_11_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2026_12_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2026_12_pkey;


--
-- Name: audit_log_2026_12_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2026_12_record_id_idx;


--
-- Name: audit_log_2026_12_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2026_12_tenant_id_created_at_idx;


--
-- Name: audit_log_2026_12_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2026_12_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2027_01_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2027_01_pkey;


--
-- Name: audit_log_2027_01_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2027_01_record_id_idx;


--
-- Name: audit_log_2027_01_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2027_01_tenant_id_created_at_idx;


--
-- Name: audit_log_2027_01_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2027_01_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2027_02_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2027_02_pkey;


--
-- Name: audit_log_2027_02_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2027_02_record_id_idx;


--
-- Name: audit_log_2027_02_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2027_02_tenant_id_created_at_idx;


--
-- Name: audit_log_2027_02_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2027_02_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2027_03_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2027_03_pkey;


--
-- Name: audit_log_2027_03_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2027_03_record_id_idx;


--
-- Name: audit_log_2027_03_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2027_03_tenant_id_created_at_idx;


--
-- Name: audit_log_2027_03_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2027_03_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2027_04_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2027_04_pkey;


--
-- Name: audit_log_2027_04_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2027_04_record_id_idx;


--
-- Name: audit_log_2027_04_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2027_04_tenant_id_created_at_idx;


--
-- Name: audit_log_2027_04_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2027_04_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2027_05_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2027_05_pkey;


--
-- Name: audit_log_2027_05_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2027_05_record_id_idx;


--
-- Name: audit_log_2027_05_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2027_05_tenant_id_created_at_idx;


--
-- Name: audit_log_2027_05_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2027_05_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2027_06_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2027_06_pkey;


--
-- Name: audit_log_2027_06_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2027_06_record_id_idx;


--
-- Name: audit_log_2027_06_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2027_06_tenant_id_created_at_idx;


--
-- Name: audit_log_2027_06_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2027_06_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2027_07_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2027_07_pkey;


--
-- Name: audit_log_2027_07_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2027_07_record_id_idx;


--
-- Name: audit_log_2027_07_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2027_07_tenant_id_created_at_idx;


--
-- Name: audit_log_2027_07_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2027_07_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2027_08_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2027_08_pkey;


--
-- Name: audit_log_2027_08_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2027_08_record_id_idx;


--
-- Name: audit_log_2027_08_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2027_08_tenant_id_created_at_idx;


--
-- Name: audit_log_2027_08_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2027_08_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2027_09_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2027_09_pkey;


--
-- Name: audit_log_2027_09_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2027_09_record_id_idx;


--
-- Name: audit_log_2027_09_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2027_09_tenant_id_created_at_idx;


--
-- Name: audit_log_2027_09_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2027_09_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2027_10_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2027_10_pkey;


--
-- Name: audit_log_2027_10_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2027_10_record_id_idx;


--
-- Name: audit_log_2027_10_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2027_10_tenant_id_created_at_idx;


--
-- Name: audit_log_2027_10_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2027_10_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2027_11_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2027_11_pkey;


--
-- Name: audit_log_2027_11_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2027_11_record_id_idx;


--
-- Name: audit_log_2027_11_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2027_11_tenant_id_created_at_idx;


--
-- Name: audit_log_2027_11_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2027_11_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2027_12_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2027_12_pkey;


--
-- Name: audit_log_2027_12_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2027_12_record_id_idx;


--
-- Name: audit_log_2027_12_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2027_12_tenant_id_created_at_idx;


--
-- Name: audit_log_2027_12_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2027_12_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2028_01_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2028_01_pkey;


--
-- Name: audit_log_2028_01_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2028_01_record_id_idx;


--
-- Name: audit_log_2028_01_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2028_01_tenant_id_created_at_idx;


--
-- Name: audit_log_2028_01_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2028_01_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2028_02_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2028_02_pkey;


--
-- Name: audit_log_2028_02_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2028_02_record_id_idx;


--
-- Name: audit_log_2028_02_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2028_02_tenant_id_created_at_idx;


--
-- Name: audit_log_2028_02_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2028_02_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2028_03_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2028_03_pkey;


--
-- Name: audit_log_2028_03_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2028_03_record_id_idx;


--
-- Name: audit_log_2028_03_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2028_03_tenant_id_created_at_idx;


--
-- Name: audit_log_2028_03_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2028_03_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2028_04_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2028_04_pkey;


--
-- Name: audit_log_2028_04_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2028_04_record_id_idx;


--
-- Name: audit_log_2028_04_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2028_04_tenant_id_created_at_idx;


--
-- Name: audit_log_2028_04_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2028_04_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2028_05_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2028_05_pkey;


--
-- Name: audit_log_2028_05_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2028_05_record_id_idx;


--
-- Name: audit_log_2028_05_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2028_05_tenant_id_created_at_idx;


--
-- Name: audit_log_2028_05_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2028_05_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2028_06_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2028_06_pkey;


--
-- Name: audit_log_2028_06_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2028_06_record_id_idx;


--
-- Name: audit_log_2028_06_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2028_06_tenant_id_created_at_idx;


--
-- Name: audit_log_2028_06_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2028_06_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2028_07_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2028_07_pkey;


--
-- Name: audit_log_2028_07_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2028_07_record_id_idx;


--
-- Name: audit_log_2028_07_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2028_07_tenant_id_created_at_idx;


--
-- Name: audit_log_2028_07_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2028_07_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2028_08_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2028_08_pkey;


--
-- Name: audit_log_2028_08_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2028_08_record_id_idx;


--
-- Name: audit_log_2028_08_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2028_08_tenant_id_created_at_idx;


--
-- Name: audit_log_2028_08_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2028_08_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2028_09_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2028_09_pkey;


--
-- Name: audit_log_2028_09_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2028_09_record_id_idx;


--
-- Name: audit_log_2028_09_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2028_09_tenant_id_created_at_idx;


--
-- Name: audit_log_2028_09_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2028_09_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2028_10_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2028_10_pkey;


--
-- Name: audit_log_2028_10_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2028_10_record_id_idx;


--
-- Name: audit_log_2028_10_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2028_10_tenant_id_created_at_idx;


--
-- Name: audit_log_2028_10_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2028_10_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2028_11_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2028_11_pkey;


--
-- Name: audit_log_2028_11_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2028_11_record_id_idx;


--
-- Name: audit_log_2028_11_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2028_11_tenant_id_created_at_idx;


--
-- Name: audit_log_2028_11_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2028_11_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_2028_12_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2028_12_pkey;


--
-- Name: audit_log_2028_12_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_2028_12_record_id_idx;


--
-- Name: audit_log_2028_12_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_2028_12_tenant_id_created_at_idx;


--
-- Name: audit_log_2028_12_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_2028_12_tenant_id_table_name_created_at_idx;


--
-- Name: audit_log_default_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_default_pkey;


--
-- Name: audit_log_default_record_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_record ATTACH PARTITION public.audit_log_default_record_id_idx;


--
-- Name: audit_log_default_tenant_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_tenant_date ATTACH PARTITION public.audit_log_default_tenant_id_created_at_idx;


--
-- Name: audit_log_default_tenant_id_table_name_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_audit_table ATTACH PARTITION public.audit_log_default_tenant_id_table_name_created_at_idx;


--
-- Name: analyses analyses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER analyses_updated_at BEFORE UPDATE ON public.analyses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: apports apports_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER apports_updated_at BEFORE UPDATE ON public.apports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: lot_contenants lot_contenants_sync_volume; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER lot_contenants_sync_volume AFTER INSERT OR DELETE OR UPDATE ON public.lot_contenants FOR EACH ROW EXECUTE FUNCTION public.sync_lot_volume_actuel();


--
-- Name: lots lots_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER lots_updated_at BEFORE UPDATE ON public.lots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: operations operations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER operations_updated_at BEFORE UPDATE ON public.operations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: produits_catalogue produits_catalogue_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER produits_catalogue_updated_at BEFORE UPDATE ON public.produits_catalogue FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: produits_lots produits_lots_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER produits_lots_updated_at BEFORE UPDATE ON public.produits_lots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: ajustements_volume trg_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit AFTER INSERT OR DELETE OR UPDATE ON public.ajustements_volume FOR EACH ROW EXECUTE FUNCTION public._wb3_audit();


--
-- Name: analyses trg_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit AFTER INSERT OR DELETE OR UPDATE ON public.analyses FOR EACH ROW EXECUTE FUNCTION public._wb3_audit();


--
-- Name: apports trg_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit AFTER INSERT OR DELETE OR UPDATE ON public.apports FOR EACH ROW EXECUTE FUNCTION public._wb3_audit();


--
-- Name: contenants trg_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit AFTER INSERT OR DELETE OR UPDATE ON public.contenants FOR EACH ROW EXECUTE FUNCTION public._wb3_audit();


--
-- Name: lot_mouvements trg_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit AFTER INSERT OR DELETE OR UPDATE ON public.lot_mouvements FOR EACH ROW EXECUTE FUNCTION public._wb3_audit();


--
-- Name: lots trg_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit AFTER INSERT OR DELETE OR UPDATE ON public.lots FOR EACH ROW EXECUTE FUNCTION public._wb3_audit();


--
-- Name: operations trg_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit AFTER INSERT OR DELETE OR UPDATE ON public.operations FOR EACH ROW EXECUTE FUNCTION public._wb3_audit();


--
-- Name: produits_catalogue trg_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit AFTER INSERT OR DELETE OR UPDATE ON public.produits_catalogue FOR EACH ROW EXECUTE FUNCTION public._wb3_audit();


--
-- Name: produits_lots trg_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit AFTER INSERT OR DELETE OR UPDATE ON public.produits_lots FOR EACH ROW EXECUTE FUNCTION public._wb3_audit();


--
-- Name: lot_mouvements trg_lm_delete_check; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_lm_delete_check BEFORE DELETE ON public.lot_mouvements FOR EACH ROW EXECUTE FUNCTION public._wb3_lm_delete_check();


--
-- Name: lot_contenants trg_lot_contenants_history; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_lot_contenants_history AFTER INSERT OR DELETE ON public.lot_contenants FOR EACH ROW EXECUTE FUNCTION public.wb3_lot_contenants_history_trig();


--
-- Name: operation_contenants trg_op_contenants_lock; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_op_contenants_lock BEFORE INSERT OR DELETE OR UPDATE ON public.operation_contenants FOR EACH ROW EXECUTE FUNCTION public._wb3_op_graph_lock_check();


--
-- Name: operations trg_op_lock_check; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_op_lock_check BEFORE UPDATE ON public.operations FOR EACH ROW EXECUTE FUNCTION public._wb3_op_lock_check();


--
-- Name: operation_lots trg_op_lots_lock; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_op_lots_lock BEFORE INSERT OR DELETE OR UPDATE ON public.operation_lots FOR EACH ROW EXECUTE FUNCTION public._wb3_op_graph_lock_check();


--
-- Name: operation_produits trg_op_produits_lock; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_op_produits_lock BEFORE INSERT OR DELETE OR UPDATE ON public.operation_produits FOR EACH ROW EXECUTE FUNCTION public._wb3_op_graph_lock_check();


--
-- Name: ajustements_volume ajustements_volume_contenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ajustements_volume
    ADD CONSTRAINT ajustements_volume_contenant_id_fkey FOREIGN KEY (contenant_id) REFERENCES public.contenants(id) ON DELETE SET NULL;


--
-- Name: ajustements_volume ajustements_volume_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ajustements_volume
    ADD CONSTRAINT ajustements_volume_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- Name: ajustements_volume ajustements_volume_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ajustements_volume
    ADD CONSTRAINT ajustements_volume_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES public.operations(id) ON DELETE SET NULL;


--
-- Name: ajustements_volume ajustements_volume_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ajustements_volume
    ADD CONSTRAINT ajustements_volume_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: analyses analyses_contenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analyses
    ADD CONSTRAINT analyses_contenant_id_fkey FOREIGN KEY (contenant_id) REFERENCES public.contenants(id) ON DELETE SET NULL;


--
-- Name: analyses analyses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analyses
    ADD CONSTRAINT analyses_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: analyses analyses_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analyses
    ADD CONSTRAINT analyses_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE SET NULL;


--
-- Name: analyses analyses_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analyses
    ADD CONSTRAINT analyses_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: apports apports_contenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.apports
    ADD CONSTRAINT apports_contenant_id_fkey FOREIGN KEY (contenant_id) REFERENCES public.contenants(id) ON DELETE SET NULL;


--
-- Name: apports apports_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.apports
    ADD CONSTRAINT apports_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE SET NULL;


--
-- Name: apports apports_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.apports
    ADD CONSTRAINT apports_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: cepages cepages_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cepages
    ADD CONSTRAINT cepages_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: contenants contenants_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contenants
    ADD CONSTRAINT contenants_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: contenants contenants_travee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contenants
    ADD CONSTRAINT contenants_travee_id_fkey FOREIGN KEY (travee_id) REFERENCES public.travees(id) ON DELETE SET NULL;


--
-- Name: fiches_travail fiches_travail_caviste_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiches_travail
    ADD CONSTRAINT fiches_travail_caviste_id_fkey FOREIGN KEY (caviste_id) REFERENCES auth.users(id);


--
-- Name: fiches_travail fiches_travail_signature_oenologue_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiches_travail
    ADD CONSTRAINT fiches_travail_signature_oenologue_fkey FOREIGN KEY (signature_oenologue) REFERENCES auth.users(id);


--
-- Name: fiches_travail fiches_travail_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiches_travail
    ADD CONSTRAINT fiches_travail_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: lot_cepages lot_cepages_cepage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_cepages
    ADD CONSTRAINT lot_cepages_cepage_id_fkey FOREIGN KEY (cepage_id) REFERENCES public.cepages(id) ON DELETE CASCADE;


--
-- Name: lot_cepages lot_cepages_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_cepages
    ADD CONSTRAINT lot_cepages_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- Name: lot_contenants lot_contenants_contenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_contenants
    ADD CONSTRAINT lot_contenants_contenant_id_fkey FOREIGN KEY (contenant_id) REFERENCES public.contenants(id) ON DELETE CASCADE;


--
-- Name: lot_contenants_history lot_contenants_history_contenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_contenants_history
    ADD CONSTRAINT lot_contenants_history_contenant_id_fkey FOREIGN KEY (contenant_id) REFERENCES public.contenants(id) ON DELETE SET NULL;


--
-- Name: lot_contenants_history lot_contenants_history_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_contenants_history
    ADD CONSTRAINT lot_contenants_history_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- Name: lot_contenants_history lot_contenants_history_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_contenants_history
    ADD CONSTRAINT lot_contenants_history_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: lot_contenants lot_contenants_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_contenants
    ADD CONSTRAINT lot_contenants_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- Name: lot_contenants lot_contenants_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_contenants
    ADD CONSTRAINT lot_contenants_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: lot_filiation lot_filiation_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_filiation
    ADD CONSTRAINT lot_filiation_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- Name: lot_filiation lot_filiation_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_filiation
    ADD CONSTRAINT lot_filiation_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES public.operations(id) ON DELETE SET NULL;


--
-- Name: lot_filiation lot_filiation_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_filiation
    ADD CONSTRAINT lot_filiation_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- Name: lot_filiation lot_filiation_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_filiation
    ADD CONSTRAINT lot_filiation_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: lot_mouvements lot_mouvements_contenant_dest_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_mouvements
    ADD CONSTRAINT lot_mouvements_contenant_dest_id_fkey FOREIGN KEY (contenant_dest_id) REFERENCES public.contenants(id) ON DELETE SET NULL;


--
-- Name: lot_mouvements lot_mouvements_contenant_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_mouvements
    ADD CONSTRAINT lot_mouvements_contenant_source_id_fkey FOREIGN KEY (contenant_source_id) REFERENCES public.contenants(id) ON DELETE SET NULL;


--
-- Name: lot_mouvements lot_mouvements_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_mouvements
    ADD CONSTRAINT lot_mouvements_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- Name: lot_mouvements lot_mouvements_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_mouvements
    ADD CONSTRAINT lot_mouvements_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES public.operations(id) ON DELETE CASCADE;


--
-- Name: lot_mouvements lot_mouvements_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_mouvements
    ADD CONSTRAINT lot_mouvements_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: lots lots_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT lots_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: memberships memberships_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: memberships memberships_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: operation_contenants operation_contenants_contenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_contenants
    ADD CONSTRAINT operation_contenants_contenant_id_fkey FOREIGN KEY (contenant_id) REFERENCES public.contenants(id) ON DELETE CASCADE;


--
-- Name: operation_contenants operation_contenants_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_contenants
    ADD CONSTRAINT operation_contenants_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES public.operations(id) ON DELETE CASCADE;


--
-- Name: operation_contenants operation_contenants_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_contenants
    ADD CONSTRAINT operation_contenants_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: operation_lots operation_lots_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_lots
    ADD CONSTRAINT operation_lots_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- Name: operation_lots operation_lots_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_lots
    ADD CONSTRAINT operation_lots_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES public.operations(id) ON DELETE CASCADE;


--
-- Name: operation_lots operation_lots_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_lots
    ADD CONSTRAINT operation_lots_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: operation_produits operation_produits_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_produits
    ADD CONSTRAINT operation_produits_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES public.operations(id) ON DELETE CASCADE;


--
-- Name: operation_produits operation_produits_produit_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_produits
    ADD CONSTRAINT operation_produits_produit_lot_id_fkey FOREIGN KEY (produit_lot_id) REFERENCES public.produits_lots(id) ON DELETE CASCADE;


--
-- Name: operation_produits operation_produits_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_produits
    ADD CONSTRAINT operation_produits_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: operations operations_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations
    ADD CONSTRAINT operations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: produits_catalogue produits_catalogue_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produits_catalogue
    ADD CONSTRAINT produits_catalogue_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: produits_lots produits_lots_produit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produits_lots
    ADD CONSTRAINT produits_lots_produit_id_fkey FOREIGN KEY (produit_id) REFERENCES public.produits_catalogue(id) ON DELETE CASCADE;


--
-- Name: produits_lots produits_lots_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produits_lots
    ADD CONSTRAINT produits_lots_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: travees travees_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travees
    ADD CONSTRAINT travees_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: user_preferences user_preferences_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: user_preferences user_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ajustements_volume ajust_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ajust_tenant_isolation ON public.ajustements_volume USING ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid));


--
-- Name: ajustements_volume; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ajustements_volume ENABLE ROW LEVEL SECURITY;

--
-- Name: analyses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

--
-- Name: analyses analyses_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY analyses_delete ON public.analyses FOR DELETE USING (public.is_privileged_in(tenant_id));


--
-- Name: analyses analyses_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY analyses_insert ON public.analyses FOR INSERT WITH CHECK ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: analyses analyses_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY analyses_select ON public.analyses FOR SELECT USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: analyses analyses_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY analyses_update ON public.analyses FOR UPDATE USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: apports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.apports ENABLE ROW LEVEL SECURITY;

--
-- Name: apports apports_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY apports_delete ON public.apports FOR DELETE USING (public.is_privileged_in(tenant_id));


--
-- Name: apports apports_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY apports_insert ON public.apports FOR INSERT WITH CHECK ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: apports apports_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY apports_select ON public.apports FOR SELECT USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: apports apports_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY apports_update ON public.apports FOR UPDATE USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2025_01; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2025_01 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2025_02; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2025_02 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2025_03; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2025_03 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2025_04; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2025_04 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2025_05; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2025_05 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2025_06; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2025_06 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2025_07; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2025_07 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2025_08; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2025_08 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2025_09; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2025_09 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2025_10; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2025_10 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2025_11; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2025_11 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2025_12; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2025_12 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2026_01; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2026_01 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2026_02; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2026_02 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2026_03; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2026_03 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2026_04; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2026_04 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2026_05; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2026_05 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2026_06; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2026_06 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2026_07; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2026_07 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2026_08; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2026_08 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2026_09; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2026_09 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2026_10; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2026_10 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2026_11; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2026_11 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2026_12; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2026_12 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2027_01; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2027_01 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2027_02; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2027_02 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2027_03; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2027_03 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2027_04; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2027_04 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2027_05; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2027_05 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2027_06; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2027_06 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2027_07; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2027_07 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2027_08; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2027_08 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2027_09; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2027_09 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2027_10; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2027_10 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2027_11; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2027_11 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2027_12; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2027_12 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2028_01; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2028_01 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2028_02; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2028_02 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2028_03; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2028_03 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2028_04; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2028_04 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2028_05; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2028_05 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2028_06; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2028_06 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2028_07; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2028_07 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2028_08; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2028_08 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2028_09; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2028_09 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2028_10; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2028_10 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2028_11; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2028_11 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2028_12; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2028_12 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_default; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_default ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log audit_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_select_admin ON public.audit_log FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.memberships m
  WHERE ((m.user_id = auth.uid()) AND (m.tenant_id = audit_log.tenant_id) AND (m.role = 'admin'::text)))));


--
-- Name: POLICY audit_select_admin ON audit_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY audit_select_admin ON public.audit_log IS 'Seuls les membres role=admin du tenant peuvent lire le journal d''audit.';


--
-- Name: cepages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cepages ENABLE ROW LEVEL SECURITY;

--
-- Name: cepages cepages_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cepages_delete ON public.cepages FOR DELETE USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: cepages cepages_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cepages_insert ON public.cepages FOR INSERT WITH CHECK ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: cepages cepages_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cepages_select ON public.cepages FOR SELECT USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: cepages cepages_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cepages_update ON public.cepages FOR UPDATE USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: contenants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contenants ENABLE ROW LEVEL SECURITY;

--
-- Name: contenants contenants_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY contenants_delete ON public.contenants FOR DELETE USING (public.is_privileged_in(tenant_id));


--
-- Name: contenants contenants_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY contenants_insert ON public.contenants FOR INSERT WITH CHECK ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: contenants contenants_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY contenants_select ON public.contenants FOR SELECT USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: contenants contenants_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY contenants_update ON public.contenants FOR UPDATE USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: fiches_travail fiches_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fiches_delete ON public.fiches_travail FOR DELETE USING (public.is_privileged_in(tenant_id));


--
-- Name: fiches_travail fiches_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fiches_insert ON public.fiches_travail FOR INSERT WITH CHECK ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: fiches_travail fiches_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fiches_select ON public.fiches_travail FOR SELECT USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: fiches_travail; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fiches_travail ENABLE ROW LEVEL SECURITY;

--
-- Name: fiches_travail fiches_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fiches_update ON public.fiches_travail FOR UPDATE USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: lot_contenants_history lch_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lch_delete ON public.lot_contenants_history FOR DELETE USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: lot_contenants_history lch_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lch_insert ON public.lot_contenants_history FOR INSERT WITH CHECK ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: lot_contenants_history lch_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lch_select ON public.lot_contenants_history FOR SELECT USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: lot_contenants_history lch_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lch_update ON public.lot_contenants_history FOR UPDATE USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: lineage; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lineage ENABLE ROW LEVEL SECURITY;

--
-- Name: lot_mouvements lm_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lm_delete ON public.lot_mouvements FOR DELETE USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: lot_mouvements lm_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lm_insert ON public.lot_mouvements FOR INSERT WITH CHECK ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: lot_mouvements lm_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lm_select ON public.lot_mouvements FOR SELECT USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: lot_cepages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lot_cepages ENABLE ROW LEVEL SECURITY;

--
-- Name: lot_cepages lot_cepages_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lot_cepages_delete ON public.lot_cepages FOR DELETE USING ((lot_id IN ( SELECT lots.id
   FROM public.lots
  WHERE (lots.tenant_id IN ( SELECT public.user_tenants() AS user_tenants)))));


--
-- Name: lot_cepages lot_cepages_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lot_cepages_insert ON public.lot_cepages FOR INSERT WITH CHECK ((lot_id IN ( SELECT lots.id
   FROM public.lots
  WHERE (lots.tenant_id IN ( SELECT public.user_tenants() AS user_tenants)))));


--
-- Name: lot_cepages lot_cepages_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lot_cepages_select ON public.lot_cepages FOR SELECT USING ((lot_id IN ( SELECT lots.id
   FROM public.lots
  WHERE (lots.tenant_id IN ( SELECT public.user_tenants() AS user_tenants)))));


--
-- Name: lot_cepages lot_cepages_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lot_cepages_update ON public.lot_cepages FOR UPDATE USING ((lot_id IN ( SELECT lots.id
   FROM public.lots
  WHERE (lots.tenant_id IN ( SELECT public.user_tenants() AS user_tenants)))));


--
-- Name: lot_contenants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lot_contenants ENABLE ROW LEVEL SECURITY;

--
-- Name: lot_contenants lot_contenants_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lot_contenants_delete ON public.lot_contenants FOR DELETE USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: lot_contenants_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lot_contenants_history ENABLE ROW LEVEL SECURITY;

--
-- Name: lot_contenants lot_contenants_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lot_contenants_insert ON public.lot_contenants FOR INSERT WITH CHECK ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: lot_contenants lot_contenants_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lot_contenants_select ON public.lot_contenants FOR SELECT USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: lot_contenants lot_contenants_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lot_contenants_update ON public.lot_contenants FOR UPDATE USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: lot_filiation; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lot_filiation ENABLE ROW LEVEL SECURITY;

--
-- Name: lot_filiation lot_filiation_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lot_filiation_delete ON public.lot_filiation FOR DELETE USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: lot_filiation lot_filiation_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lot_filiation_insert ON public.lot_filiation FOR INSERT WITH CHECK ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: lot_filiation lot_filiation_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lot_filiation_select ON public.lot_filiation FOR SELECT USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: lot_filiation lot_filiation_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lot_filiation_update ON public.lot_filiation FOR UPDATE USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: lot_mouvements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lot_mouvements ENABLE ROW LEVEL SECURITY;

--
-- Name: lots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;

--
-- Name: lots lots_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lots_delete ON public.lots FOR DELETE USING (public.is_privileged_in(tenant_id));


--
-- Name: lots lots_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lots_insert ON public.lots FOR INSERT WITH CHECK ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: lots lots_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lots_select ON public.lots FOR SELECT USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: lots lots_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lots_update ON public.lots FOR UPDATE USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: memberships; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

--
-- Name: memberships memberships_delete_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY memberships_delete_admin ON public.memberships FOR DELETE USING (public.is_privileged_in(tenant_id));


--
-- Name: memberships memberships_insert_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY memberships_insert_admin ON public.memberships FOR INSERT WITH CHECK (public.is_privileged_in(tenant_id));


--
-- Name: memberships memberships_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY memberships_select_admin ON public.memberships FOR SELECT USING (public.is_privileged_in(tenant_id));


--
-- Name: memberships memberships_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY memberships_select_own ON public.memberships FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: memberships memberships_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY memberships_update_admin ON public.memberships FOR UPDATE USING (public.is_privileged_in(tenant_id));


--
-- Name: operation_contenants op_cont_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY op_cont_delete ON public.operation_contenants FOR DELETE USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: operation_contenants op_cont_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY op_cont_insert ON public.operation_contenants FOR INSERT WITH CHECK ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: operation_contenants op_cont_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY op_cont_select ON public.operation_contenants FOR SELECT USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: operation_contenants op_cont_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY op_cont_update ON public.operation_contenants FOR UPDATE USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: operation_lots op_lots_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY op_lots_delete ON public.operation_lots FOR DELETE USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: operation_lots op_lots_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY op_lots_insert ON public.operation_lots FOR INSERT WITH CHECK ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: operation_lots op_lots_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY op_lots_select ON public.operation_lots FOR SELECT USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: operation_lots op_lots_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY op_lots_update ON public.operation_lots FOR UPDATE USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: operation_produits op_produits_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY op_produits_delete ON public.operation_produits FOR DELETE USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: operation_produits op_produits_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY op_produits_insert ON public.operation_produits FOR INSERT WITH CHECK ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: operation_produits op_produits_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY op_produits_select ON public.operation_produits FOR SELECT USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: operation_produits op_produits_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY op_produits_update ON public.operation_produits FOR UPDATE USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: operation_contenants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.operation_contenants ENABLE ROW LEVEL SECURITY;

--
-- Name: operation_lots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.operation_lots ENABLE ROW LEVEL SECURITY;

--
-- Name: operation_produits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.operation_produits ENABLE ROW LEVEL SECURITY;

--
-- Name: operations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;

--
-- Name: operations operations_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY operations_delete ON public.operations FOR DELETE USING (public.is_privileged_in(tenant_id));


--
-- Name: operations operations_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY operations_insert ON public.operations FOR INSERT WITH CHECK ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: operations operations_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY operations_select ON public.operations FOR SELECT USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: operations operations_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY operations_update ON public.operations FOR UPDATE USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: produits_catalogue produits_cat_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY produits_cat_delete ON public.produits_catalogue FOR DELETE USING (public.is_privileged_in(tenant_id));


--
-- Name: produits_catalogue produits_cat_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY produits_cat_insert ON public.produits_catalogue FOR INSERT WITH CHECK ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: produits_catalogue produits_cat_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY produits_cat_select ON public.produits_catalogue FOR SELECT USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: produits_catalogue produits_cat_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY produits_cat_update ON public.produits_catalogue FOR UPDATE USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: produits_catalogue; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.produits_catalogue ENABLE ROW LEVEL SECURITY;

--
-- Name: produits_lots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.produits_lots ENABLE ROW LEVEL SECURITY;

--
-- Name: produits_lots produits_lots_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY produits_lots_delete ON public.produits_lots FOR DELETE USING (public.is_privileged_in(tenant_id));


--
-- Name: produits_lots produits_lots_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY produits_lots_insert ON public.produits_lots FOR INSERT WITH CHECK ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: produits_lots produits_lots_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY produits_lots_select ON public.produits_lots FOR SELECT USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: produits_lots produits_lots_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY produits_lots_update ON public.produits_lots FOR UPDATE USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: tenants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

--
-- Name: tenants tenants_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenants_select ON public.tenants FOR SELECT USING ((id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: travees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.travees ENABLE ROW LEVEL SECURITY;

--
-- Name: travees travees_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY travees_delete ON public.travees FOR DELETE USING (public.is_privileged_in(tenant_id));


--
-- Name: travees travees_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY travees_insert ON public.travees FOR INSERT WITH CHECK ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: travees travees_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY travees_select ON public.travees FOR SELECT USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: travees travees_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY travees_update ON public.travees FOR UPDATE USING ((tenant_id IN ( SELECT public.user_tenants() AS user_tenants)));


--
-- Name: user_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: user_preferences user_prefs_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_prefs_delete ON public.user_preferences FOR DELETE USING (((user_id = auth.uid()) AND (tenant_id IN ( SELECT public.user_tenants() AS user_tenants))));


--
-- Name: user_preferences user_prefs_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_prefs_insert ON public.user_preferences FOR INSERT WITH CHECK (((user_id = auth.uid()) AND (tenant_id IN ( SELECT public.user_tenants() AS user_tenants))));


--
-- Name: user_preferences user_prefs_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_prefs_select ON public.user_preferences FOR SELECT USING (((user_id = auth.uid()) AND (tenant_id IN ( SELECT public.user_tenants() AS user_tenants))));


--
-- Name: user_preferences user_prefs_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_prefs_update ON public.user_preferences FOR UPDATE USING (((user_id = auth.uid()) AND (tenant_id IN ( SELECT public.user_tenants() AS user_tenants))));


--
-- PostgreSQL database dump complete
--

-- [WB3] ligne psql \unrestrict retirée (incompatible SQL Editor Supabase).

-- ============================================================
-- [WB3] Realtime — publication supabase_realtime
-- ------------------------------------------------------------
-- pg_dump --schema=public NE dumpe PAS la publication globale
-- supabase_realtime ni ses ALTER ... ADD TABLE. On reconstitue ici
-- l'appartenance des tables WB3 au realtime, à l'identique des
-- migrations 001/004/005/006/007c/008/014/046 (liste factuelle
-- extraite par grep des migrations, non devinée). Idempotent.
-- REPLICA IDENTITY FULL est, lui, déjà dans le corps du dump.
-- ============================================================
DO $wb3_realtime$
DECLARE
  t text;
  wb3_rt_tables text[] := ARRAY[
    'analyses','apports','cepages','contenants','fiches_travail',
    'lot_cepages','lot_contenants','lot_filiation','lot_mouvements',
    'lots','operation_contenants','operation_lots','operation_produits',
    'operations','produits_catalogue','produits_lots','travees',
    'user_preferences'
  ];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  FOREACH t IN ARRAY wb3_rt_tables LOOP
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
               WHERE n.nspname='public' AND c.relname=t)
       AND NOT EXISTS (SELECT 1 FROM pg_publication_tables
               WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t)
    THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END
$wb3_realtime$;

NOTIFY pgrst, 'reload schema';
-- ============================================================
-- FIN baseline WB3. Valider via sql/tests/DIFF_baseline.md.
-- ============================================================

