BEGIN;

INSERT INTO leagues (league_id, league_name, volume_label, description)
VALUES
('auto', 'Auto', 'Repairs', 'Auto repair operator standings'),
('re', 'Real estate', 'Closings', 'Real estate operator standings')
ON CONFLICT DO NOTHING;

COMMIT;