BEGIN;

ALTER TABLE mqs.groups
  ADD COLUMN IF NOT EXISTS color_code text NOT NULL DEFAULT 'rose';

ALTER TABLE mqs.groups
  DROP CONSTRAINT IF EXISTS groups_color_code_check;

ALTER TABLE mqs.groups
  ADD CONSTRAINT groups_color_code_check
  CHECK (color_code IN (
    'rose',
    'sky',
    'lime',
    'indigo',
    'violet',
    'teal',
    'orange',
    'cyan'
  ) OR color_code ~ '^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?,#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$');

WITH ranked_groups AS (
  SELECT
    id,
    ((row_number() OVER (ORDER BY id) - 1) % 8) + 1 AS color_index
  FROM mqs.groups
  WHERE deleted_at IS NULL
),
group_colors(color_index, color_code) AS (
  VALUES
    (1, 'rose'),
    (2, 'sky'),
    (3, 'lime'),
    (4, 'indigo'),
    (5, 'violet'),
    (6, 'teal'),
    (7, 'orange'),
    (8, 'cyan')
)
UPDATE mqs.groups groups
SET color_code = group_colors.color_code
FROM ranked_groups
JOIN group_colors
  ON group_colors.color_index = ranked_groups.color_index
WHERE groups.id = ranked_groups.id;

COMMIT;
