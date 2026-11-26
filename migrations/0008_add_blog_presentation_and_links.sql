PRAGMA foreign_keys = ON;

CREATE TABLE blog_short_links (
  short_id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id TEXT NOT NULL UNIQUE REFERENCES blog_posts(id) ON DELETE CASCADE
);

INSERT INTO blog_short_links(post_id) SELECT id FROM blog_posts ORDER BY created_at,id;

CREATE TRIGGER assign_blog_short_link AFTER INSERT ON blog_posts
BEGIN INSERT INTO blog_short_links(post_id) VALUES (NEW.id); END;

ALTER TABLE blog_revisions ADD COLUMN cover_image_id TEXT REFERENCES blog_images(id);
ALTER TABLE blog_revisions ADD COLUMN hero_image_id TEXT REFERENCES blog_images(id);
