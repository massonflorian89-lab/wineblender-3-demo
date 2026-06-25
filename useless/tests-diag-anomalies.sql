-- =============================================================
-- WB3 — Jeux de tests pour le module Qualité & Traçabilité
-- =============================================================
-- Ces instructions SQL permettent de simuler chaque type d'anomalie
-- afin de vérifier que l'écran qualite-traca.html les détecte correctement.
--
-- ⚠️  À exécuter UNIQUEMENT sur un tenant de test dédié.
--      Remplacer <TENANT_ID> et les UUIDs par vos valeurs réelles.
--      Passer par l'éditeur SQL de Supabase (dashboard > SQL Editor).
-- =============================================================

-- 0. Préambule : identifier votre tenant de test
-- SELECT id, nom FROM tenants WHERE nom ILIKE '%test%';
-- Puis : SET LOCAL wb3.tenant_id = '<TENANT_ID>';


-- ─────────────────────────────────────────────────────────────
-- CHECK 1 : Volume lot négatif
-- ─────────────────────────────────────────────────────────────
-- Crée un lot avec un volume négatif. Attendu : alerte CRITIQUE "Volumes".

INSERT INTO lots (id, tenant_id, nom, couleur, millesime, statut, volume_actuel_hl, created_at)
VALUES (
  gen_random_uuid(), '<TENANT_ID>',
  'TEST — Lot volume négatif', 'rouge', 2023, 'vin', -12.50,
  now()
);

-- Nettoyage après test :
-- DELETE FROM lots WHERE nom = 'TEST — Lot volume négatif' AND tenant_id = '<TENANT_ID>';


-- ─────────────────────────────────────────────────────────────
-- CHECK 2 : Volume lot incohérent avec sum(lot_contenants)
-- ─────────────────────────────────────────────────────────────
-- Lot déclaré à 50 hL mais seulement 20 hL en cuve. Écart = 30 hL → CRITIQUE.

DO $$
DECLARE
  v_lot_id UUID := gen_random_uuid();
  v_cont_id UUID;
BEGIN
  -- Récupérer une cuve existante du tenant
  SELECT id INTO v_cont_id FROM contenants WHERE tenant_id = '<TENANT_ID>' LIMIT 1;

  INSERT INTO lots (id, tenant_id, nom, couleur, statut, volume_actuel_hl, created_at)
  VALUES (v_lot_id, '<TENANT_ID>', 'TEST — Volume incohérent', 'blanc', 'elevage', 50.00, now());

  INSERT INTO lot_contenants (lot_id, contenant_id, tenant_id, volume_hl)
  VALUES (v_lot_id, v_cont_id, '<TENANT_ID>', 20.00);
END $$;

-- Nettoyage :
-- DELETE FROM lot_contenants WHERE lot_id IN (SELECT id FROM lots WHERE nom = 'TEST — Volume incohérent');
-- DELETE FROM lots WHERE nom = 'TEST — Volume incohérent';


-- ─────────────────────────────────────────────────────────────
-- CHECK 3 : Cuve dépassant sa capacité
-- ─────────────────────────────────────────────────────────────
-- Cuve de 100 hL avec 130 hL stockés → CRITIQUE.

DO $$
DECLARE
  v_lot_id  UUID := gen_random_uuid();
  v_cont_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO contenants (id, tenant_id, nom, type, capacite_hl, statut)
  VALUES (v_cont_id, '<TENANT_ID>', 'TEST — Cuve surpleine', 'cuve', 100.00, 'actif');

  INSERT INTO lots (id, tenant_id, nom, couleur, statut, volume_actuel_hl)
  VALUES (v_lot_id, '<TENANT_ID>', 'TEST — Lot cuve surpleine', 'rouge', 'vin', 130.00);

  INSERT INTO lot_contenants (lot_id, contenant_id, tenant_id, volume_hl)
  VALUES (v_lot_id, v_cont_id, '<TENANT_ID>', 130.00);
END $$;

-- Nettoyage :
-- DELETE FROM lot_contenants WHERE contenant_id IN (SELECT id FROM contenants WHERE nom = 'TEST — Cuve surpleine');
-- DELETE FROM lots WHERE nom = 'TEST — Lot cuve surpleine';
-- DELETE FROM contenants WHERE nom = 'TEST — Cuve surpleine';


