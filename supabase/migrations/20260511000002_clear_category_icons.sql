-- Clear category icons. Category buttons now display text only;
-- the icon column is no longer read by the application.
UPDATE categories SET icon = NULL;