-- ─────────────────────────────────────────────────────────────
-- CHECK 4 : Mouvement sans opération liée
-- ─────────────────────────────────────────────────────────────
-- lot_mouvement avec operation_id NULL → À VÉRIFIER.

DO $$
DECLARE
  v_lot_id  UUID;
  v_cont_id UUID;
BEGIN
  SELECT id INTO v_lot_id  FROM lots       WHERE tenant_id = '<TENANT_ID>' LIMIT 1;
  SELECT id INTO v_cont_id FROM contenants WHERE tenant_id = '<TENANT_ID>' LIMIT 1;

  INSERT INTO lot_mouvements (id, tenant_id, operation_id, type_operation, lot_id,
    contenant_source_id, volume_hl, date_mouvement, sens)
  VALUES (
    gen_random_uuid(), '<TENANT_ID>',
    NULL,                    -- ← pas d'opération liée
    'soutirage', v_lot_id, v_cont_id, 15.00, current_date, 'sortie'
  );
END $$;

-- Nettoyage :
-- DELETE FROM lot_mouvements WHERE tenant_id = '<TENANT_ID>' AND operation_id IS NULL;


-- ─────────────────────────────────────────────────────────────
-- CHECK 5 : Opération brouillon dans le passé
-- ─────────────────────────────────────────────────────────────
-- Opération planifiée il y a 10 jours, jamais validée → À VÉRIFIER.

INSERT INTO operations (id, tenant_id, type_operation, date_operation, statut, reference)
VALUES (
  gen_random_uuid(), '<TENANT_ID>',
  'sulfitage',
  (current_date - interval '10 days')::date,
  'brouillon',
  'TEST-PLANIFIE-PASSE'
);

-- Nettoyage :
-- DELETE FROM operations WHERE tenant_id = '<TENANT_ID>' AND reference = 'TEST-PLANIFIE-PASSE';


-- ─────────────────────────────────────────────────────────────
-- CHECK 6 : Analyse orpheline (ni lot ni contenant)
-- ─────────────────────────────────────────────────────────────

INSERT INTO analyses (id, tenant_id, lot_id, contenant_id, date_analyse, type_analyse, ph, tav)
VALUES (
  gen_random_uuid(), '<TENANT_ID>',
  NULL,          -- ← pas de lot
  NULL,          -- ← pas de contenant
  current_date, 'physico-chimique', 3.45, 12.5
);

-- Nettoyage :
-- DELETE FROM analyses WHERE tenant_id = '<TENANT_ID>' AND lot_id IS NULL AND contenant_id IS NULL;


-- ─────────────────────────────────────────────────────────────
-- CHECK 7 : Valeur analytique extrême
-- ─────────────────────────────────────────────────────────────
-- pH = 1.9 (< 2.8) et AV = 2.1 g/L (> 1.5) → CRITIQUE.

DO $$
DECLARE v_lot_id UUID;
BEGIN
  SELECT id INTO v_lot_id FROM lots WHERE tenant_id = '<TENANT_ID>' LIMIT 1;
  INSERT INTO analyses (id, tenant_id, lot_id, date_analyse, type_analyse, ph, acidite_volatile, tav)
  VALUES (gen_random_uuid(), '<TENANT_ID>', v_lot_id, current_date, 'physico-chimique', 1.90, 2.10, 12.5);
END $$;

-- Nettoyage :
-- DELETE FROM analyses WHERE tenant_id = '<TENANT_ID>' AND ph = 1.90 AND acidite_volatile = 2.10;


-- ─────────────────────────────────────────────────────────────
-- CHECK 8 : Lot à stade avancé sans origine
-- ─────────────────────────────────────────────────────────────
-- Lot en élevage, aucun apport ni filiation → À VÉRIFIER.

INSERT INTO lots (id, tenant_id, nom, couleur, millesime, statut, volume_actuel_hl)
VALUES (
  gen_random_uuid(), '<TENANT_ID>',
  'TEST — Lot sans origine', 'rouge', 2023, 'elevage', 40.00
);
-- Pas d'apport inséré → sera détecté.

-- Nettoyage :
-- DELETE FROM lots WHERE tenant_id = '<TENANT_ID>' AND nom = 'TEST — Lot sans origine';


-- ─────────────────────────────────────────────────────────────
-- CHECK 9 : Opération annulée avec mouvements résiduels
-- ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_op_id   UUID := gen_random_uuid();
  v_lot_id  UUID;
  v_cont_id UUID;
BEGIN
  SELECT id INTO v_lot_id  FROM lots       WHERE tenant_id = '<TENANT_ID>' LIMIT 1;
  SELECT id INTO v_cont_id FROM contenants WHERE tenant_id = '<TENANT_ID>' LIMIT 1;

  INSERT INTO operations (id, tenant_id, type_operation, date_operation, statut, reference)
  VALUES (v_op_id, '<TENANT_ID>', 'soutirage', current_date, 'annule', 'TEST-ANNULE-RESIDUEL');

  -- Le mouvement persiste malgré l'annulation
  INSERT INTO lot_mouvements (id, tenant_id, operation_id, type_operation, lot_id,
    contenant_source_id, volume_hl, date_mouvement, sens)
  VALUES (gen_random_uuid(), '<TENANT_ID>', v_op_id, 'soutirage',
    v_lot_id, v_cont_id, 20.00, current_date, 'sortie');
END $$;

-- Nettoyage :
-- DELETE FROM lot_mouvements WHERE tenant_id = '<TENANT_ID>' AND operation_id IN
--   (SELECT id FROM operations WHERE reference = 'TEST-ANNULE-RESIDUEL');
-- DELETE FROM operations WHERE tenant_id = '<TENANT_ID>' AND reference = 'TEST-ANNULE-RESIDUEL';


-- ─────────────────────────────────────────────────────────────
-- CHECK 10 : Opération réalisée sans mouvement physique
-- ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_op_id  UUID := gen_random_uuid();
  v_lot_id UUID;
BEGIN
  SELECT id INTO v_lot_id FROM lots WHERE tenant_id = '<TENANT_ID>' LIMIT 1;

  INSERT INTO operations (id, tenant_id, type_operation, date_operation, statut, reference)
  VALUES (v_op_id, '<TENANT_ID>', 'assemblage', current_date, 'realise', 'TEST-SANS-MOUVEMENT');

  INSERT INTO op_lots (operation_id, lot_id, tenant_id, role, volume_hl)
  VALUES (v_op_id, v_lot_id, '<TENANT_ID>', 'source', 30.00);
  -- Pas de lot_mouvement inséré → sera détecté.
END $$;

-- Nettoyage :
-- DELETE FROM op_lots WHERE operation_id IN (SELECT id FROM operations WHERE reference = 'TEST-SANS-MOUVEMENT');
-- DELETE FROM operations WHERE tenant_id = '<TENANT_ID>' AND reference = 'TEST-SANS-MOUVEMENT';


-- ─────────────────────────────────────────────────────────────
-- NETTOYAGE GLOBAL (toutes les anomalies de test)
-- ─────────────────────────────────────────────────────────────
-- À exécuter après validation pour supprimer toutes les données de test :

/*
DELETE FROM analyses       WHERE tenant_id = '<TENANT_ID>' AND (lot_id IS NULL AND contenant_id IS NULL OR ph = 1.90);
DELETE FROM lot_mouvements WHERE tenant_id = '<TENANT_ID>' AND (operation_id IS NULL OR operation_id IN (SELECT id FROM operations WHERE reference LIKE 'TEST-%'));
DELETE FROM op_lots        WHERE tenant_id = '<TENANT_ID>' AND operation_id IN (SELECT id FROM operations WHERE reference LIKE 'TEST-%');
DELETE FROM lot_contenants WHERE tenant_id = '<TENANT_ID>' AND lot_id IN (SELECT id FROM lots WHERE nom LIKE 'TEST —%');
DELETE FROM operations     WHERE tenant_id = '<TENANT_ID>' AND reference LIKE 'TEST-%';
DELETE FROM lots           WHERE tenant_id = '<TENANT_ID>' AND nom LIKE 'TEST —%';
DELETE FROM contenants     WHERE tenant_id = '<TENANT_ID>' AND nom LIKE 'TEST —%';
*/
